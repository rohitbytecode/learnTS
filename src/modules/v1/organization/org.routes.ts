import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authMiddleware } from "@/middleware/auth.middleware";
import { tenantMiddleware } from "@/middleware/tenant.middleware";
import { authorize } from "@/middleware/role.middleware";
import { registerOrganization } from "../auth/auth.controller";
import { getOrganizationController, updateOrganizationController } from "./org.controller";
import { authRateLimiter } from "@/middleware/rateLimit.middleware";

const router = Router();

router.post("/register", authRateLimiter, asyncHandler(registerOrganization));

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getOrganizationController);
router.put("/", authorize(["ADMIN"]), updateOrganizationController);

export default router;
