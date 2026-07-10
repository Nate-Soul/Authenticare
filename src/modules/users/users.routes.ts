import { Router } from "express";
import * as usersController from "./users.controller.js";
import { requireAuth, requireRole, requireSelfOrAdmin } from "../../shared/middleware/auth.js";
import { validate } from "../../shared/middleware/validate.js";
import { listUsersQuerySchema, updateUserSchema, userIdParamSchema } from "./users.schemas.js";

const router = Router();

router.use(requireAuth);

router.get("/me", usersController.getMe);
router.get("/", requireRole("admin"), validate({ query: listUsersQuerySchema }), usersController.listUsers);
router.get("/:id", validate({ params: userIdParamSchema }), requireSelfOrAdmin(), usersController.getUserById);
router.patch(
  "/:id",
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  requireSelfOrAdmin(),
  usersController.updateUser,
);
router.delete("/:id", validate({ params: userIdParamSchema }), requireSelfOrAdmin(), usersController.deleteUser);

export default router;
