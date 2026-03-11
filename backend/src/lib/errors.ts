import type { NextFunction, Request, Response } from "express";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "LIMIT_EXCEEDED"
  | "CONSTRAINT_VIOLATION";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  details?: unknown;

  constructor(args: { status: number; code: ApiErrorCode; message: string; details?: unknown }) {
    super(args.message);
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ code: "NOT_FOUND", message: "Route not found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Unexpected server error" });
}

