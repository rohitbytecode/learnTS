import { prisma } from '@/config/db'

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

export const getPatientById = async (id: string, tenantId: string) => {
    return prisma.patient.findFirst({
        where: {
            id,
            tenantId
        }
    })
}

export const updatePatient = async (id: string, data: any, tenantId: string) => {
    return prisma.patient.update({
        where: {
            id,
            tenantId
        },
        data
    })
}

export const deletePatient = async (id: string, tenantId: string) => {
    return prisma.patient.delete({
        where: {
            id,
            tenantId
        }
    })
}