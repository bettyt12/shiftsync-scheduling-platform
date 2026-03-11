import type { NextFunction, Response } from "express";

import { ApiError } from "../lib/errors";
import type { AuthedRequest } from "./requireAuth";

export function requireRole(roles: Array<"ADMIN" | "MANAGER" | "STAFF">) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) return next(new ApiError({ status: 401, code: "UNAUTHORIZED", message: "Not authenticated" }));
    if (!roles.includes(role)) return next(new ApiError({ status: 403, code: "FORBIDDEN", message: "Forbidden" }));
    return next();
  };
}

