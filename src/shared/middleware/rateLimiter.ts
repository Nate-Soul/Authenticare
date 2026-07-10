import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { sendError } from "../utils/response.js";

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, 429, "TOO_MANY_REQUESTS", "Too many requests, please try again later"),
});

// Tighter limit specifically for login/register/refresh to blunt brute-force
// and credential-stuffing attempts — absent entirely from the original repo.
export const authLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => sendError(res, 429, "TOO_MANY_REQUESTS", "Too many attempts, please try again later"),
});
