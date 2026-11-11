import z from 'zod';

export const loginSchema = z.object({
    // email: z.email(),
    staffNumber: z.number(),
    password: z.string().min(1, 'Invalid Password'),
    deviceType: z.string().optional(),
    domainId: z.string().min(1, 'Domain is required'),
});

export type LoginSchema = z.infer<typeof loginSchema>;
