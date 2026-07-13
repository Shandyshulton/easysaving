CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  name varchar(120) NOT NULL,
  email varchar(180) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_name varchar(120) NOT NULL,
  category varchar(80) NOT NULL DEFAULT 'bank',
  initial_balance numeric(18,2) NOT NULL,
  current_balance numeric(18,2) NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY,
  user_id uuid NULL REFERENCES users(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  type varchar(20) NOT NULL CHECK (type IN ('income', 'expense')),
  color varchar(20) NOT NULL DEFAULT '#10b981',
  icon varchar(60) NOT NULL DEFAULT 'Circle',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id),
  type varchar(20) NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  transaction_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_report ON transactions(user_id, transaction_date, type, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(user_id, account_id);
