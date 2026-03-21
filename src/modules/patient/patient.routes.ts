import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware";
import { tenantMiddleware } from "../../middleware/tenant.middleware";
import { authorize } from "../../middleware/role.middleware";
import { getPatientsController, createPatientController } from "./patient.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getPatientsController);
router.post("/", authorize(["ADMIN", "MANAGER"]), createPatientController);

export default router;