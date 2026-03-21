import { Router } from "express";
import { login, registerOrganization } from "./auth.controller";

const router = Router();

router.post("/login", login);
router.post("/register", registerOrganization);

export default router;