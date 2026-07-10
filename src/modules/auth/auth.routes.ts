import { Router } from "express";
import * as authController from "./auth.controller.js";
import { validate } from "../../shared/middleware/validate.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { authLimiter } from "../../shared/middleware/rateLimiter.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.schemas.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), authController.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/logout", requireAuth, authController.logout);

router.post("/verify-email", authLimiter, validate({ body: verifyEmailSchema }), authController.verifyEmail);
router.post(
  "/resend-verification",
  authLimiter,
  validate({ body: resendVerificationSchema }),
  authController.resendVerification,
);
router.post("/forgot-password", authLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

export default router;
