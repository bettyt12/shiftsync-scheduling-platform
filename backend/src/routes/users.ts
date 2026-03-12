import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";
import { ApiError } from "../lib/errors";

export const usersRouter = Router();

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
            await tx.user.update({
                where: { id: targetUserId },
                data: {
                    name: body.name,
                    role: body.role,
                    desiredHoursPerWeek: body.desiredHoursPerWeek,
                }
            });

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
