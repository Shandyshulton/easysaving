package transaction

import (
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Transaction struct {
	ID              string          `gorm:"type:uuid;primaryKey" json:"id"`
	UserID          string          `gorm:"type:uuid;not null;index" json:"user_id"`
	AccountID       string          `gorm:"type:uuid;not null;index" json:"account_id"`
	CategoryID      string          `gorm:"type:uuid;not null;index" json:"category_id"`
	Type            Type            `gorm:"size:20;not null;index" json:"type"`
	Amount          decimal.Decimal `gorm:"type:numeric(18,2);not null" json:"amount"`
	TransactionDate time.Time       `gorm:"type:date;not null;index" json:"transaction_date"`
	Notes           string          `gorm:"type:text" json:"notes"`

	// ScheduledTransactionID links a transaction back to the schedule that produced
	// it. NULL for manually created transactions. ON DELETE SET NULL on the database
	// side so deleting a schedule never removes transactions it already created.
	ScheduledTransactionID *string `gorm:"type:uuid;index;uniqueIndex:uq_transactions_schedule_due" json:"scheduled_transaction_id,omitempty"`
	// ScheduledDueDate is the occurrence date this transaction fulfils. Combined with
	// ScheduledTransactionID it forms the idempotency key for the scheduler, so a job
	// running twice for the same occurrence cannot insert a duplicate. It is kept
	// separate from TransactionDate because in remind mode the user may pay on a
	// different date than the due date.
	ScheduledDueDate *time.Time `gorm:"type:date;uniqueIndex:uq_transactions_schedule_due" json:"scheduled_due_date,omitempty"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (t Transaction) BalanceDelta() decimal.Decimal {
	if t.Type == TypeExpense {
		return t.Amount.Neg()
	}
	return t.Amount
}
