import { Request, Response, NextFunction } from "express"
import { getPatients, createPatient, getPatientById, updatePatient, deletePatient } from "./patient.service"
import { createPatientSchema, updatePatientSchema } from "../../validations/patient.validation"
import { logPatient, logError } from "../../utils/logger"

export const createPatientController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createPatientSchema.parse(req.body)

    const patient = await createPatient(validatedData, req.tenantId!)

    logPatient.created(validatedData.name, req.tenantId!)

    res.status(201).json(patient)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        logError.validation(error, "/patients")
        return res.status(400).json({ message: error.message, errors: error })
      }
      logError.general(error, "Patient creation")
      return res.status(400).json({ message: error.message })
    }
    logError.general(error as Error, "Patient creation - unexpected error")
    next(error)
  }
}

export const getPatientsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await getPatients(req.tenantId!)

    logPatient.retrieved(patients.length, req.tenantId!)

    res.json(patients)
  } catch (error: unknown) {
    logError.general(error as Error, "Patients retrieval")
    next(error)
  }
}

export const getPatientController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const patient = await getPatientById(id as string, req.tenantId!)

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" })
    }

    res.json(patient)
  } catch (error: unknown) {
    logError.general(error as Error, "Patient retrieval by ID")
    next(error)
  }
}

export const updatePatientController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const validatedData = updatePatientSchema.parse(req.body)

    const patient = await updatePatient(id as string, validatedData, req.tenantId!)

    res.json(patient)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        logError.validation(error, "/patients/:id")
        return res.status(400).json({ message: error.message, errors: error })
      }
      logError.general(error, "Patient update")
      return res.status(400).json({ message: error.message })
    }
    logError.general(error as Error, "Patient update - unexpected error")
    next(error)
  }
}

export const deletePatientController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    await deletePatient(id as string, req.tenantId!)

    res.status(204).send()
  } catch (error: unknown) {
    logError.general(error as Error, "Patient deletion")
    next(error)
  }
}