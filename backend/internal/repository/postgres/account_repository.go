package postgres

import (
	"context"

	"easysaving/backend/internal/domain/account"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type AccountRepository struct{ db *gorm.DB }

func NewAccountRepository(db *gorm.DB) *AccountRepository { return &AccountRepository{db: db} }

func (r *AccountRepository) Create(ctx context.Context, item *account.Account) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *AccountRepository) ListByUser(ctx context.Context, userID string) ([]account.Account, error) {
	var items []account.Account
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at desc").Find(&items).Error
	return items, err
}

func (r *AccountRepository) FindByID(ctx context.Context, id, userID string) (*account.Account, error) {
	var item account.Account
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&item).Error
	return &item, err
}

func (r *AccountRepository) Update(ctx context.Context, item *account.Account) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *AccountRepository) Delete(ctx context.Context, id, userID string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM transactions WHERE account_id = ? AND user_id = ?", id, userID).Error; err != nil {
			return err
		}
		return tx.Where("id = ? AND user_id = ?", id, userID).Delete(&account.Account{}).Error
	})
}

func (r *AccountRepository) AdjustBalance(ctx context.Context, db *gorm.DB, id, userID string, delta decimal.Decimal) error {
	return db.WithContext(ctx).
		Model(&account.Account{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("current_balance", gorm.Expr("current_balance + ?", delta)).
		Error
}

func (r *AccountRepository) SumBalance(ctx context.Context, userID string) (decimal.Decimal, error) {
	type row struct{ Total decimal.Decimal }
	var result row
	err := r.db.WithContext(ctx).Model(&account.Account{}).
		Select("COALESCE(SUM(current_balance), 0) AS total").
		Where("user_id = ?", userID).
		Scan(&result).Error
	return result.Total, err
}
