import { prisma } from '../../config/db'

export const getPatients = async (tenantId: string) => {
    return prisma.patient.findMany({
        where: {
            tenantId
        }
    })
}