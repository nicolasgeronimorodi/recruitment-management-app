import {z} from 'zod';

export const loginSchema = z.object({
    email: z
    .string()
    .min(1, 'email is required')
    .email('Enter a valid email address'),
    password: z.string().min(1, 'password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

