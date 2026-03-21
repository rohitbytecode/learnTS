import { Request, Response, NextFunction } from "express"
import { getPatients, createPatient } from "./patient.service"
import { createPatientSchema } from "../../validations/patient.validation"
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