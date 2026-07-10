import { Router } from "express";
import healthRoutes from "./health.js";
import { authRoutes } from "../../modules/auth/index.js";
import { usersRoutes } from "../../modules/users/index.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", usersRoutes);

// New module? Add its routes here:
// router.use("/notifications", notificationRoutes);

export default router;
