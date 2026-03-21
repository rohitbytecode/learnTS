import { Request, Response, NextFunction } from "express"
import { createUser, getUsers } from "./user.service"
import { createUserSchema } from "../../validations/user.validation"

export const createUserController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createUserSchema.parse(req.body)

    const { user, generatedPassword } = await createUser(validatedData, req.tenantId!)
    return res.status(201).json({ user, generatedPassword })
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.message, errors: error })
      }

      const isUniqueError = error.message.includes("Unique constraint")
      if (isUniqueError) {
        return res.status(409).json({ message: "Email already exists in this tenant" })
      }
      return res.status(400).json({ message: error.message })
    }
    next(error)
  }
}

export const getUsersController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await getUsers(req.tenantId!)
    return res.status(200).json(users)
  } catch (error: unknown) {
    next(error)
  }
}