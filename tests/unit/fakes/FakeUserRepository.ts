import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type {
  UserRepository,
  UserEntity,
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  PaginatedResult,
} from "../../src/shared/types/user.js";
import { AppError } from "../../../src/shared/utils/AppError.js";

export class FakeUserRepository implements UserRepository {
  private users = new Map<string, UserEntity>();

  async create(input: CreateUserInput): Promise<UserEntity> {
    const dupe = [...this.users.values()].find((u) => u.email === input.email.toLowerCase() && !u.deletedAt);
    if (dupe) throw AppError.conflict("An account with this email already exists");

    const now = new Date();
    const user: UserEntity = {
      id: randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      password: await bcrypt.hash(input.password, 4), // low cost factor: tests only
      role: input.role ?? "user",
      tokenVersion: 0,
      emailVerified: false,
      verificationTokenHash: null,
      verificationTokenExpiresAt: null,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = [...this.users.values()].find((u) => u.email === email.toLowerCase() && !u.deletedAt);
    return user ? { ...user } : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = this.users.get(id);
    return user && !user.deletedAt ? { ...user } : null;
  }

  async findAll({ page, limit }: PaginationParams): Promise<PaginatedResult<UserEntity>> {
    const all = [...this.users.values()].filter((u) => !u.deletedAt);
    const start = (page - 1) * limit;
    const items = all.slice(start, start + limit);
    return { items, total: all.length, page, limit, totalPages: Math.ceil(all.length / limit) };
  }

  async update(id: string, input: UpdateUserInput): Promise<UserEntity | null> {
    const user = this.users.get(id);
    if (!user) return null;
    if (input.firstName !== undefined) user.firstName = input.firstName;
    if (input.lastName !== undefined) user.lastName = input.lastName;
    if (input.email !== undefined) {
      const dupe = [...this.users.values()].find(
        (u) => u.email === input.email!.toLowerCase() && u.id !== id && !u.deletedAt,
      );
      if (dupe) throw AppError.conflict("An account with this email already exists");
      user.email = input.email.toLowerCase();
    }
    if (input.password !== undefined) user.password = await bcrypt.hash(input.password, 4);
    user.updatedAt = new Date();
    return user;
  }

  async softDelete(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;
    user.deletedAt = new Date();
    return true;
  }

  async verifyPassword(user: UserEntity, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.password);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) user.tokenVersion += 1;
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 4); // low cost factor: tests only
  }

  async setVerificationToken(id: string, hash: string, expiresAt: Date): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.verificationTokenHash = hash;
      user.verificationTokenExpiresAt = expiresAt;
    }
  }

  async findByVerificationTokenHash(hash: string): Promise<UserEntity | null> {
    const user = [...this.users.values()].find(
      (u) =>
        u.verificationTokenHash === hash &&
        u.verificationTokenExpiresAt !== null &&
        u.verificationTokenExpiresAt > new Date() &&
        !u.deletedAt,
    );
    return user ? { ...user } : null;
  }

  async markEmailVerified(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.emailVerified = true;
      user.verificationTokenHash = null;
      user.verificationTokenExpiresAt = null;
    }
  }

  async setPasswordResetToken(id: string, hash: string, expiresAt: Date): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.passwordResetTokenHash = hash;
      user.passwordResetExpiresAt = expiresAt;
    }
  }

  async findByPasswordResetTokenHash(hash: string): Promise<UserEntity | null> {
    const user = [...this.users.values()].find(
      (u) =>
        u.passwordResetTokenHash === hash &&
        u.passwordResetExpiresAt !== null &&
        u.passwordResetExpiresAt > new Date() &&
        !u.deletedAt,
    );
    return user ? { ...user } : null;
  }

  async resetPassword(id: string, newHashedPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.password = newHashedPassword;
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      user.tokenVersion += 1;
    }
  }
}
