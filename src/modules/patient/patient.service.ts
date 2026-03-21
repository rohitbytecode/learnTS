import { prisma } from '../../config/db'

export const getPatients = async (tenantId: string) => {
    return prisma.patient.findMany({
        where: {
            tenantId
        }
    })
}

export const createPatient = async (data: any, tenantId: string) => {
    return prisma.patient.create({
        data: {
            ...data,
            tenantId
        }
    })
}