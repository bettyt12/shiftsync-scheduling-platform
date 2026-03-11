import { Router } from "express";
import { z } from "zod";

import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireRole } from "../middleware/requireRole";

export const skillsRouter = Router();

skillsRouter.use(requireAuth, requireRole(["ADMIN"]));

skillsRouter.get("/", async (_req, res, next) => {
  try {
    const skills = await prisma.skill.findMany({ orderBy: { name: "asc" } });
    res.json({ skills });
  } catch (err) {
    next(err);
  }
});

const CreateSkillSchema = z.object({
  name: z.string().min(2),
});

skillsRouter.post("/", async (req, res, next) => {
  try {
    const body = CreateSkillSchema.parse(req.body);
    const skill = await prisma.skill.create({
      data: { name: body.name.toLowerCase() },
    });
    res.status(201).json({ skill });
  } catch (err) {
    next(err);
  }
});

