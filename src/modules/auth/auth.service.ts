import type { UserRepository } from "../../shared/types/user.js";
import { toPublicUser, type PublicUser } from "../../shared/types/user.js";
import { AppError } from "../../shared/utils/AppError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/tokens.js";
import { generateToken, hashToken } from "../../shared/crypto/tokens.js";
import { enqueueEmail } from "../../shared/queue/jobs/sendEmail.job.js";
import { verifyEmailTemplate, passwordResetTemplate, type MailMessage } from "../../shared/email/index.js";
import { env } from "../../config/env.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Injectable seam for outbound auth email. Defaults to enqueuing onto the shared queue
 * (background delivery); tests pass a capturing sender so the flows need no infra.
 * `text` is required here because the seam parses the link out of the plaintext body.
 */
export type EmailSender = (msg: MailMessage & { text: string }) => Promise<void>;

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sendEmail: EmailSender = (msg) => enqueueEmail(msg),
  ) {}

  async register(input: RegisterInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw AppError.conflict("An account with this email already exists");

    const user = await this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
    });

    await this.issueVerification(user.id, user.email);

    return { user: toPublicUser(user), tokens: this.issueTokens(user.id, user.role, user.tokenVersion) };
  }

  async login(input: LoginInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const user = await this.users.findByEmail(input.email);
    // Same error for "no such user" and "wrong password" — don't leak which one it was.
    if (!user) throw AppError.unauthorized("Invalid email or password");

    const valid = await this.users.verifyPassword(user, input.password);
    if (!valid) throw AppError.unauthorized("Invalid email or password");

    return { user: toPublicUser(user), tokens: this.issueTokens(user.id, user.role, user.tokenVersion) };
  }

  /** Rotates the refresh token: the presented one is invalidated the instant a new pair is issued. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Invalid or expired refresh token");
    }

    const user = await this.users.findById(payload.sub);
    if (!user) throw AppError.unauthorized("Invalid or expired refresh token");

    if (user.tokenVersion !== payload.tokenVersion) {
      // Token was already rotated (reused) or the user logged out elsewhere — reject.
      throw AppError.unauthorized("Refresh token has been revoked");
    }

    const newTokenVersion = user.tokenVersion + 1;
    await this.users.incrementTokenVersion(user.id);
    return this.issueTokens(user.id, user.role, newTokenVersion);
  }

  /** Revokes every outstanding refresh token for this user. */
  async logout(userId: string): Promise<void> {
    await this.users.incrementTokenVersion(userId);
  }

  /** Confirms an email using a raw verification token. Single-use: the token is cleared on success. */
  async verifyEmail(token: string): Promise<void> {
    const user = await this.users.findByVerificationTokenHash(hashToken(token));
    if (!user) throw AppError.badRequest("Invalid or expired verification token");
    await this.users.markEmailVerified(user.id);
  }

  /**
   * Re-sends a verification link. Always resolves and never reveals whether the account
   * exists or is already verified (no user enumeration).
   */
  async resendVerification(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || user.emailVerified) return; // silent — no enumeration
    await this.issueVerification(user.id, user.email);
  }

  /**
   * Starts a password reset. Always resolves and never reveals whether the account
   * exists (no user enumeration) — an unknown email is a silent no-op.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return; // silent — no enumeration
    const { token, hash } = generateToken();
    await this.users.setPasswordResetToken(user.id, hash, new Date(Date.now() + env.RESET_TOKEN_TTL_MS));
    const link = `${env.APP_URL}/api/v1/auth/reset-password?token=${token}`;
    await this.sendEmail({ to: user.email, ...passwordResetTemplate(link) });
  }

  /**
   * Completes a password reset. Sets the new password, clears the single-use reset token,
   * and bumps tokenVersion to revoke every outstanding session.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.users.findByPasswordResetTokenHash(hashToken(token));
    if (!user) throw AppError.badRequest("Invalid or expired reset token");
    const hashed = await this.users.hashPassword(newPassword);
    await this.users.resetPassword(user.id, hashed);
  }

  /** Generates a single-use verification token, persists only its hash, and emails the link. */
  private async issueVerification(userId: string, email: string): Promise<void> {
    const { token, hash } = generateToken();
    await this.users.setVerificationToken(userId, hash, new Date(Date.now() + env.VERIFY_TOKEN_TTL_MS));
    const link = `${env.APP_URL}/api/v1/auth/verify-email?token=${token}`;
    await this.sendEmail({ to: email, ...verifyEmailTemplate(link) });
  }

  private issueTokens(userId: string, role: "user" | "admin", tokenVersion: number): TokenPair {
    return {
      accessToken: signAccessToken(userId, role),
      refreshToken: signRefreshToken(userId, tokenVersion),
    };
  }
}
