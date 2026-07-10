import { UserModel, type UserDocument } from "./user.schema.js";
import type {
  UserRepository,
  UserEntity,
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  PaginatedResult,
} from "../../types/user.js";

function toEntity(doc: UserDocument): UserEntity {
  return {
    id: doc._id.toString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    password: doc.password,
    role: doc.role,
    tokenVersion: doc.tokenVersion,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    deletedAt: doc.deletedAt,
  };
}

export class MongoUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<UserEntity> {
    const doc = await UserModel.create({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      password: input.password, // hashed by the pre-save hook
      role: input.role ?? "user",
    });
    return toEntity(doc);
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
      UserModel.countDocuments(),
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

    await doc.save();
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
}
