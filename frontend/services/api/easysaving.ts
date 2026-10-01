import { api } from "@/services/api/client";
import type {
  Account,
  AuthResponse,
  Category,
  LoginOTPResponse,
  ScheduledRunResult,
  ScheduledTransaction,
  SchedulePreview,
  Summary,
  Transaction,
  User
} from "@/types/api";

/** Payload shared by create, update, and preview of a schedule. */
export type ScheduledPayload = {
  type: "income" | "expense";
  name: string;
  amount: string;
  category_id: string;
  account_id: string;
  mode: "auto" | "remind";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  start_date: string;
  end_date?: string;
  remind_days_before?: number;
  notes?: string;
  is_active?: boolean;
};

export const endpoints = {
  register: (payload: { name: string; email: string; password: string }) =>
    api<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    api<LoginOTPResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  verifyLoginOTP: (payload: { email: string; otp: string }) =>
    api<AuthResponse>("/auth/login/verify", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (payload: { email: string }) =>
    api<{ sent: boolean }>("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  resetPassword: (payload: { email: string; otp: string; new_password: string }) =>
    api<{ reset: boolean }>("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  profile: () => api<User>("/profile"),
  updateProfile: (payload: { name: string }) =>
    api<User>("/profile", { method: "PUT", body: JSON.stringify(payload) }),
  updatePassword: (payload: { current_password: string; new_password: string }) =>
    api<{ updated: boolean }>("/profile/password", { method: "PUT", body: JSON.stringify(payload) }),
  accounts: () => api<Account[]>("/accounts"),
  createAccount: (payload: { account_name: string; category: string; initial_balance: string; notes?: string }) =>
    api<Account>("/accounts", { method: "POST", body: JSON.stringify(payload) }),
  updateAccount: (id: string, payload: { account_name: string; category: string; current_balance: string; notes?: string }) =>
    api<Account>(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteAccount: (id: string) => api<{ deleted: boolean }>(`/accounts/${id}`, { method: "DELETE" }),
  categories: (type?: string) => api<Category[]>(`/categories${type ? `?type=${type}` : ""}`),
  transactions: (query = "") => api<Transaction[]>(`/transactions${query}`),
  createTransaction: (payload: Omit<Transaction, "id">) =>
    api<Transaction>("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  updateTransaction: (id: string, payload: Omit<Transaction, "id">) =>
    api<Transaction>(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTransaction: (id: string) => api<{ deleted: boolean }>(`/transactions/${id}`, { method: "DELETE" }),
  summary: (period: string, date: string, accountId = "") =>
    api<Summary>(`/dashboard/summary?period=${period}&date=${date}${accountId ? `&account_id=${accountId}` : ""}`),

  // --- Scheduled transactions -------------------------------------------
  scheduled: (query = "") => api<ScheduledTransaction[]>(`/scheduled${query}`),
  scheduledById: (id: string) => api<ScheduledTransaction>(`/scheduled/${id}`),
  createScheduled: (payload: ScheduledPayload) =>
    api<ScheduledTransaction>("/scheduled", { method: "POST", body: JSON.stringify(payload) }),
  updateScheduled: (id: string, payload: ScheduledPayload) =>
    api<ScheduledTransaction>(`/scheduled/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteScheduled: (id: string) => api<{ deleted: boolean }>(`/scheduled/${id}`, { method: "DELETE" }),
  toggleScheduled: (id: string, isActive: boolean) =>
    api<ScheduledTransaction>(`/scheduled/${id}/active`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) }),
  previewScheduled: (payload: ScheduledPayload) =>
    api<SchedulePreview>("/scheduled/preview", { method: "POST", body: JSON.stringify(payload) }),
  payScheduled: (id: string, payload: { amount: string; transaction_date?: string; notes?: string }) =>
    api<Transaction>(`/scheduled/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
  skipScheduled: (id: string) =>
    api<ScheduledTransaction>(`/scheduled/${id}/skip`, { method: "POST" }),
  runScheduled: () => api<ScheduledRunResult>("/scheduled/run", { method: "POST" })
};
