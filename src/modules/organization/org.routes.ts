import { Router } from "express";
import { registerOrganization } from "../auth/auth.controller";

const router = Router();

router.post("/register", registerOrganization);

export default router;
