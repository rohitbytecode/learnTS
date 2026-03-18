import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "../src/generated/prisma";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter })


async function main() {
    const org = await prisma.organization.create({
        data: {
            name: "Malavia Hospital"
        }
    })

    await prisma.user.create({
        data:{
            name: "Admin",
            email: "admin@malavia.com",
            password: "hashedpassword",
            role: Role.ADMIN,
            tenantId: org.id
        }
    })
}

main()
    .then(() => console.log("Seeded"))
    .catch(console.error)
    .finally(() => prisma.$disconnect())