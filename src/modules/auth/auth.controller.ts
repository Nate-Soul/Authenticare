import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { userRepository } from "../../shared/db/index.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { AppError } from "../../shared/utils/AppError.js";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../../shared/utils/tokens.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";

const authService = new AuthService(userRepository);

export const register = asyncHandler(async (req: Request<unknown, unknown, RegisterInput>, res: Response) => {
  const { user, tokens } = await authService.register(req.body);
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
  sendSuccess(res, { user, accessToken: tokens.accessToken }, 201);
});

export const login = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const { user, tokens } = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
  sendSuccess(res, { user, accessToken: tokens.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) throw AppError.unauthorized("Missing refresh token");

  const tokens = await authService.refresh(token);
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
  sendSuccess(res, { accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth) await authService.logout(req.auth.userId);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
  sendSuccess(res, { message: "Logged out successfully" });
});
