import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { login, registerOrganization } from "./auth.controller";

const router = Router();

router.post("/login", asyncHandler(login));
router.post("/register", asyncHandler(registerOrganization));

export default router;