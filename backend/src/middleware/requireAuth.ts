import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../lib/auth";
import { ApiError } from "../lib/errors";

export type AuthedRequest = Request & {
  auth?: { userId: string; role: "ADMIN" | "MANAGER" | "STAFF" };
};

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header) {
    return next(new ApiError({ status: 401, code: "UNAUTHORIZED", message: "Missing Authorization header" }));
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return next(
      new ApiError({ status: 401, code: "UNAUTHORIZED", message: "Authorization header must be Bearer <token>" }),
    );
  }

  const claims = verifyAccessToken(token);
  req.auth = { userId: claims.sub, role: claims.role };
  return next();
}

