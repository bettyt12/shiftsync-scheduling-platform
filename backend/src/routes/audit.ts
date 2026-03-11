import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

export const auditRouter = Router();

// Only Admins can export audit logs
auditRouter.use(requireAuth, requireRole(["ADMIN"]));

const ExportQuery = z.object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    entityType: z.string().optional(),
});

auditRouter.get("/export", async (req: AuthedRequest, res, next) => {
    try {
        const q = ExportQuery.parse(req.query);
        const where: any = {};

        if (q.from || q.to) {
            where.createdAt = {};
            if (q.from) where.createdAt.gte = new Date(q.from);
            if (q.to) where.createdAt.lte = new Date(q.to);
        }
        if (q.entityType) {
            where.entityType = q.entityType;
        }

        const logs = await prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { actor: { select: { id: true, name: true, email: true } } },
        });

        res.json({ logs });
    } catch (err) {
        next(err);
    }
});
