import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

export const locationsRouter = Router();

locationsRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    let locations;
    if (req.auth!.role === "ADMIN") {
      locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    } else {
      // Find locations user belongs to
      const userLocs = await prisma.userLocation.findMany({
        where: { userId: req.auth!.userId },
        include: { location: true }
      });
      locations = userLocs.map(ul => ul.location).sort((a, b) => a.name.localeCompare(b.name));
    }
    res.json({ locations });
  } catch (err) {
    next(err);
  }
});

locationsRouter.use(requireRole(["ADMIN"]));


const CreateLocationSchema = z.object({
  name: z.string().min(2),
  timezone: z.string().min(3),
});

locationsRouter.post("/", async (req, res, next) => {
  try {
    const body = CreateLocationSchema.parse(req.body);
    const location = await prisma.location.create({
      data: { name: body.name, timezone: body.timezone },
    });
    res.status(201).json({ location });
  } catch (err) {
    next(err);
  }
});

