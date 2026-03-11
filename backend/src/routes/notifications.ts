import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req: AuthedRequest, res, next) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.auth!.userId },
            orderBy: { createdAt: "desc" },
        });
        res.json({ notifications });
    } catch (err) {
        next(err);
    }
});

notificationsRouter.post("/:id/read", async (req: AuthedRequest, res, next) => {
    try {
        const { id } = z.object({ id: z.string() }).parse(req.params);
        const notification = await prisma.notification.findUnique({ where: { id } });

        if (!notification || notification.userId !== req.auth!.userId) {
            return res.status(404).json({ code: "NOT_FOUND", message: "Notification not found" });
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { status: "READ", readAt: new Date() },
        });
        res.json({ notification: updated });
    } catch (err) {
        next(err);
    }
});
