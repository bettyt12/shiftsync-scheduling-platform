import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

export const locationsRouter = Router();

locationsRouter.use(requireAuth, requireRole(["ADMIN"]));

locationsRouter.get("/", async (_req, res, next) => {
  try {
    const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });
    res.json({ locations });
  } catch (err) {
    next(err);
  }
});

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

