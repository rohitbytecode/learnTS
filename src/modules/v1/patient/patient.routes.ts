import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { authMiddleware } from "@/middleware/auth.middleware";
import { tenantMiddleware } from "@/middleware/tenant.middleware";
import { authorize } from "@/middleware/role.middleware";
import {
  getPatientsController,
  createPatientController,
  getPatientController,
  updatePatientController,
  deletePatientController,
} from "./patient.controller";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", asyncHandler(getPatientsController));
router.get("/:id", asyncHandler(getPatientController));
router.post("/", authorize(["ADMIN", "MANAGER"]), asyncHandler(createPatientController));
router.put("/:id", authorize(["ADMIN", "MANAGER"]), asyncHandler(updatePatientController));
router.delete("/:id", authorize(["ADMIN"]), asyncHandler(deletePatientController));

export default router;
