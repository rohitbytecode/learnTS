import { prisma } from '@/config/db';
import { hashPassword } from '@/utils/hash';

interface CreateUserData {
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'USER';
}

export const createUser = async (data: CreateUserData, tenantId: string) => {
  const randomPassword = Math.random().toString(36).slice(-8) + '123!';
  const hashedPassword = await hashPassword(randomPassword);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      tenantId,
    },
  });

  return { user, generatedPassword: randomPassword };
};

export const getUsers = async (tenantId: string) => {
  return prisma.user.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

export const getUserById = async (id: string, tenantId: string) => {
  return prisma.user.findFirst({
    where: {
      id,
      tenantId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

export const updateUser = async (id: string, data: Partial<CreateUserData>, tenantId: string) => {
  return prisma.user.update({
    where: {
      id,
      tenantId,
    },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

export const deleteUser = async (id: string, tenantId: string) => {
  return prisma.user.delete({
    where: {
      id,
      tenantId,
    },
  });
};
