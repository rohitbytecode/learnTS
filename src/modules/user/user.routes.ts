import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { authorize } from "../../middleware/role.middleware";
import { createUserController, getUsersController } from "./user.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getUsersController);
router.post("/", authorize(["ADMIN"]), createUserController);

export default router;