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

export const scheduledSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    name: z.string().min(1, "Nama wajib diisi").max(120),
    // Kept as a plain string so AmountField can own the raw digits. Whether it is
    // required depends on the mode, which is checked in superRefine below.
    amount: z.string(),
    category_id: z.string().min(1, "Kategori wajib dipilih"),
    account_id: z.string().min(1, "Rekening wajib dipilih"),
    mode: z.enum(["auto", "remind"]),
    frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().min(1, "Minimal 1").max(365),
    start_date: z.string().min(1, "Tanggal mulai wajib diisi"),
    end_date: z.string(),
    remind_days_before: z.number().int().min(0, "Minimal 0").max(30, "Maksimal 30 hari"),
    notes: z.string()
  })
  .superRefine((value, ctx) => {
    if (value.mode === "auto" && !(Number(value.amount) > 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Nominal wajib diisi untuk mode Otomatis"
      });
    }
    if (value.amount && Number(value.amount) <= 0) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: "Nominal harus lebih besar dari 0" });
    }
    if (value.end_date && value.end_date < value.start_date) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "Tanggal berakhir tidak boleh sebelum tanggal mulai"
      });
    }
  });

export const markPaidSchema = z.object({
  amount: z.string().refine((v) => Number(v) > 0, "Nominal harus lebih besar dari 0"),
  transaction_date: z.string().min(1, "Tanggal wajib diisi")
});
