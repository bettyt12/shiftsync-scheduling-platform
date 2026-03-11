import jwt from "jsonwebtoken";
import { z } from "zod";

import { ApiError } from "./errors";

const JwtPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

export type AuthRole = z.infer<typeof JwtPayloadSchema>["role"];
export type AuthClaims = z.infer<typeof JwtPayloadSchema>;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
}

export function signAccessToken(claims: AuthClaims) {
  return jwt.sign(claims, getJwtSecret(), { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): AuthClaims {
  const decoded = jwt.verify(token, getJwtSecret());
  const parsed = JwtPayloadSchema.safeParse(decoded);
  if (!parsed.success) {
    throw new ApiError({ status: 401, code: "UNAUTHORIZED", message: "Invalid token" });
  }
  return parsed.data;
}

