import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRole } from "../types/user.js";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
  type: "refresh";
}

export function signAccessToken(userId: string, role: UserRole): string {
  const payload: AccessTokenPayload = { sub: userId, role, type: "access" };
  const options: jwt.SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  const payload: RefreshTokenPayload = { sub: userId, tokenVersion, type: "refresh" };
  const options: jwt.SignOptions = { expiresIn: env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as AccessTokenPayload;
  if (decoded.type !== "access") throw new Error("Not an access token");
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as RefreshTokenPayload;
  if (decoded.type !== "refresh") throw new Error("Not a refresh token");
  return decoded;
}

export const REFRESH_COOKIE_NAME = "refresh_token";

export function refreshCookieOptions() {
  // sameSite "strict": the refresh cookie is only sent for same-site requests. If your
  // SPA lives on a different registrable domain than the API, switch to "none" (requires
  // secure:true, i.e. HTTPS) or "lax".
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: env.REFRESH_TOKEN_TTL_MS,
    path: "/api/v1/auth",
  };
}
