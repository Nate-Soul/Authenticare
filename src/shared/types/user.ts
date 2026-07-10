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
  createdAt: Date;
}

export function toPublicUser(user: UserEntity): PublicUser {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
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
}
