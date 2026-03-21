import { Request, Response, NextFunction } from "express"
import { createUser, getUsers } from "./user.service"
import { createUserSchema } from "../../validations/user.validation"
import { logUser, logError } from "../../utils/logger"

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createUserSchema.parse(req.body)

    const { user, generatedPassword } = await createUser(validatedData, req.tenantId!)

    logUser.created(validatedData.email, validatedData.role, req.tenantId!)

    return res.status(201).json({ user, generatedPassword })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        logError.validation(error, "/users")
        return res.status(400).json({ message: error.message, errors: error })
      }

      const isUniqueError = error.message.includes("Unique constraint")
      if (isUniqueError) {
        logError.general(error, "User creation - unique constraint violation")
        return res.status(409).json({ message: "Email already exists in this tenant" })
      }
      logError.general(error, "User creation")
      return res.status(400).json({ message: error.message })
    }
    logError.general(error as Error, "User creation - unexpected error")
    next(error)
  }
}

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsers(req.tenantId!)

    // Log users retrieval
    logUser.retrieved(users.length, req.tenantId!)

    return res.status(200).json(users)
  } catch (error: unknown) {
    logError.general(error as Error, "Users retrieval")
    next(error)
  }
}