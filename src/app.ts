import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes";
import orgRoutes from "./modules/organization/org.routes";
import patientRoutes from "./modules/patient/patient.routes";
import userRoutes from "./modules/user/user.routes";

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());

app.use("/auth", authRoutes);
app.use("/org", orgRoutes);
app.use("/patients", patientRoutes);
app.use("/users", userRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'saas-backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend is online",
  });
});

export default app;