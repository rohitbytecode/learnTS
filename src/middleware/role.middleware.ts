import { Request, Response, NextFunction } from "express";

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      !req.user ||
      typeof req.user === "string" ||
      !req.user.role ||
      !roles.includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    next();
  };
};
