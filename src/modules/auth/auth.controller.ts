import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { userRepository } from "../../shared/db/index.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/response.js";
import { AppError } from "../../shared/utils/AppError.js";
import { REFRESH_COOKIE_NAME, refreshCookieOptions } from "../../shared/utils/tokens.js";
import { logger } from "../../shared/utils/logger.js";
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from "./auth.schemas.js";

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

export const verifyEmail = asyncHandler(async (req: Request<unknown, unknown, VerifyEmailInput>, res: Response) => {
  await authService.verifyEmail(req.body.token);
  sendSuccess(res, { message: "Email verified" });
});

export const resendVerification = asyncHandler(
  async (req: Request<unknown, unknown, ResendVerificationInput>, res: Response) => {
    // Fire-and-forget: respond identically and immediately whether or not the account exists
    // (or is already verified), so neither the response body nor its timing leaks that fact.
    // Any background/repository failure is logged server-side but never surfaced to the client.
    void authService
      .resendVerification(req.body.email)
      .catch((err) => logger.error({ err }, "resendVerification background failure"));
    sendSuccess(res, { message: "If the account exists and is unverified, a new link has been sent" });
  },
);

export const forgotPassword = asyncHandler(
  async (req: Request<unknown, unknown, ForgotPasswordInput>, res: Response) => {
    // Fire-and-forget for the same anti-enumeration reason as resendVerification above.
    void authService
      .forgotPassword(req.body.email)
      .catch((err) => logger.error({ err }, "forgotPassword background failure"));
    sendSuccess(res, { message: "If the account exists, a reset link has been sent" });
  },
);

export const resetPassword = asyncHandler(async (req: Request<unknown, unknown, ResetPasswordInput>, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, { message: "Password reset successful" });
});
