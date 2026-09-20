import { z } from "zod";

// Nigerian phone numbers: +234XXXXXXXXXX or 0XXXXXXXXXX (11 digits local).
const NG_PHONE_REGEX = /^(\+234[789]\d{9}|0[789]\d{9})$/;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is too short").max(120),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters")
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z
      .string()
      .trim()
      .regex(NG_PHONE_REGEX, "Enter a valid Nigerian phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const socialAccountSchema = z.object({
  platform: z.enum(["INSTAGRAM", "FACEBOOK", "TIKTOK", "X", "YOUTUBE", "OTHER"]),
  handle: z.string().trim().min(1, "Handle is required").max(60),
  profileUrl: z.string().trim().url("Enter a valid URL").optional().or(z.literal("")),
});

export type SocialAccountInput = z.infer<typeof socialAccountSchema>;

/**
 * Flattens a ZodError into { fieldName: message } for easy form rendering.
 * Only the first error per field is kept — enough for inline validation UI.
 */
export function flattenZodError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
