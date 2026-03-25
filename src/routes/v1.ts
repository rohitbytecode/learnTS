import { Router } from "express";
import authRoutes from "@/modules/v1/auth/auth.routes"
import userRoutes from "@/modules/v1/user/user.routes"
import patientRoutes from "@/modules/v1/patient/patient.routes"
import orgRoutes from "@/modules/v1/organization/org.routes"

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/patient", patientRoutes);
router.use("/org", orgRoutes);

export default router;