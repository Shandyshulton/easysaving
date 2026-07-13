import { api } from "@/services/api/client";
import type { Account, AuthResponse, Category, LoginOTPResponse, Summary, Transaction, User } from "@/types/api";

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
    api<Summary>(`/dashboard/summary?period=${period}&date=${date}${accountId ? `&account_id=${accountId}` : ""}`)
};
