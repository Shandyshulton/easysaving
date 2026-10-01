package scheduledtransaction

import (
	"context"
	"time"

	"gorm.io/gorm"
)

// Filter narrows down a schedule listing.
type Filter struct {
	UserID    string
	AccountID string
	Mode      string
	IsActive  *bool
}

type Repository interface {
	Create(ctx context.Context, item *ScheduledTransaction) error
	Update(ctx context.Context, item *ScheduledTransaction) error
	Delete(ctx context.Context, id, userID string) error
	FindByID(ctx context.Context, id, userID string) (*ScheduledTransaction, error)
	List(ctx context.Context, filter Filter) ([]ScheduledTransaction, error)

	// CountByAccount reports how many schedules belong to an account. Used to warn
	// the user before deleting an account (schedules cascade with it).
	CountByAccount(ctx context.Context, accountID, userID string) (int64, error)

	// DueIDs returns ids of active schedules whose next_due_date is on or before
	// the given date. When userID is empty every user is considered.
	DueIDs(ctx context.Context, userID string, due time.Time) ([]string, error)

	// LockForProcessing loads a schedule inside the given transaction using
	// SELECT ... FOR UPDATE SKIP LOCKED so concurrent runners never process the
	// same schedule twice. Returns nil when the row is already locked elsewhere.
	LockForProcessing(ctx context.Context, tx *gorm.DB, id string) (*ScheduledTransaction, error)

	// LockByID loads a schedule inside the given transaction with a plain
	// SELECT ... FOR UPDATE. Unlike LockForProcessing it waits for the lock instead
	// of skipping, which is what user-initiated actions (mark paid, skip period)
	// need so they cannot race the background job.
	LockByID(ctx context.Context, tx *gorm.DB, id, userID string) (*ScheduledTransaction, error)

	// UpdateTx persists a schedule inside an existing transaction.
	UpdateTx(ctx context.Context, tx *gorm.DB, item *ScheduledTransaction) error

	// WithTx runs fn inside a database transaction.
	WithTx(ctx context.Context, fn func(tx *gorm.DB) error) error
}
