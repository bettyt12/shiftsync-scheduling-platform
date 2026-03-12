import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { ApiError } from "../lib/errors";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { assertManagerHasLocationAccess } from "../services/access";
import { createAuditLog } from "../services/audit";
import { createNotification, broadcastScheduleUpdate } from "../services/notifications";
import { addHours, isBefore } from "date-fns";

export const shiftsRouter = Router();

shiftsRouter.use(requireAuth);

const ListShiftsQuery = z.object({
  locationId: z.string().min(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

shiftsRouter.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const q = ListShiftsQuery.parse(req.query);
    if (req.auth!.role !== "ADMIN") {
      const link = await prisma.userLocation.findUnique({
        where: { userId_locationId: { userId: req.auth!.userId, locationId: q.locationId } },
      });
      if (!link) {
        throw new ApiError({ status: 403, code: "FORBIDDEN", message: "You do not have access to this location" });
      }
    }

    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;

    const where: NonNullable<NonNullable<Parameters<typeof prisma.shift.findMany>[0]>["where"]> = { locationId: q.locationId };
    if (from) where.startTimeUtc = { gte: from };
    if (to) where.endTimeUtc = { lte: to };

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { startTimeUtc: "asc" },
      include: {
        requiredSkill: true,
        assignments: {
          where: { status: "ASSIGNED" },
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    res.json({ shifts });
  } catch (err) {
    next(err);
  }
});

const CreateShiftBody = z.object({
  locationId: z.string().min(1),
  requiredSkillId: z.string().min(1),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  headcount: z.number().int().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
});

// Middleware for modification routes
const requireEditPerms = requireRole(["ADMIN", "MANAGER"]);

shiftsRouter.post("/", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const body = CreateShiftBody.parse(req.body);
    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId: body.locationId });
    }

    const start = new Date(body.startTimeUtc);
    const end = new Date(body.endTimeUtc);
    if (!(start < end)) {
      throw new ApiError({ status: 400, code: "VALIDATION_ERROR", message: "startTimeUtc must be before endTimeUtc" });
    }

    const shift = await prisma.shift.create({
      data: {
        locationId: body.locationId,
        requiredSkillId: body.requiredSkillId,
        startTimeUtc: start,
        endTimeUtc: end,
        headcount: body.headcount,
        status: body.status ?? "DRAFT",
      },
      include: { requiredSkill: true },
    });

    await createAuditLog({
      actorUserId: req.auth!.userId,
      entityType: "Shift",
      entityId: shift.id,
      action: "CREATE",
      after: shift,
    });

    broadcastScheduleUpdate(body.locationId);

    res.status(201).json({ shift });
  } catch (err) {
    next(err);
  }
});

