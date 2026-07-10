import bcrypt from "bcryptjs";
import { UserModel, type UserDocument } from "./user.schema.js";
import { env } from "../../../config/env.js";
import { AppError } from "../../utils/AppError.js";
import type {
  UserRepository,
  UserEntity,
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  PaginatedResult,
} from "../../types/user.js";

function isDuplicate(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: number }).code === 11000;
}

function toEntity(doc: UserDocument): UserEntity {
  return {
    id: doc._id.toString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    password: doc.password,
    role: doc.role,
    tokenVersion: doc.tokenVersion,
    emailVerified: doc.emailVerified,
    // Token-hash fields are `select: false`; on reads that don't request them they arrive
    // as undefined — normalize to null so the entity shape is stable across drivers.
    verificationTokenHash: doc.verificationTokenHash ?? null,
    verificationTokenExpiresAt: doc.verificationTokenExpiresAt ?? null,
    passwordResetTokenHash: doc.passwordResetTokenHash ?? null,
    passwordResetExpiresAt: doc.passwordResetExpiresAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt,
  };
}

export class MongoUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<UserEntity> {
    try {
      const doc = await UserModel.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        password: input.password, // hashed by the pre-save hook
        role: input.role ?? "user",
      });
      return toEntity(doc);
    } catch (e) {
      if (isDuplicate(e)) throw AppError.conflict("An account with this email already exists");
      throw e;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() }).select("+password");
    return doc ? toEntity(doc) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const doc = await UserModel.findById(id).select("+password");
    return doc ? toEntity(doc) : null;
  }

  async findAll({ page, limit }: PaginationParams): Promise<PaginatedResult<UserEntity>> {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      UserModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments({ deletedAt: null }),
    ]);
    return {
      items: docs.map(toEntity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, input: UpdateUserInput): Promise<UserEntity | null> {
    const doc = await UserModel.findById(id).select("+password");
    if (!doc) return null;

    if (input.firstName !== undefined) doc.firstName = input.firstName;
    if (input.lastName !== undefined) doc.lastName = input.lastName;
    if (input.email !== undefined) doc.email = input.email.toLowerCase();
    if (input.password !== undefined) doc.password = input.password; // triggers re-hash via pre-save hook

    try {
      await doc.save();
    } catch (e) {
      if (isDuplicate(e)) throw AppError.conflict("An account with this email already exists");
      throw e;
    }
    return toEntity(doc);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await UserModel.updateOne({ _id: id }, { deletedAt: new Date() });
    return result.modifiedCount > 0;
  }

  async verifyPassword(user: UserEntity, plainPassword: string): Promise<boolean> {
    const doc = await UserModel.findById(user.id).select("+password");
    if (!doc) return false;
    return doc.matchPassword(plainPassword);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } });
  }

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.BCRYPT_COST);
  }

  async setVerificationToken(id: string, hash: string, expiresAt: Date): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { verificationTokenHash: hash, verificationTokenExpiresAt: expiresAt },
    );
  }

  async findByVerificationTokenHash(hash: string): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({
      verificationTokenHash: hash,
      verificationTokenExpiresAt: { $gt: new Date() },
    }).select("+verificationTokenHash +verificationTokenExpiresAt");
    return doc ? toEntity(doc) : null;
  }

  async markEmailVerified(id: string): Promise<void> {
    // updateOne bypasses the password-hashing pre-save hook — safe for non-password writes.
    await UserModel.updateOne(
      { _id: id },
      { emailVerified: true, verificationTokenHash: null, verificationTokenExpiresAt: null },
    );
  }

  async setPasswordResetToken(id: string, hash: string, expiresAt: Date): Promise<void> {
    await UserModel.updateOne(
      { _id: id },
      { passwordResetTokenHash: hash, passwordResetExpiresAt: expiresAt },
    );
  }

  async findByPasswordResetTokenHash(hash: string): Promise<UserEntity | null> {
    const doc = await UserModel.findOne({
      passwordResetTokenHash: hash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+password +passwordResetTokenHash +passwordResetExpiresAt");
    return doc ? toEntity(doc) : null;
  }

  async resetPassword(id: string, newHashedPassword: string): Promise<void> {
    // Write the already-hashed password via updateOne so the pre-save re-hash hook does NOT run.
    await UserModel.updateOne(
      { _id: id },
      {
        password: newHashedPassword,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        $inc: { tokenVersion: 1 },
      },
    );
  }
}
