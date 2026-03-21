import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { getPatients, createPatient } from "./patient.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getPatients);
router.post("/", createPatient);

export default router;