const PatchShiftBody = z
  .object({
    requiredSkillId: z.string().min(1).optional(),
    startTimeUtc: z.string().datetime().optional(),
    endTimeUtc: z.string().datetime().optional(),
    headcount: z.number().int().min(1).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields provided" });

shiftsRouter.patch("/:id", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = PatchShiftBody.parse(req.body);

    const existing = await prisma.shift.findUnique({ where: { id }, select: { id: true, locationId: true } });
    if (!existing) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Shift not found" });

    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId: existing.locationId });
    }

    const start = body.startTimeUtc ? new Date(body.startTimeUtc) : undefined;
    const end = body.endTimeUtc ? new Date(body.endTimeUtc) : undefined;

    // Enforcement: 48 hour cutoff for published shifts
    const existingFull = await prisma.shift.findUnique({ where: { id }, select: { startTimeUtc: true, status: true } });
    if (existingFull?.status === "PUBLISHED") {
      const cutoff = addHours(new Date(), 48);
      if (isBefore(existingFull.startTimeUtc, cutoff)) {
        throw new ApiError({ status: 403, code: "FORBIDDEN", message: "Cannot edit a published shift within 48 hours of its start time." });
      }
    }

    if (start && end && !(start < end)) {
      throw new ApiError({ status: 400, code: "VALIDATION_ERROR", message: "startTimeUtc must be before endTimeUtc" });
    }

    const data: Parameters<typeof prisma.shift.update>[0]["data"] = {};
    let criticalChange = false;

    if (body.requiredSkillId) { data.requiredSkill = { connect: { id: body.requiredSkillId } }; criticalChange = true; }
    if (typeof body.headcount === "number") data.headcount = body.headcount;
    if (body.status) data.status = body.status;
    if (start) { data.startTimeUtc = start; criticalChange = true; }
    if (end) { data.endTimeUtc = end; criticalChange = true; }

    const shift = await prisma.shift.update({
      where: { id },
      data,
      include: { requiredSkill: true },
    });

    // If critical details change, cancel pending coverage requests
    if (criticalChange) {
      const pendingRequests = await prisma.coverageRequest.findMany({
        where: { shiftId: id, status: { in: ["PENDING", "ACCEPTED_BY_PEER", "PENDING_MANAGER"] } },
        select: { id: true, fromUserId: true }
      });

      if (pendingRequests.length > 0) {
        await prisma.coverageRequest.updateMany({
          where: { id: { in: pendingRequests.map(r => r.id) } },
          data: { status: "CANCELLED" }
        });

        const { createNotification } = await import("../services/notifications");
        for (const req of pendingRequests) {
          await createNotification({
            userId: req.fromUserId,
            type: "COVERAGE_CANCELLED",
            payload: { message: "Your coverage request was cancelled because the underlying shift was modified by a manager." }
          });
        }
      }
    }

    await createAuditLog({
      actorUserId: req.auth!.userId,
      entityType: "Shift",
      entityId: shift.id,
      action: "UPDATE",
      before: existing,
      after: shift,
    });

    broadcastScheduleUpdate(shift.locationId);

    res.json({ shift });
  } catch (err) {
    next(err);
  }
});

const AssignBody = z.object({
  userId: z.string().min(1),
  force: z.boolean().optional(),
});

shiftsRouter.post("/:id/assign", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { id: shiftId } = z.object({ id: z.string().min(1) }).parse(req.params);
    const { userId, force } = AssignBody.parse(req.body);

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { location: true },
    });
    if (!shift) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Shift not found" });

    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId: shift.locationId });
    }

    const { checkShiftConstraints } = await import("../services/scheduling");
    const result = await checkShiftConstraints({ userId, shiftId });

    if (!result.ok && !force) {
      return res.status(409).json({
        code: "CONSTRAINT_VIOLATION",
        message: "Assignment violates one or more scheduling constraints.",
        ...result,
      });
    }

    const assignment = await prisma.shiftAssignment.upsert({
      where: { shiftId_userId: { shiftId, userId } },
      update: { status: "ASSIGNED" },
      create: { shiftId, userId, status: "ASSIGNED" },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.auth!.userId,
        entityType: "ShiftAssignment",
        entityId: assignment.id,
        action: "ASSIGN",
        after: { shiftId, userId, force: force ?? null },
        reason: force ? "Manager override" : null,
      },
    });

    broadcastScheduleUpdate(shift.locationId);

    res.status(201).json({ assignment, warnings: result.warnings });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.post("/:id/unassign", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const body = AssignBody.parse(req.body);

    const shift = await prisma.shift.findUnique({ where: { id }, select: { id: true, locationId: true } });
    if (!shift) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Shift not found" });

    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId: shift.locationId });
    }

    const assignment = await prisma.shiftAssignment.update({
      where: { shiftId_userId: { shiftId: shift.id, userId: body.userId } },
      data: { status: "CANCELLED" },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: req.auth!.userId,
        entityType: "ShiftAssignment",
        entityId: assignment.id,
        action: "UNASSIGN",
        after: { shiftId: shift.id, userId: body.userId },
      },
    });

    broadcastScheduleUpdate(shift.locationId);

    res.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return res.status(404).json({ code: "NOT_FOUND", message: "Assignment not found" });
    }
    next(err);
  }
});

const PublishBody = z.object({
  locationId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
});

