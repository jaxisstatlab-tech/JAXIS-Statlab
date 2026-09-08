import { z } from "zod";
import type { RoleName } from "@prisma/client";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterClientSchema = z
  .object({
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(50, "First name must not exceed 50 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(50, "Last name must not exceed 50 characters"),
    email: z.string().email("Invalid institutional email address format"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterClientInput = z.infer<typeof RegisterClientSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Password recovery token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ROLE_HOME: Record<RoleName, string> = {
  CLIENT: "/dashboard/client",
  STATISTICIAN: "/dashboard/statistician",
  SENIOR_QA_LEAD: "/dashboard/qa",
  ADMIN: "/dashboard/admin",
  FINANCE_OFFICER: "/dashboard/finance",
  CEO: "/dashboard/ceo",
};

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };
