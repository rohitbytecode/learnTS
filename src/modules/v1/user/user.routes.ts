import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authMiddleware } from "@/middleware/auth.middleware";
import { tenantMiddleware } from "@/middleware/tenant.middleware";
import { authorize } from "@/middleware/role.middleware";
import {
  createUserController,
  getUsersController,
  getUserController,
  updateUserController,
  deleteUserController,
} from "./user.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", asyncHandler(getUsersController));
router.get("/:id", asyncHandler(getUserController));
router.post("/", authorize(["ADMIN"]), asyncHandler(createUserController));
router.put("/:id", authorize(["ADMIN"]), asyncHandler(updateUserController));
router.delete("/:id", authorize(["ADMIN"]), asyncHandler(deleteUserController));

export default router;
