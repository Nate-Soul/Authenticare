import type { Request, Response } from "express";
import { UsersService } from "./users.service.js";
import { userRepository } from "../../shared/db/index.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { sendSuccess } from "../../shared/utils/response.js";
import type { ListUsersQuery, UpdateUserBody } from "./users.schemas.js";

const usersService = new UsersService(userRepository);

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getById(req.auth!.userId);
  sendSuccess(res, user);
});

export const getUserById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const user = await usersService.getById(req.params.id);
  sendSuccess(res, user);
});

// Admin-only, paginated — the original repo's equivalent route was public
// and returned every field including the password hash for every user.
export const listUsers = asyncHandler(async (req, res) => {
  const query = req.query as unknown as ListUsersQuery;
  const result = await usersService.list(query);
  sendSuccess(res, result.items, 200, {
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  });
});

export const updateUser = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateUserBody>, res: Response) => {
  const user = await usersService.update(req.params.id, req.body);
  sendSuccess(res, user);
});

export const deleteUser = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  await usersService.remove(req.params.id);
  sendSuccess(res, { message: "User deleted" });
});
