import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { authorize } from "../../middleware/role.middleware";
import { createUserController, getUsersController, getUserController, updateUserController, deleteUserController } from "./user.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getUsersController);
router.get("/:id", getUserController);
router.post("/", authorize(["ADMIN"]), createUserController);
router.put("/:id", authorize(["ADMIN"]), updateUserController);
router.delete("/:id", authorize(["ADMIN"]), deleteUserController);

export default router;