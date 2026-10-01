-- Schema verification for the scheduled-transactions feature.
--
-- Run after the backend has booted at least once (AutoMigrate + explicit
-- constraints in internal/config/database.go):
--
--   docker exec -i easysaving-postgres psql -U postgres -d easysaving \
--     -f /dev/stdin < backend/scripts/verify_scheduled_schema.sql
--
-- Or, from a psql session:  \i backend/scripts/verify_scheduled_schema.sql
--
-- Every check prints PASS or FAIL. The final section proves that the unique
-- index does not block ordinary manual transactions.

\echo '=== 1. Columns on transactions ==='
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('scheduled_transaction_id', 'scheduled_due_date')
ORDER BY column_name;

\echo ''
\echo '=== 2. Unique index (scheduled_transaction_id, scheduled_due_date) ==='
SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  COALESCE(MAX(indexdef), '(missing)') AS definition
FROM pg_indexes
WHERE tablename = 'transactions'
  AND indexname = 'uq_transactions_schedule_due';

\echo ''
\echo '=== 3. FK transactions.scheduled_transaction_id must be ON DELETE SET NULL ==='
SELECT
  CASE WHEN rc.delete_rule = 'SET NULL' THEN 'PASS' ELSE 'FAIL: ' || rc.delete_rule END AS result,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'transactions'
  AND tc.constraint_name = 'fk_transactions_scheduled';

\echo ''
\echo '=== 4. FK scheduled_transactions.account_id must be ON DELETE CASCADE ==='
SELECT
  CASE WHEN rc.delete_rule = 'CASCADE' THEN 'PASS' ELSE 'FAIL: ' || rc.delete_rule END AS result,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'scheduled_transactions'
  AND tc.constraint_name = 'fk_scheduled_account';

\echo ''
\echo '=== 5. CHECK constraints on scheduled_transactions ==='
SELECT
  conname,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'scheduled_transactions'::regclass
  AND contype = 'c'
ORDER BY conname;

\echo ''
\echo '=== 6. The auto-mode amount CHECK must exist ==='
SELECT
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_constraint
WHERE conrelid = 'scheduled_transactions'::regclass
  AND conname = 'chk_scheduled_auto_amount';

\echo ''
\echo '=== 7. Behavioural test: NULLs must not block manual transactions ==='
-- Two manual transactions (both with NULL schedule columns) must coexist. In
-- PostgreSQL, NULLs are distinct for unique indexes, so this is expected to pass.
DO $$
DECLARE
  v_user uuid;
  v_account uuid;
  v_category uuid;
  v_a uuid := gen_random_uuid();
  v_b uuid := gen_random_uuid();
BEGIN
  SELECT id INTO v_user FROM users LIMIT 1;
  SELECT id INTO v_account FROM accounts WHERE user_id = v_user LIMIT 1;
  SELECT id INTO v_category FROM categories
    WHERE (user_id = v_user OR user_id IS NULL) AND type = 'expense' LIMIT 1;

  IF v_user IS NULL OR v_account IS NULL OR v_category IS NULL THEN
    RAISE NOTICE 'SKIP: needs at least one user with an account and an expense category';
    RETURN;
  END IF;

  INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, transaction_date, notes, created_at, updated_at)
  VALUES (v_a, v_user, v_account, v_category, 'expense', 1000, CURRENT_DATE, '__schema_check_a', now(), now());

  INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, transaction_date, notes, created_at, updated_at)
  VALUES (v_b, v_user, v_account, v_category, 'expense', 2000, CURRENT_DATE, '__schema_check_b', now(), now());

  RAISE NOTICE 'PASS: two manual transactions with NULL schedule columns inserted';

  DELETE FROM transactions WHERE id IN (v_a, v_b);
  RAISE NOTICE 'cleanup done';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'FAIL: unique index blocked a manual transaction (%).', SQLERRM;
  DELETE FROM transactions WHERE id IN (v_a, v_b);
END $$;