shiftsRouter.post("/bulk-publish", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { locationId, from, to } = PublishBody.parse(req.body);
    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId });
    }

    const result = await prisma.shift.updateMany({
      where: {
        locationId,
        startTimeUtc: { gte: new Date(from), lte: new Date(to) },
        status: "DRAFT",
      },
      data: { status: "PUBLISHED" },
    });

    // Notify staff certified at this location
    const staff = await prisma.userLocation.findMany({
      where: { locationId, isManager: false },
      select: { userId: true },
    });

    for (const s of staff) {
      await createNotification({
        userId: s.userId,
        type: "SCHEDULE_PUBLISHED",
        payload: { locationId, message: "A new schedule has been published for your location." },
      });
    }

    await createAuditLog({
      actorUserId: req.auth!.userId,
      entityType: "Location",
      entityId: locationId,
      action: "BULK_PUBLISH",
      after: { from, to, count: result.count },
    });

    broadcastScheduleUpdate(locationId);

    res.json({ publishedCount: result.count });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.post("/:id/clock-in", async (req: AuthedRequest, res, next) => {
  try {
    const { id: shiftId } = z.object({ id: z.string() }).parse(req.params);
    const userId = req.auth!.userId;

    const assignment = await prisma.shiftAssignment.update({
      where: { shiftId_userId: { shiftId, userId } },
      data: { clockInTimeUtc: new Date() },
    });

    res.json({ assignment });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.post("/:id/clock-out", async (req: AuthedRequest, res, next) => {
  try {
    const { id: shiftId } = z.object({ id: z.string() }).parse(req.params);
    const userId = req.auth!.userId;

    const assignment = await prisma.shiftAssignment.update({
      where: { shiftId_userId: { shiftId, userId } },
      data: { clockOutTimeUtc: new Date() },
    });

    res.json({ assignment });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.delete("/:id", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { id } = z.object({ id: z.string().min(1) }).parse(req.params);
    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Shift not found" });

    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId: existing.locationId });
    }

    await prisma.shift.delete({ where: { id } });

    await createAuditLog({
      actorUserId: req.auth!.userId,
      entityType: "Shift",
      entityId: id,
      action: "DELETE",
      before: existing,
    });

    broadcastScheduleUpdate(existing.locationId);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.get("/:id/eligible-staff", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { id: shiftId } = z.object({ id: z.string().min(1) }).parse(req.params);
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { location: true },
    });

    if (!shift) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Shift not found" });

    // 1. Find all users certified at this location
    const locationUsers = await prisma.userLocation.findMany({
      where: { locationId: shift.locationId },
      include: { user: { include: { skills: true } } }
    });

    const candidateUsers = locationUsers.map(ls => ls.user);
    const { checkShiftConstraints } = await import("../services/scheduling");

    const results = await Promise.all(candidateUsers.map(async (user) => {
      const constraintResult = await checkShiftConstraints({ userId: user.id, shiftId });
      return {
        user: { id: user.id, name: user.name, email: user.email },
        eligible: constraintResult.ok,
        warnings: constraintResult.warnings,
        hasRequiredSkill: user.skills.some(s => s.skillId === shift.requiredSkillId)
      };
    }));

    res.json({ staff: results });
  } catch (err) {
    next(err);
  }
});

shiftsRouter.get("/on-duty", requireEditPerms, async (req: AuthedRequest, res, next) => {
  try {
    const { locationId } = z.object({ locationId: z.string().min(1) }).parse(req.query);
    if (req.auth!.role === "MANAGER") {
      await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId });
    }

    const now = new Date();
    const onDuty = await prisma.shiftAssignment.findMany({
      where: {
        shift: { locationId, startTimeUtc: { lte: now }, endTimeUtc: { gte: now } },
        status: "ASSIGNED",
        clockInTimeUtc: { not: null },
        clockOutTimeUtc: null,
      },
      include: { user: { select: { id: true, name: true, email: true } }, shift: true },
    });

    res.json({ onDuty });
  } catch (err) {
    next(err);
  }
});

