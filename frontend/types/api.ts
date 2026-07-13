export type ApiResponse<T> = { success: boolean; data: T; message?: string };

export type User = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: User };
export type LoginOTPResponse = { sent: boolean; email: string; expires_in: number };

export type Account = {
  id: string;
  account_name: string;
  category: "bank" | "wallet" | "cash" | "investment" | "other";
  initial_balance: string;
  current_balance: string;
  notes?: string;
};

export type Category = {
  id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  icon: string;
};

export type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: string;
  category_id: string;
  account_id: string;
  transaction_date: string;
  notes?: string;
};

export type CategoryTotal = {
  category_id: string;
  category_name: string;
  type: string;
  total: string;
  percentage: string;
  color: string;
};

export type DailyTotal = { date: string; income: string; expense: string };

export type Summary = {
  period: string;
  start_date: string;
  end_date: string;
  total_balance: string;
  total_income: string;
  total_expense: string;
  net_cashflow: string;
  category_totals: CategoryTotal[];
  daily_totals: DailyTotal[];
};
