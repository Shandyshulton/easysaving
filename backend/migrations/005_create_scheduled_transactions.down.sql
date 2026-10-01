DROP INDEX IF EXISTS uq_transactions_schedule_due;
DROP INDEX IF EXISTS idx_transactions_schedule;
ALTER TABLE transactions DROP COLUMN IF EXISTS scheduled_due_date;
ALTER TABLE transactions DROP COLUMN IF EXISTS scheduled_transaction_id;
DROP TABLE IF EXISTS scheduled_transactions;
