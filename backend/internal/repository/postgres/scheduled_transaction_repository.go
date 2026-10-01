package postgres

import (
	"context"
	"errors"
	"time"

	domainscheduled "easysaving/backend/internal/domain/scheduledtransaction"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ScheduledTransactionRepository struct{ db *gorm.DB }

func NewScheduledTransactionRepository(db *gorm.DB) *ScheduledTransactionRepository {
	return &ScheduledTransactionRepository{db: db}
}

func (r *ScheduledTransactionRepository) WithTx(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *ScheduledTransactionRepository) Create(ctx context.Context, item *domainscheduled.ScheduledTransaction) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *ScheduledTransactionRepository) Update(ctx context.Context, item *domainscheduled.ScheduledTransaction) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *ScheduledTransactionRepository) UpdateTx(ctx context.Context, tx *gorm.DB, item *domainscheduled.ScheduledTransaction) error {
	return tx.WithContext(ctx).Save(item).Error
}

func (r *ScheduledTransactionRepository) Delete(ctx context.Context, id, userID string) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND user_id = ?", id, userID).
		Delete(&domainscheduled.ScheduledTransaction{}).Error
}

func (r *ScheduledTransactionRepository) FindByID(ctx context.Context, id, userID string) (*domainscheduled.ScheduledTransaction, error) {
	var item domainscheduled.ScheduledTransaction
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *ScheduledTransactionRepository) List(ctx context.Context, filter domainscheduled.Filter) ([]domainscheduled.ScheduledTransaction, error) {
	var items []domainscheduled.ScheduledTransaction
	query := r.db.WithContext(ctx).Where("user_id = ?", filter.UserID)
	if filter.AccountID != "" {
		query = query.Where("account_id = ?", filter.AccountID)
	}
	if filter.Mode != "" {
		query = query.Where("mode = ?", filter.Mode)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	err := query.Order("next_due_date asc, created_at desc").Find(&items).Error
	return items, err
}

func (r *ScheduledTransactionRepository) CountByAccount(ctx context.Context, accountID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&domainscheduled.ScheduledTransaction{}).
		Where("account_id = ? AND user_id = ?", accountID, userID).
		Count(&count).Error
	return count, err
}

func (r *ScheduledTransactionRepository) DueIDs(ctx context.Context, userID string, due time.Time) ([]string, error) {
	var ids []string
	query := r.db.WithContext(ctx).
		Model(&domainscheduled.ScheduledTransaction{}).
		Where("is_active = ? AND next_due_date <= ?", true, due)
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	err := query.Order("next_due_date asc").Pluck("id", &ids).Error
	return ids, err
}

// LockForProcessing takes a row-level lock with SKIP LOCKED so that a second
// runner (another instance or an overlapping manual trigger) simply moves on
// instead of processing the same schedule twice. A nil schedule with a nil error
// means "someone else is handling it".
func (r *ScheduledTransactionRepository) LockForProcessing(ctx context.Context, tx *gorm.DB, id string) (*domainscheduled.ScheduledTransaction, error) {
	var item domainscheduled.ScheduledTransaction
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
		Where("id = ?", id).
		First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

// LockByID waits for the row lock (plain FOR UPDATE), so a user-initiated action
// never silently does nothing just because the scheduler happens to hold the row.
func (r *ScheduledTransactionRepository) LockByID(ctx context.Context, tx *gorm.DB, id, userID string) (*domainscheduled.ScheduledTransaction, error) {
	var item domainscheduled.ScheduledTransaction
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND user_id = ?", id, userID).
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}
