import { Request, Response, NextFunction } from "express";
import { loginUser, registerOrgAndAdmin } from "./auth.service";
import { registerOrganizationSchema, loginSchema } from "@/validations/auth.validation";
import { logAuth, logError } from "@/utils/logger"
import { successResponse } from "@/utils/apiResponse";

import { audit } from "@/utils/audit.helper";
import { AUDIT_ACTIONS } from "@/constants/auditActions";

export const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = registerOrganizationSchema.parse(req.body);

    const { org, user, token } = await registerOrgAndAdmin(validatedData);

    logAuth.registration(validatedData.email, validatedData.orgName);

    audit(req, {
      action: AUDIT_ACTIONS.ORG_CREATED,
      metadata: {
        email: validatedData.email,
        orgName: validatedData.orgName,
      },
    });

    return res
      .status(201)
      .json(successResponse({ org, user, token }, "Organization registered successfully"));
  } catch (error: unknown) {
    const email = (req.body as any)?.email || "unknown";
    const orgName = (req.body as any)?.orgName;

    if (error instanceof Error) {
      const isUniqueError =
        error.message.includes("Unique constraint");

      audit(req, {
        action: AUDIT_ACTIONS.ORG_CREATE_FAILED,
        metadata: {
          email: email,
          orgName:orgName,
          reason: error instanceof Error ? error.message : "unknown",
        },
      });

      if (isUniqueError) {
        logError.general(error, "Organization registration - duplicate email");

        return res
          .status(409)
          .json({ success: false, message: "Email already exists" });
      }

      if (error.name === "ZodError") {
        logError.validation(error, "/auth/register");

        return res
          .status(400)
          .json({ success: false, message: "Invalid input data" });
      }

      logError.general(error, "Organization registration");

      return res
        .status(400)
        .json({ success: false, message: "Registration failed" });
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

      audit(req, {
        action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
        metadata: {
          email: validatedData.email,
          tenantId: validatedData.tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      });

    return res
      .status(200)
      .json(successResponse({ user, token }, "Login successful"));
  } catch (error: unknown) {
    const email = (req.body as any)?.email || "unknown";
    const tenantId = (req.body as any)?.tenantId;

    if (error instanceof Error) {
      logAuth.loginAttempt(email, false, tenantId);

      audit(req, {
        action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
        metadata: {
          email,
          tenantId,
          userAgent: req.headers["user-agent"],
          reason: error instanceof Error ? error.message : "unknown",
          ip: req.ip,
        },
      });

      if (error.name === "ZodError") {
        logError.validation(error, "/auth/login");

        return res
          .status(400)
          .json({ success: false, message: "Invalid input data" });
      }

      logError.general(error, "User login");

      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    logError.general(error as Error, "User login - unexpected error");
    next(error);
  }
};