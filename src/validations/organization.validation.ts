import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .min(3, 'Organization name must be at least 3 characters'),
  description: z.string().optional(),
  website: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