\echo ''
\echo '=== 8. Behavioural test: duplicate occurrence must be rejected ==='
-- Inserting the same (scheduled_transaction_id, scheduled_due_date) twice must
-- raise unique_violation. This is the idempotency guarantee the scheduler relies on.
DO $$
DECLARE
  v_user uuid;
  v_account uuid;
  v_category uuid;
  v_schedule uuid := gen_random_uuid();
  v_due date := CURRENT_DATE;
BEGIN
  SELECT id INTO v_user FROM users LIMIT 1;
  SELECT id INTO v_account FROM accounts WHERE user_id = v_user LIMIT 1;
  SELECT id INTO v_category FROM categories
    WHERE (user_id = v_user OR user_id IS NULL) AND type = 'expense' LIMIT 1;

  IF v_user IS NULL OR v_account IS NULL OR v_category IS NULL THEN
    RAISE NOTICE 'SKIP: needs seed data';
    RETURN;
  END IF;

  INSERT INTO scheduled_transactions
    (id, user_id, account_id, category_id, type, name, amount, mode, frequency, "interval",
     start_date, next_due_date, remind_days_before, is_active, created_at, updated_at)
  VALUES
    (v_schedule, v_user, v_account, v_category, 'expense', '__schema_check', 5000, 'auto', 'monthly', 1,
     v_due, v_due, 3, true, now(), now());

  INSERT INTO transactions
    (id, user_id, account_id, category_id, type, amount, transaction_date, notes,
     scheduled_transaction_id, scheduled_due_date, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_user, v_account, v_category, 'expense', 5000, v_due, '__schema_check',
     v_schedule, v_due, now(), now());

  BEGIN
    INSERT INTO transactions
      (id, user_id, account_id, category_id, type, amount, transaction_date, notes,
       scheduled_transaction_id, scheduled_due_date, created_at, updated_at)
    VALUES
      (gen_random_uuid(), v_user, v_account, v_category, 'expense', 5000, v_due, '__schema_check_dup',
       v_schedule, v_due, now(), now());
    RAISE NOTICE 'FAIL: duplicate occurrence was accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: duplicate occurrence rejected by uq_transactions_schedule_due';
  END;

  -- Deleting the schedule must keep the transaction but null out the link.
  DELETE FROM scheduled_transactions WHERE id = v_schedule;
  IF EXISTS (SELECT 1 FROM transactions WHERE notes = '__schema_check' AND scheduled_transaction_id IS NULL) THEN
    RAISE NOTICE 'PASS: ON DELETE SET NULL kept the transaction and cleared the link';
  ELSE
    RAISE NOTICE 'FAIL: transaction was removed or link not cleared';
  END IF;

  DELETE FROM transactions WHERE notes IN ('__schema_check', '__schema_check_dup');
  RAISE NOTICE 'cleanup done';
END $$;

\echo ''
\echo '=== 9. Behavioural test: auto mode without amount must be rejected ==='
DO $$
DECLARE
  v_user uuid;
  v_account uuid;
  v_category uuid;
BEGIN
  SELECT id INTO v_user FROM users LIMIT 1;
  SELECT id INTO v_account FROM accounts WHERE user_id = v_user LIMIT 1;
  SELECT id INTO v_category FROM categories
    WHERE (user_id = v_user OR user_id IS NULL) AND type = 'expense' LIMIT 1;

  IF v_user IS NULL OR v_account IS NULL OR v_category IS NULL THEN
    RAISE NOTICE 'SKIP: needs seed data';
    RETURN;
  END IF;

  BEGIN
    INSERT INTO scheduled_transactions
      (id, user_id, account_id, category_id, type, name, amount, mode, frequency, "interval",
       start_date, next_due_date, remind_days_before, is_active, created_at, updated_at)
    VALUES
      (gen_random_uuid(), v_user, v_account, v_category, 'expense', '__schema_check_noamount', NULL,
       'auto', 'monthly', 1, CURRENT_DATE, CURRENT_DATE, 3, true, now(), now());
    RAISE NOTICE 'FAIL: auto mode without amount was accepted';
    DELETE FROM scheduled_transactions WHERE name = '__schema_check_noamount';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: auto mode without amount rejected by chk_scheduled_auto_amount';
  END;
END $$;

\echo ''
\echo '=== Done ==='
