import { Request, Response } from "express"
import { prisma } from "../../config/db"

export const createPatient = async (req: Request, res: Response) => {
    const patient = await prisma.patient.create({
        data: {
            ...req.body,
            tenantId: req.tenantId
        }
    })

    res.json(patient)
}

export const getPatients = async (req: Request, res: Response) => {
    const patients = await prisma.patient.findMany({
        where: {
            tenantId: req.tenantId
        }
    })

    res.json(patients)
}