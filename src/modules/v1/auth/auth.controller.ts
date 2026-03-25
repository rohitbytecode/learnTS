import { Request, Response, NextFunction } from "express";
import { loginUser, registerOrgAndAdmin } from "./auth.service";
import { registerOrganizationSchema, loginSchema } from "@/validations/auth.validation";
import { logAuth, logError } from "@/utils/logger"

export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerOrganizationSchema.parse(req.body);

    const { org, user, token } = await registerOrgAndAdmin(validatedData);

    logAuth.registration(validatedData.email, validatedData.orgName);

    return res.status(201).json({ org, user, token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const isUniqueError = error.message.includes("Unique constraint") || error.message.includes("Unique constraint failed");
      if (isUniqueError) {
        logError.general(error, "Organization registration - unique constraint violation");
        return res.status(409).json({ message: "Email already exists" });
      }
      if (error.name === "ZodError") {
        logError.validation(error, "/auth/register");
        return res.status(400).json({ message: error.message, errors: error });
      }
      logError.general(error, "Organization registration");
      return res.status(400).json({ message: error.message });
    }

    logError.general(error as Error, "Organization registration - unexpected error");
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const { user, token } = await loginUser(validatedData);

    logAuth.loginAttempt(validatedData.email, true, validatedData.tenantId);

    return res.status(200).json({ user, token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const email = (req.body as any)?.email || "unknown";
      const tenantId = (req.body as any)?.tenantId;
      logAuth.loginAttempt(email, false, tenantId);

      if (error.name === "ZodError") {
        logError.validation(error, "/auth/login");
        return res.status(400).json({ message: error.message, errors: error });
      }
      logError.general(error, "User login");
      return res.status(401).json({ message: error.message });
    }

    logError.general(error as Error, "User login - unexpected error");
    next(error);
  }
};