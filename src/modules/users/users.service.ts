import type { PaginatedResult, PublicUser, UserRepository } from "../../shared/types/user.js";
import { toPublicUser } from "../../shared/types/user.js";
import { AppError } from "../../shared/utils/AppError.js";
import type { ListUsersQuery, UpdateUserBody } from "./users.schemas.js";

export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async getById(id: string): Promise<PublicUser> {
    const user = await this.users.findById(id);
    if (!user) throw AppError.notFound("User not found");
    return toPublicUser(user);
  }

  async list({ page, limit }: ListUsersQuery): Promise<PaginatedResult<PublicUser>> {
    const result = await this.users.findAll({ page, limit });
    return { ...result, items: result.items.map(toPublicUser) };
  }

  async update(id: string, input: UpdateUserBody): Promise<PublicUser> {
    const updated = await this.users.update(id, input);
    if (!updated) throw AppError.notFound("User not found");
    return toPublicUser(updated);
  }

  async remove(id: string): Promise<void> {
    const ok = await this.users.softDelete(id);
    if (!ok) throw AppError.notFound("User not found");
  }
}
