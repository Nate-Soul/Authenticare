import express from "express";
const router = express.Router();

import {
    getUsers,
    getUser,
    updateUser,
    deleteUser
} from "../controllers/user.controller.js";
import { verifyToken, isOwnerorAdminPermission } from "../middleware/auth.middleware.js";

router.get("/", getUsers);
router.route("/:id")
    .get(verifyToken, isOwnerorAdminPermission, getUser)
    .put(verifyToken, isOwnerorAdminPermission, updateUser)
    .delete(verifyToken, isOwnerorAdminPermission, deleteUser);

export default router;
