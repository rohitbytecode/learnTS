import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { AuthPayload } from "../types/express";
import { env } from "@/config/env";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const decoded = jwt.verify(token, env.JWT_SECRET!) as AuthPayload;

  req.user = decoded;
  next();
};
