import type { Response } from "express";

export interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: Record<string, unknown>): void {
  const body: SuccessBody<T> = meta ? { success: true, data, meta } : { success: true, data };
  res.status(statusCode).json(body);
}

export function sendError(res: Response, statusCode: number, code: string, message: string, details?: unknown): void {
  const body: ErrorBody = { success: false, error: { code, message, ...(details ? { details } : {}) } };
  res.status(statusCode).json(body);
}
