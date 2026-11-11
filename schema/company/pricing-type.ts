import z from 'zod';
import moment from 'moment-timezone';

const validTimezones = moment.tz.names();

export const companyPricingTypeBaseSchema = z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    status: z.string().optional(),
    companyId: z.string().optional(),
    domainId: z.string().optional(),
});

export const createCompanyPricingTypeSchema = companyPricingTypeBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CreateCompanyPricingTypeSchema = z.infer<typeof createCompanyPricingTypeSchema>;

export const updateCompanyPricingTypeSchema = companyPricingTypeBaseSchema.extend({
    pricingTypeId: z.string().min(1, 'Company Pricing Type Id is required'),
});

export type UpdateCompanyPricingTypeSchema = z.infer<typeof updateCompanyPricingTypeSchema>;
