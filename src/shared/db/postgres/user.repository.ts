import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "./connection.js";
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
import type { User as PrismaUser } from "@prisma/client";

function isUnique(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
function isNotFound(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

function toEntity(row: PrismaUser): UserEntity {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    password: row.password,
    role: row.role,
    tokenVersion: row.tokenVersion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export class PostgresUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<UserEntity> {
    const hashed = await bcrypt.hash(input.password, env.BCRYPT_COST);
    try {
      const row = await prisma.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email.toLowerCase(),
          password: hashed,
          role: input.role ?? "user",
        },
      });
      return toEntity(row);
    } catch (e) {
      if (isUnique(e)) throw AppError.conflict("An account with this email already exists");
      throw e;
    }
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await prisma.user.findFirst({ where: { email: email.toLowerCase(), deletedAt: null } });
    return row ? toEntity(row) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const row = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    return row ? toEntity(row) : null;
  }

  async findAll({ page, limit }: PaginationParams): Promise<PaginatedResult<UserEntity>> {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { deletedAt: null } }),
    ]);
    return {
      items: rows.map(toEntity),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, input: UpdateUserInput): Promise<UserEntity | null> {
    const data: Record<string, unknown> = {};
    if (input.firstName !== undefined) data.firstName = input.firstName;
    if (input.lastName !== undefined) data.lastName = input.lastName;
    if (input.email !== undefined) data.email = input.email.toLowerCase();
    if (input.password !== undefined) data.password = await bcrypt.hash(input.password, env.BCRYPT_COST);

    try {
      const row = await prisma.user.update({ where: { id }, data });
      return toEntity(row);
    } catch (e) {
      if (isNotFound(e)) return null;
      if (isUnique(e)) throw AppError.conflict("An account with this email already exists");
      throw e;
    }
  }

  async softDelete(id: string): Promise<boolean> {
    try {
      await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
      return true;
    } catch {
      return false;
    }
  }

  async verifyPassword(user: UserEntity, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.password);
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  }
}
