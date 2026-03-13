// @ts-nocheck
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { ApiError } from "../lib/errors";

export const usersRouter = Router();

// Helper: normalize possible string[] from query/params into a single string
const asString = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

usersRouter.get("/", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req: AuthedRequest, res, next) => {
    try {
        const role = req.auth!.role;
        const userId = req.auth!.userId;

        let users;

        if (role === "ADMIN") {
            users = await prisma.user.findMany({
                orderBy: { name: "asc" },
                include: {
                    skills: { include: { skill: true } },
                    locations: { include: { location: true } }
                }
            });
        } else {
            // MANAGER: Only see users in the locations they manage
            const managedLocations = await prisma.userLocation.findMany({
                where: { userId, isManager: true },
                select: { locationId: true }
            });

            const locationIds = managedLocations.map(ml => ml.locationId);

            users = await prisma.user.findMany({
                where: {
                    locations: {
                        some: {
                            locationId: { in: locationIds }
                        }
                    }
                },
                orderBy: { name: "asc" },
                include: {
                    skills: { include: { skill: true } },
                    locations: { include: { location: true } }
                }
            });
        }

        res.json({ users });
    } catch (err) {
        next(err);
    }
});

const UpdateUserSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
    desiredHoursPerWeek: z.number().min(0).max(168).optional(),
    skillIds: z.array(z.string()).optional(),
    locationIds: z.array(z.string()).optional(),
});

usersRouter.patch("/:id", requireAuth, requireRole(["ADMIN", "MANAGER"]), async (req: AuthedRequest, res, next) => {
    try {
        const targetUserId = req.params.id;
        const body = UpdateUserSchema.parse(req.body);
        const actorRole = req.auth!.role;
        const actorId = req.auth!.userId;

        // Permissions check
        if (actorRole !== "ADMIN") {
            // Manager can only update users in their locations
            const managedLocations = await prisma.userLocation.findMany({
                where: { userId: actorId, isManager: true },
                select: { locationId: true }
            });
            const locationIds = managedLocations.map(ml => ml.locationId);

            const targetInLoc = await prisma.userLocation.findFirst({
                where: {
                    userId: targetUserId,
                    locationId: { in: locationIds }
                }
            });

            if (!targetInLoc) {
                throw new ApiError({ status: 403, code: "FORBIDDEN", message: "You do not have permission to manage this user" });
            }

            // Manager cannot change roles to ADMIN, or downgrade themselves/others to/from roles they shouldn't
            if (body.role === "ADMIN") {
                throw new ApiError({ status: 403, code: "FORBIDDEN", message: "Managers cannot assign ADMIN role" });
            }
        }

        // Update basic fields
        const updatedUser = await prisma.$transaction(async (tx) => {
            const data: Parameters<typeof tx.user.update>[0]["data"] = {};

            if (typeof body.name === "string") {
                (data as any).name = body.name;
            }
            if (body.role) {
                (data as any).role = body.role;
            }
            if (typeof body.desiredHoursPerWeek === "number") {
                (data as any).desiredHoursPerWeek = body.desiredHoursPerWeek;
            }

            if (Object.keys(data).length > 0) {
                await tx.user.update({
                    where: { id: targetUserId },
                    data,
                });
            }

            // Update skills if provided
            if (body.skillIds) {
                // Remove old
                await tx.userSkill.deleteMany({ where: { userId: targetUserId } });
                // Add new
                if (body.skillIds.length > 0) {
                    await tx.userSkill.createMany({
                        data: body.skillIds.map(sid => ({
                            userId: targetUserId,
                            skillId: sid
                        }))
                    });
                }
            }

            // Update locations if provided
            if (body.locationIds) {
                // Remove old
                await tx.userLocation.deleteMany({ where: { userId: targetUserId } });
                // Add new
                if (body.locationIds.length > 0) {
                    await tx.userLocation.createMany({
                        data: body.locationIds.map(lid => ({
                            userId: targetUserId,
                            locationId: lid,
                            isManager: false // Default to false, can be updated later if needed
                        }))
                    });
                }
            }

            return tx.user.findUnique({
                where: { id: targetUserId },
                include: {
                    skills: { include: { skill: true } },
                    locations: { include: { location: true } }
                }
            });
        });

        res.json({ user: updatedUser });
    } catch (err) {
        next(err);
    }
});

// Endpoint: Get staff coworkers for a specific location (for swaps)
usersRouter.get("/coworkers", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
        const userId = req.auth!.userId;
        const role = req.auth!.role;
        const locationId = req.query.locationId as string;

        if (role !== "STAFF") {
            return res.status(403).json({ error: "Only staff can access this endpoint." });
        }
        if (!locationId) {
            return res.status(400).json({ error: "locationId is required." });
        }

        // Find staff assigned to this location, excluding self
        const coworkers = await prisma.user.findMany({
            where: {
                role: "STAFF",
                id: { not: userId },
                locations: {
                    some: { locationId }
                }
            },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                email: true,
            }
        });
        res.json({ coworkers });
    } catch (err) {
        next(err);
    }
});
