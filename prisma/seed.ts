import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/utils/hash";
import { env } from "../src/config/env";

const connectionString = env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter })

async function main() {
    await prisma.patient.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();

    const orgA = await prisma.organization.create({
        data: {
            name: "Hospital A"
        }
    })

    const hashedPwdA1 = await hashPassword("password123");
    const hashedPwdA2 = await hashPassword("password456");

    const userA1 = await prisma.user.create({
        data: {
            name: "Admin A",
            email: "admin@hospitala.com",
            password: hashedPwdA1,
            role: Role.ADMIN,
            tenantId: orgA.id
        }
    })

    const userA2 = await prisma.user.create({
        data: {
            name: "Manager A",
            email: "manager@hospitala.com",
            password: hashedPwdA2,
            role: Role.MANAGER,
            tenantId: orgA.id
        }
    })

    await prisma.patient.createMany({
        data: [
            { name: "Patient A1", age: 30, diagnosis: "Flu", tenantId: orgA.id },
            { name: "Patient A2", age: 45, diagnosis: "Cold", tenantId: orgA.id },
            { name: "Patient A3", age: 60, diagnosis: "Diabetes", tenantId: orgA.id }
        ]
    })

    // Org B
    const orgB = await prisma.organization.create({
        data: {
            name: "Hospital B"
        }
    })

    const hashedPwdB1 = await hashPassword("password789");
    const hashedPwdB2 = await hashPassword("password101");

    const userB1 = await prisma.user.create({
        data: {
            name: "Admin B",
            email: "admin@hospitalb.com",
            password: hashedPwdB1,
            role: Role.ADMIN,
            tenantId: orgB.id
        }
    })

    const userB2 = await prisma.user.create({
        data: {
            name: "Manager B",
            email: "manager@hospitalb.com",
            password: hashedPwdB2,
            role: Role.MANAGER,
            tenantId: orgB.id
        }
    })

    await prisma.patient.createMany({
        data: [
            { name: "Patient B1", age: 25, diagnosis: "Headache", tenantId: orgB.id },
            { name: "Patient B2", age: 50, diagnosis: "Back Pain", tenantId: orgB.id },
            { name: "Patient B3", age: 70, diagnosis: "Hypertension", tenantId: orgB.id }
        ]
    })

    console.log("Seeded data for Org A and Org B");
}

main()
    .then(() => console.log("Seeding completed"))
    .catch(console.error)
    .finally(() => prisma.$disconnect())