import { Request, Response, NextFunction } from "express";
import { loginUser, registerOrgAndAdmin } from "./auth.service";
import { registerOrganizationSchema, loginSchema } from "../../validations/auth.validation";

export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerOrganizationSchema.parse(req.body);

    const { org, user, token } = await registerOrgAndAdmin(validatedData);
    return res.status(201).json({ org, user, token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const isUniqueError = error.message.includes("Unique constraint") || error.message.includes("Unique constraint failed");
      if (isUniqueError) {
        return res.status(409).json({ message: "Email already exists" });
      }
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.message, errors: error });
      }
      return res.status(400).json({ message: error.message });
    }

    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const { user, token } = await loginUser(validatedData);
    return res.status(200).json({ user, token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.message, errors: error });
      }
      return res.status(401).json({ message: error.message });
    }

    next(error);
  }
};