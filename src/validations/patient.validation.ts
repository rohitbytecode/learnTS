import { z } from "zod";

export const createPatientSchema = z.object({
  name: z.string().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format").optional(),
  phone: z.string().optional(),
  age: z.number().int().min(0, "Age must be a positive number").optional(),
  medicalHistory: z.string().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
