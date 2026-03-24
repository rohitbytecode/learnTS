import { Router } from "express";
import { authMiddleware } from "@/middleware/auth.middleware";
import { tenantMiddleware } from "@/middleware/tenant.middleware";
import { authorize } from "@/middleware/role.middleware";
import { getPatientsController, createPatientController, getPatientController, updatePatientController, deletePatientController } from "./patient.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getPatientsController);
router.get("/:id", getPatientController);
router.post("/", authorize(["ADMIN", "MANAGER"]), createPatientController);
router.put("/:id", authorize(["ADMIN", "MANAGER"]), updatePatientController);
router.delete("/:id", authorize(["ADMIN"]), deletePatientController);

export default router;