import type { UserRepository } from "../../shared/types/user.js";
import { toPublicUser, type PublicUser } from "../../shared/types/user.js";
import { AppError } from "../../shared/utils/AppError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/utils/tokens.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async register(input: RegisterInput): Promise<{ user: PublicUser; tokens: TokenPair }> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw AppError.conflict("An account with this email already exists");

    const user = await this.users.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
    });

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

  private issueTokens(userId: string, role: "user" | "admin", tokenVersion: number): TokenPair {
    return {
      accessToken: signAccessToken(userId, role),
      refreshToken: signRefreshToken(userId, tokenVersion),
    };
  }
}
