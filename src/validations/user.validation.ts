import { z } from "zod";

const roleEnum = z.enum(["ADMIN", "MANAGER", "USER"]);

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  role: roleEnum,
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
