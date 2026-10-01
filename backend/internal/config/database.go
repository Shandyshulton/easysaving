package config

import (
	"easysaving/backend/internal/domain/account"
	"easysaving/backend/internal/domain/category"
	"easysaving/backend/internal/domain/passwordreset"
	"easysaving/backend/internal/domain/scheduledtransaction"
	"easysaving/backend/internal/domain/transaction"
	"easysaving/backend/internal/domain/user"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func OpenPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}

// schemaConstraints holds the DDL that GORM's AutoMigrate does not create from
// struct tags: foreign keys and CHECK constraints. Verified against a live
// database with `\d scheduled_transactions` — AutoMigrate produced the columns and
// indexes but none of the constraints below, so they are applied explicitly.
//
// Every statement is idempotent (DROP IF EXISTS followed by ADD) so it is safe to
// run on every boot.
var schemaConstraints = []string{
	// --- transactions -> scheduled_transactions -------------------------------
	// ON DELETE SET NULL: removing a schedule must never delete the transactions it
	// already created (business rule #7).
	`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_scheduled`,
	`ALTER TABLE transactions
		ADD CONSTRAINT fk_transactions_scheduled
		FOREIGN KEY (scheduled_transaction_id)
		REFERENCES scheduled_transactions(id) ON DELETE SET NULL`,

	// Amounts are always positive. NOT VALID keeps boot safe on databases that may
	// already contain legacy rows; the rule still applies to every new/updated row.
	`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS chk_transactions_amount_positive`,
	`ALTER TABLE transactions
		ADD CONSTRAINT chk_transactions_amount_positive
		CHECK (amount > 0) NOT VALID`,

	// --- scheduled_transactions foreign keys ----------------------------------
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS fk_scheduled_user`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT fk_scheduled_user
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,

	// CASCADE mirrors the existing behaviour of transactions: deleting an account
	// removes the schedules that belong to it (business rule #8).
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS fk_scheduled_account`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT fk_scheduled_account
		FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE`,

	// Categories are shared/system rows, so deletion is restricted rather than
	// cascaded, matching the transactions table.
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS fk_scheduled_category`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT fk_scheduled_category
		FOREIGN KEY (category_id) REFERENCES categories(id)`,

	// --- scheduled_transactions value constraints -----------------------------
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_type`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_type CHECK (type IN ('income', 'expense'))`,

	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_mode`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_mode CHECK (mode IN ('auto', 'remind'))`,

	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_frequency`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_frequency
		CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly'))`,

	// "interval" is a reserved word in PostgreSQL and must stay quoted.
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_interval`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_interval CHECK ("interval" >= 1)`,

	// A stored amount is either absent (remind estimate) or strictly positive.
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_amount_positive`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_amount_positive
		CHECK (amount IS NULL OR amount > 0)`,

	// Auto mode cannot exist without a concrete amount; remind mode may.
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_auto_amount`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_auto_amount
		CHECK (mode <> 'auto' OR amount IS NOT NULL)`,

	// Reminder lead time is capped at 30 days.
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_remind_days`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_remind_days
		CHECK (remind_days_before BETWEEN 0 AND 30)`,

	// end_date, when present, cannot precede start_date.
	`ALTER TABLE scheduled_transactions DROP CONSTRAINT IF EXISTS chk_scheduled_date_range`,
	`ALTER TABLE scheduled_transactions
		ADD CONSTRAINT chk_scheduled_date_range
		CHECK (end_date IS NULL OR end_date >= start_date)`,
}

func AutoMigrate(db *gorm.DB) error {
	if err := db.AutoMigrate(
		&user.User{},
		&account.Account{},
		&category.Category{},
		&scheduledtransaction.ScheduledTransaction{},
		&transaction.Transaction{},
		&passwordreset.PasswordResetOTP{},
	); err != nil {
		return err
	}
	for _, statement := range schemaConstraints {
		if err := db.Exec(statement).Error; err != nil {
			return err
		}
	}
	return nil
}
