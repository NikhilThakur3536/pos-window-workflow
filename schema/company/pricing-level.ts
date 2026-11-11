import z from 'zod';

export const createCompanyPricingLevelSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    timezone: z.string().min(1, { message: 'Timezone is required' }),
    status: z.string().optional(),
    enable: z.coerce.boolean().default(false),
});

export type CreateCompanyPricingLevelSchema = z.infer<typeof createCompanyPricingLevelSchema>;
