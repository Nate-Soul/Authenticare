import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { userRepository } from "../db/index.js";
import type { UserRole } from "../types/user.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return next(AppError.unauthorized("Missing access token"));
  }

  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired access token"));
  }
}

/** Restrict a route to one or more roles. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(AppError.unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(AppError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}

/**
 * Gate a route on a verified email. Must run AFTER requireAuth (it reads req.auth).
 * Responds 403 EMAIL_NOT_VERIFIED when the authenticated user's email is unverified.
 */
export function requireVerified() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) return next(AppError.unauthorized());
    const user = await userRepository.findById(req.auth.userId);
    if (!user) return next(AppError.unauthorized());
    if (!user.emailVerified) return next(new AppError("Email not verified", 403, "EMAIL_NOT_VERIFIED"));
    next();
  };
}

/** Allow the resource owner OR an admin — the check the original repo's name promised but didn't do. */
export function requireSelfOrAdmin(paramName = "id") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(AppError.unauthorized());
    const targetId = req.params[paramName];
    if (req.auth.role === "admin" || req.auth.userId === targetId) {
      return next();
    }
    next(AppError.forbidden("You can only access your own resource"));
  };
}
