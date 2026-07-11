import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { sendError } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { env } from "../../config/env.js";

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    sendError(res, 400, "VALIDATION_ERROR", "Request validation failed", err.flatten());
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err, reqId: req.id }, err.message);
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  logger.error({ err, reqId: req.id }, "Unhandled error");
  sendError(
    res,
    500,
    "INTERNAL_ERROR",
    env.NODE_ENV === "production" ? "Something went wrong" : (err as Error)?.message ?? "Unknown error",
  );
}
