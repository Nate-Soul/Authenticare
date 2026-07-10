export type UserRole = "user" | "admin";

/**
 * Driver-agnostic shape of a User. Both the Mongo and Postgres repositories
 * map their native records onto this shape so the rest of the app never
 * touches an ObjectId or a Prisma type directly.
 */
export interface UserEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string; // hashed — never returned to clients, see toPublicUser()
  role: UserRole;
  tokenVersion: number; // incremented on refresh-rotation and logout to revoke old refresh tokens
  emailVerified: boolean;
  // Email-verification and password-reset tokens are stored ONLY as SHA-256 hashes,
  // never as the raw token, and are single-use (cleared on consumption) + time-limited.
  verificationTokenHash: string | null;
  verificationTokenExpiresAt: Date | null;
  passwordResetTokenHash: string | null;
  passwordResetExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string; // plaintext in, hashed by the repository before persisting
  role?: UserRole;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string; // plaintext in, if present
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * The contract every DB driver must satisfy. Services depend on this
 * interface only — never on Mongoose or Prisma directly — which is what
 * makes the driver swappable and the services unit-testable with a fake.
 */
export interface UserRepository {
  create(input: CreateUserInput): Promise<UserEntity>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findById(id: string): Promise<UserEntity | null>;
  findAll(params: PaginationParams): Promise<PaginatedResult<UserEntity>>;
  update(id: string, input: UpdateUserInput): Promise<UserEntity | null>;
  softDelete(id: string): Promise<boolean>;
  verifyPassword(user: UserEntity, plainPassword: string): Promise<boolean>;
  incrementTokenVersion(id: string): Promise<void>;

  /** Hash a plaintext password with the driver's configured bcrypt cost. Keeps bcrypt out of the service. */
  hashPassword(plain: string): Promise<string>;

  // Email verification — tokens stored as SHA-256 hashes, single-use, time-limited.
  setVerificationToken(id: string, hash: string, expiresAt: Date): Promise<void>;
  /** Returns the user only if the hash matches AND the token has not expired (and is not soft-deleted). */
  findByVerificationTokenHash(hash: string): Promise<UserEntity | null>;
  /** Marks the email verified and clears the verification token fields (single-use). */
  markEmailVerified(id: string): Promise<void>;

  // Password reset — tokens stored as SHA-256 hashes, single-use, time-limited.
  setPasswordResetToken(id: string, hash: string, expiresAt: Date): Promise<void>;
  /** Returns the user only if the hash matches AND the token has not expired (and is not soft-deleted). */
  findByPasswordResetTokenHash(hash: string): Promise<UserEntity | null>;
  /**
   * Sets an already-hashed password (produced by hashPassword), clears the reset token
   * fields (single-use), and bumps tokenVersion to revoke every outstanding session.
   */
  resetPassword(id: string, newHashedPassword: string): Promise<void>;
}
