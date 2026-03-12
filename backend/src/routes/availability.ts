// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth";
import { ApiError } from "../lib/errors";

export const availabilityRouter = Router();

availabilityRouter.use(requireAuth);

const RecurringSchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    startMinute: z.number().min(0).max(1439),
    endMinute: z.number().min(0).max(1439),
    timezone: z.string().min(1),
});

const ExceptionSchema = z.object({
    exceptionType: z.enum(["ADD_AVAILABLE", "REMOVE_AVAILABLE"]),
    startTimeUtc: z.string().datetime(),
    endTimeUtc: z.string().datetime(),
});

availabilityRouter.get("/", async (req: AuthedRequest, res, next) => {
    try {
        const userId = req.auth!.userId;
        const availability = await prisma.availability.findMany({
            where: { userId },
            orderBy: [
                { kind: "asc" },
                { dayOfWeek: "asc" },
                { startTimeUtc: "asc" }
            ]
        });
        res.json({ availability });
    } catch (err) {
        next(err);
    }
});

availabilityRouter.post("/recurring", async (req: AuthedRequest, res, next) => {
    try {
        const body = RecurringSchema.parse(req.body);
        const userId = req.auth!.userId;

        const entry = await prisma.availability.create({
            data: {
                userId,
                kind: "RECURRING",
                ...body
            }
        });

        res.status(201).json({ entry });
    } catch (err) {
        next(err);
    }
});

availabilityRouter.post("/exception", async (req: AuthedRequest, res, next) => {
    try {
        const body = ExceptionSchema.parse(req.body);
        const userId = req.auth!.userId;

        const entry = await prisma.availability.create({
            data: {
                userId,
                kind: "EXCEPTION",
                exceptionType: body.exceptionType,
                startTimeUtc: new Date(body.startTimeUtc),
                endTimeUtc: new Date(body.endTimeUtc),
                timezone: "UTC" // Exceptions are usually stored in UTC
            }
        });

        res.status(201).json({ entry });
    } catch (err) {
        next(err);
    }
});

availabilityRouter.delete("/:id", async (req: AuthedRequest, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.auth!.userId;

        const entry = await prisma.availability.findUnique({ where: { id } });
        if (!entry) throw new ApiError({ status: 404, code: "NOT_FOUND", message: "Entry not found" });
        if (entry.userId !== userId) throw new ApiError({ status: 403, code: "FORBIDDEN", message: "Not your entry" });

        await prisma.availability.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});
