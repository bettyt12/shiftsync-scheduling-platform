import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { startOfWeek, endOfWeek, differenceInHours } from "date-fns";
import { assertManagerHasLocationAccess } from "../services/access";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth, requireRole(["ADMIN", "MANAGER"]));

const SummaryQuery = z.object({
    locationId: z.string().min(1),
    weekOffset: z.string().optional().transform(v => parseInt(v || "0", 10)),
});

analyticsRouter.get("/fairness", async (req: AuthedRequest, res, next) => {
    try {
        const { locationId } = SummaryQuery.parse(req.query);
        if (req.auth!.role === "MANAGER") {
            await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId });
        }

        // 1. Get all staff certified for this location
        const staffAtLocation = await prisma.userLocation.findMany({
            where: { locationId, isManager: false },
            include: { user: { include: { assignments: { include: { shift: true } } } } },
        });

        // 2. Calculate metrics
        const report = staffAtLocation.map((sl) => {
            const u = sl.user;
            const totalHours = u.assignments
                .filter(a => a.status === "ASSIGNED")
                .reduce((sum, a) => sum + differenceInHours(a.shift.endTimeUtc, a.shift.startTimeUtc), 0);

            const premiumShifts = u.assignments
                .filter(a => {
                    if (a.status !== "ASSIGNED") return false;
                    const dow = a.shift.startTimeUtc.getUTCDay();
                    // Friday (5) or Saturday (6)
                    return dow === 5 || dow === 6;
                }).length;

            return {
                userId: u.id,
                name: u.name,
                email: u.email,
                totalHours,
                desiredHours: u.desiredHoursPerWeek ?? 0,
                premiumShifts,
                fairnessScore: u.desiredHoursPerWeek ? (totalHours / u.desiredHoursPerWeek) * 100 : 0,
            };
        });

        res.json({ report });
    } catch (err) {
        next(err);
    }
});

analyticsRouter.get("/overtime", async (req: AuthedRequest, res, next) => {
    try {
        const { locationId } = SummaryQuery.parse(req.query);
        if (req.auth!.role === "MANAGER") {
            await assertManagerHasLocationAccess({ managerUserId: req.auth!.userId, locationId });
        }

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

        const shifts = await prisma.shift.findMany({
            where: { locationId, startTimeUtc: { gte: weekStart, lte: weekEnd } },
            include: { assignments: { include: { user: true } } },
        });

        // Calculate projected overtime
        const userHours: Record<string, { name: string; hours: number }> = {};
        for (const shift of shifts) {
            const duration = differenceInHours(shift.endTimeUtc, shift.startTimeUtc);
            for (const assignment of shift.assignments) {
                if (assignment.status !== "ASSIGNED") continue;
                const u = assignment.user;
                if (!userHours[u.id]) userHours[u.id] = { name: u.name, hours: 0 };
                userHours[u.id]!.hours += duration;
            }
        }

        const overtimeStaff = Object.entries(userHours)
            .filter(([_, data]) => data.hours > 40)
            .map(([userId, data]) => ({ userId, ...data }));

        res.json({ overtimeStaff, totalWeeklyHours: userHours });
    } catch (err) {
        next(err);
    }
});
