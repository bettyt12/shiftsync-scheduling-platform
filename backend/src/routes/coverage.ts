import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { ApiError } from "../lib/errors";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { createNotification, notifyManagers } from "../services/notifications";
import { addHours, isBefore } from "date-fns";

export const coverageRouter = Router();

coverageRouter.use(requireAuth);

const CreateRequestSchema = z.object({
    shiftId: z.string().min(1),
    type: z.enum(["SWAP", "DROP"]),
    toUserId: z.string().optional(), // Specific for SWAP
});

coverageRouter.post("/requests", async (req: AuthedRequest, res, next) => {
    try {
        const body = CreateRequestSchema.parse(req.body);
        const userId = req.auth!.userId;

        // 1. Validate Shift exists and belongs to user
        const assignment = await prisma.shiftAssignment.findUnique({
            where: { shiftId_userId: { shiftId: body.shiftId, userId } },
            include: { shift: { include: { location: true } } },
        });

        if (!assignment || assignment.status !== "ASSIGNED") {
            throw new ApiError({ status: 400, code: "BAD_REQUEST", message: "You are not assigned to this shift." });
        }

        // 2. Check pending requests limit (max 3)
        const pendingCount = await prisma.coverageRequest.count({
            where: { fromUserId: userId, status: { in: ["PENDING", "ACCEPTED_BY_PEER", "PENDING_MANAGER"] } },
        });

        if (pendingCount >= 3) {
            throw new ApiError({ status: 403, code: "LIMIT_EXCEEDED", message: "You cannot have more than 3 pending swap/drop requests." });
        }

        // 3. Check expiry (Drop requests expire 24h before shift)
        if (body.type === "DROP") {
            const cutoff = addHours(new Date(), 24);
            if (isBefore(assignment.shift.startTimeUtc, cutoff)) {
                throw new ApiError({ status: 400, code: "VALIDATION_ERROR", message: "Drop requests must be made at least 24 hours before the shift." });
            }
        }

        // 4. Create Request
        const request = await prisma.coverageRequest.create({
            data: {
                type: body.type,
                shiftId: body.shiftId,
                fromUserId: userId,
                toUserId: body.toUserId ?? null,
                status: "PENDING",
                expiresAtUtc: body.type === "DROP" ? addHours(assignment.shift.startTimeUtc, -24) : null,
            },
        });

        // 5. Notifications
        if (body.type === "SWAP" && body.toUserId) {
            await createNotification({
                userId: body.toUserId,
                type: "SWAP_REQUEST_RECEIVED",
                payload: { requestId: request.id, fromName: req.auth!.userId, shiftId: body.shiftId },
            });
        } else if (body.type === "DROP") {
            await notifyManagers({
                locationId: assignment.shift.locationId,
                type: "DROP_REQUEST_SUBMITTED",
                payload: { requestId: request.id, fromName: req.auth!.userId, shiftId: body.shiftId },
            });
        }

        res.status(201).json({ request });
    } catch (err) {
        next(err);
    }
});

coverageRouter.post("/requests/:id/accept", async (req: AuthedRequest, res, next) => {
    try {
        const { id } = z.object({ id: z.string() }).parse(req.params);
        const userId = req.auth!.userId;

        const request = await prisma.coverageRequest.findUnique({
            where: { id },
            include: { shift: true },
        });

        if (!request || request.status !== "PENDING") {
            throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Pending request not found." });
        }

        if (request.type === "SWAP" && request.toUserId && request.toUserId !== userId) {
            throw new ApiError({ status: 403, code: "FORBIDDEN", message: "This swap is not for you." });
        }

        // Check if the accepting user is qualified
        const { checkShiftConstraints } = await import("../services/scheduling");
        const result = await checkShiftConstraints({ userId, shiftId: request.shiftId });
        if (!result.ok) {
            throw new ApiError({ status: 400, code: "CONSTRAINT_VIOLATION", message: "You are not qualified or available for this shift.", details: result.violations });
        }

        const updated = await prisma.coverageRequest.update({
            where: { id },
            data: { status: "PENDING_MANAGER", claimedByUserId: userId },
        });

        // Notify original requester
        await createNotification({
            userId: request.fromUserId,
            type: "SWAP_ACCEPTED_BY_PEER",
            payload: { requestId: id, peerName: userId },
        });

        // Notify Managers
        await notifyManagers({
            locationId: request.shift.locationId,
            type: "COVERAGE_PENDING_APPROVAL",
            payload: { requestId: id, fromUserId: request.fromUserId, claimedByUserId: userId },
        });

        res.json({ request: updated });
    } catch (err) {
        next(err);
    }
});

coverageRouter.post("/requests/:id/approve", async (req: AuthedRequest, res, next) => {
    try {
        const { id } = z.object({ id: z.string() }).parse(req.params);
        const { reason } = z.object({ reason: z.string().optional() }).parse(req.body);

        if (req.auth!.role !== "MANAGER" && req.auth!.role !== "ADMIN") {
            throw new ApiError({ status: 403, code: "FORBIDDEN", message: "Only managers can approve requests." });
        }

        const request = await prisma.coverageRequest.findUnique({
            where: { id },
            include: { shift: true },
        });

        if (!request || request.status !== "PENDING_MANAGER") {
            throw new ApiError({ status: 400, code: "BAD_REQUEST", message: "Request is not in a manageable state." });
        }

        // Transaction to update assignment and request status
        const [_, __, finalRequest] = await prisma.$transaction([
            prisma.shiftAssignment.update({
                where: { shiftId_userId: { shiftId: request.shiftId, userId: request.fromUserId } },
                data: { status: "CANCELLED" },
            }),
            prisma.shiftAssignment.upsert({
                where: { shiftId_userId: { shiftId: request.shiftId, userId: request.claimedByUserId! } },
                update: { status: "ASSIGNED" },
                create: { shiftId: request.shiftId, userId: request.claimedByUserId!, status: "ASSIGNED" },
            }),
            prisma.coverageRequest.update({
                where: { id },
                data: { status: "APPROVED", managerOverrideReason: reason ?? null },
            }),
        ]);

        // Notify parties
        await createNotification({
            userId: request.fromUserId,
            type: "COVERAGE_APPROVED",
            payload: { requestId: id, shiftId: request.shiftId },
        });
        await createNotification({
            userId: request.claimedByUserId!,
            type: "COVERAGE_APPROVED",
            payload: { requestId: id, shiftId: request.shiftId },
        });

        res.json({ request: finalRequest });
    } catch (err) {
        next(err);
    }
});
