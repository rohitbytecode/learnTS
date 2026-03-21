import { Request, Response } from "express";
import { loginUser, registerOrgAndAdmin } from "./auth.service";

export const registerOrganization = async (req: Request, res: Response) => {
  const { orgName, name, email, password } = req.body;

  if (!orgName || !name || !email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const { org, user, token } = await registerOrgAndAdmin({ orgName, name, email, password });
    return res.status(201).json({ org, user, token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const isUniqueError = error.message.includes("Unique constraint") || error.message.includes("Unique constraint failed");
      if (isUniqueError) {
        return res.status(409).json({ message: "Email already exists" });
      }
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const { user, token } = await loginUser({ email, password });
    return res.status(200).json({ user, token });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return res.status(401).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected error" });
  }
};