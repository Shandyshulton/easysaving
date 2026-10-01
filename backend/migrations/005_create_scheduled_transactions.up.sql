-- Scheduled transactions (recurring + bill reminders).
--
-- NOTE: this project creates its schema through GORM AutoMigrate at boot
-- (see internal/config/database.go). AutoMigrate creates the columns and indexes
-- but NOT the foreign keys or CHECK constraints, so those are applied explicitly
-- from Go using the same constraint names used here. This file mirrors that state
-- for anyone who prefers running migrations manually.

CREATE TABLE IF NOT EXISTS scheduled_transactions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  account_id uuid NOT NULL,
  category_id uuid NOT NULL,
  type varchar(20) NOT NULL,
  name varchar(120) NOT NULL,
  amount numeric(18,2) NULL,
  mode varchar(20) NOT NULL DEFAULT 'auto',
  frequency varchar(20) NOT NULL,
  "interval" bigint NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NULL,
  next_due_date date NOT NULL,
  remind_days_before bigint NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NULL,
  updated_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_user_id ON scheduled_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_account_id ON scheduled_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_category_id ON scheduled_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_is_active ON scheduled_transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_next_due_date ON scheduled_transactions(next_due_date);

-- Foreign keys. Deleting an account removes its schedules (same as transactions).
ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS fk_scheduled_user;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT fk_scheduled_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS fk_scheduled_account;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT fk_scheduled_account
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS fk_scheduled_category;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT fk_scheduled_category
  FOREIGN KEY (category_id) REFERENCES categories(id);

-- Value constraints.
ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_type;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_type CHECK (type IN ('income', 'expense'));

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_mode;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_mode CHECK (mode IN ('auto', 'remind'));

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_frequency;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_frequency
  CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'));

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_interval;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_interval CHECK ("interval" >= 1);

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_amount_positive;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_amount_positive
  CHECK (amount IS NULL OR amount > 0);

-- Auto mode must always carry a concrete amount; remind mode may leave it NULL
-- because the real amount is entered when the bill is marked as paid.
ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_auto_amount;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_auto_amount
  CHECK (mode <> 'auto' OR amount IS NOT NULL);

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_remind_days;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_remind_days
  CHECK (remind_days_before BETWEEN 0 AND 30);

ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_date_range;
ALTER TABLE scheduled_transactions
  ADD CONSTRAINT chk_scheduled_date_range
  CHECK (end_date IS NULL OR end_date >= start_date);

-- Link generated transactions back to their schedule.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS scheduled_transaction_id uuid NULL;
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS scheduled_due_date date NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_scheduled_transaction_id
  ON transactions(scheduled_transaction_id);

-- Idempotency key for the scheduler: one transaction per schedule occurrence.
-- Both columns are NULL for manual transactions, and PostgreSQL treats NULLs as
-- distinct, so any number of manual transactions remain allowed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_schedule_due
  ON transactions(scheduled_transaction_id, scheduled_due_date);

-- ON DELETE SET NULL: deleting a schedule keeps the transactions it created.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_scheduled;
ALTER TABLE transactions
  ADD CONSTRAINT fk_transactions_scheduled
  FOREIGN KEY (scheduled_transaction_id)
  REFERENCES scheduled_transactions(id) ON DELETE SET NULL;

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive;
ALTER TABLE transactions
  ADD CONSTRAINT chk_transactions_amount_positive
  CHECK (amount > 0) NOT VALID;
