import { z } from "zod";

export const registerOrganizationSchema = z.object({
  orgName: z.string().min(1, "Organization name is required").min(3, "Organization name must be at least 3 characters"),
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  tenantId: z.string().uuid("Invalid tenant ID"),
});

export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
