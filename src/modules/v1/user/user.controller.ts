import { Request, Response, NextFunction } from "express";
import { createUser, getUsers, getUserById, updateUser, deleteUser } from "./user.service";
import { createUserSchema } from "@/validations/user.validation";
import { logUser, logError } from "@/utils/logger";
import { successResponse } from "@/utils/apiResponse";
import { audit } from "@/utils/audit.helper";
import { AUDIT_ACTIONS } from "@/constants/auditActions";
import { readSync } from "node:fs";

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createUserSchema.parse(req.body);

    const { user, generatedPassword } = await createUser(validatedData, req.tenantId!);

    logUser.created(validatedData.email, validatedData.role, req.tenantId!);

    audit(req, {
      action: AUDIT_ACTIONS.USER_CREATED,
      metadata: {
        tenantId: req.tenantId,
        createUserId: user.id,
        email: validatedData.email,
        role: validatedData.role,
      },
    });

    return res
      .status(201)
      .json(successResponse({ user, generatedPassword }, "User created successfully"));
  } catch (error: unknown) {
    audit(req, {
      action: AUDIT_ACTIONS.USER_CREATE_FAILED,
      metadata: {
        tenantId: req.tenantId,
        email: (req.body as any)?.email,
        reason: error instanceof Error ? error.message : "unknown",
      },
    });

    if (error instanceof Error) {
      if (error.name === "ZodError") {
        logError.validation(error, "/users");
        return res.status(400).json({ message: error.message, errors: error });
      }

      const isUniqueError = error.message.includes("Unique constraint");
      if (isUniqueError) {
        logError.general(error, "User creation - unique constraint violation");
        return res.status(409).json({ message: "Email already exists in this tenant" });
      }
      logError.general(error, "User creation");
      return res.status(400).json({ message: error.message });
    }
    logError.general(error as Error, "User creation - unexpected error");
    next(error);
  }
};

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsers(req.tenantId!);

    logUser.retrieved(users.length, req.tenantId!);

    return res.status(200).json(successResponse(users, "Users retrieved successfully"));
  } catch (error: unknown) {
    logError.general(error as Error, "Users retrieval");
    next(error);
  }
};

export const getUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id as string, req.tenantId!);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(successResponse(user, "User retrieved successfully"));
  } catch (error: unknown) {
    logError.general(error as Error, "User retrieval by ID");
    next(error);
  }
};

export const updateUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = createUserSchema.partial().parse(req.body);

    const user = await updateUser(id as string, validatedData, req.tenantId!);

    audit(req, {
      action: AUDIT_ACTIONS.USER_UPDATED,
      metadata: {
        tenantId: req.tenantId,
        updateUserId: id,
        updatedFields: Object.keys(validatedData),
      },
    });

    return res.json(successResponse(user, "User updated successfuly"));
  } catch (error: unknown) {
    audit(req, {
      action: AUDIT_ACTIONS.USER_UPDATE_FAILED,
      metadata: {
        tenantId: req.tenantId,
        userId: (req.body as any)?.id,
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        logError.validation(error, "/users/:id");
        return res.status(400).json({ message: error.message, errors: error });
      }
      logError.general(error, "User update");
      return res.status(400).json({ message: error.message });
    }
    logError.general(error as Error, "User update - unexpected error");
    next(error);
  }
};

export const deleteUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await deleteUser(id as string, req.tenantId!);

    audit(req, {
      action: AUDIT_ACTIONS.USER_DELETED,
      metadata: {
        tenantId: req.tenantId,
        deleteUserId: id,
      },
    });

    return res.status(204).send();
  } catch (error: unknown) {
    audit(req, {
      action: AUDIT_ACTIONS.USER_DELETE_FAILED,
      metadata: {
        tenantId: req.tenantId,
        userId: (req.body as any)?.id,
        reason: error instanceof Error ? error.message : "unknown",
      },
    });

    logError.general(error as Error, "User deletion");
    next(error);
  }
};
