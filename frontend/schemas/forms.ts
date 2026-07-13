import { z } from "zod";

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2).max(120)
});

export const forgotPasswordSchema = z.object({
  email: z.email()
});

export const loginOTPSchema = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/, "OTP harus 6 digit")
});

export const resetPasswordSchema = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/, "OTP harus 6 digit"),
  new_password: z.string().min(8, "Password minimal 8 karakter")
});

export const accountSchema = z.object({
  account_name: z.string().min(2).max(120),
  category: z.enum(["bank", "wallet", "cash", "investment", "other"]),
  initial_balance: z.string().refine((v) => Number(v) > 0, "Saldo harus lebih besar dari 0"),
  notes: z.string().optional()
});

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().refine((v) => Number(v) > 0, "Nominal harus lebih besar dari 0"),
  category_id: z.string().min(1),
  account_id: z.string().min(1),
  transaction_date: z.string().min(1),
  notes: z.string().optional()
});
