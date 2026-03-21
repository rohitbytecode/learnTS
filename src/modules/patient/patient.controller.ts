import { Request, Response } from "express"
import { getPatients, createPatient } from "./patient.service"
import { createPatientSchema } from "../../validations/patient.validation"

export const createPatientController = async (req: Request, res: Response) => {
  try {
    const validatedData = createPatientSchema.parse(req.body)

    const patient = await createPatient(validatedData, req.tenantId!)
    res.status(201).json(patient)
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: error.message, errors: error })
      }
      return res.status(400).json({ message: error.message })
    }
    res.status(500).json({ message: "Unexpected error" })
  }
}

export const getPatientsController = async (req: Request, res: Response) => {
  try {
    const patients = await getPatients(req.tenantId!)
    res.json(patients)
  } catch (error: unknown) {
    res.status(500).json({ message: "Unexpected error" })
  }
}