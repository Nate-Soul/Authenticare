import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function resolveRequestId(incoming: unknown): string {
  if (
    typeof incoming === "string" &&
    incoming.length > 0 &&
    incoming.length <= MAX_REQUEST_ID_LENGTH &&
    SAFE_REQUEST_ID_PATTERN.test(incoming)
  ) {
    return incoming;
  }
  return randomUUID();
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
