import { prisma } from "@/config/db";
import { comparePassword } from "@/utils/hash";
import { generateToken } from "@/utils/jwt";
import { registerOrganization } from "@/modules/organization/org.service";

interface RegisterOrgData {
  orgName: string;
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  email: string;
  password: string;
  tenantId: string;
}

export const registerOrgAndAdmin = async (data: RegisterOrgData) => {
  const { org, user } = await registerOrganization(data);

  const token = generateToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return { org, user, token };
};

export const loginUser = async (data: LoginData) => {
  const user = await prisma.user.findUnique({
    where: { email_tenantId: { email: data.email, tenantId: data.tenantId } },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isPasswordValid = await comparePassword(data.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  return { user, token };
};