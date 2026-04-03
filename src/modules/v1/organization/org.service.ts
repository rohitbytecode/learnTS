import { prisma } from "@/config/db";
import { hashPassword } from "@/utils/hash";

interface RegisterOrgData {
  orgName: string;
  name: string;
  email: string;
  password: string;
}

export const registerOrganization = async (data: RegisterOrgData) => {
  const org = await prisma.organization.create({
    data: {
      name: data.orgName,
    },
  });

  const hashedPwd = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPwd,
      role: "ADMIN",
      tenantId: org.id,
    },
  });

  return { org, user };
};

export const getOrganization = async (tenantId: string) => {
  return prisma.organization.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });
};

export const updateOrganization = async (tenantId: string, data: any) => {
  return prisma.organization.update({
    where: { id: tenantId },
    data,
  });
};
