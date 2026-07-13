package postgres

import (
	"context"
	"time"

	"easysaving/backend/internal/domain/category"
	domaintransaction "easysaving/backend/internal/domain/transaction"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type TransactionRepository struct{ db *gorm.DB }

func NewTransactionRepository(db *gorm.DB) *TransactionRepository {
	return &TransactionRepository{db: db}
}

func (r *TransactionRepository) WithTx(ctx context.Context, fn func(tx *gorm.DB) error) error {
	return r.db.WithContext(ctx).Transaction(fn)
}

func (r *TransactionRepository) CreateTx(ctx context.Context, db *gorm.DB, item *domaintransaction.Transaction) error {
	return db.WithContext(ctx).Create(item).Error
}

func (r *TransactionRepository) UpdateTx(ctx context.Context, db *gorm.DB, item *domaintransaction.Transaction) error {
	return db.WithContext(ctx).Save(item).Error
}

func (r *TransactionRepository) DeleteTx(ctx context.Context, db *gorm.DB, item *domaintransaction.Transaction) error {
	return db.WithContext(ctx).Delete(item).Error
}

func (r *TransactionRepository) FindByID(ctx context.Context, id, userID string) (*domaintransaction.Transaction, error) {
	var item domaintransaction.Transaction
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&item).Error
	return &item, err
}

func (r *TransactionRepository) List(ctx context.Context, filter domaintransaction.Filter) ([]domaintransaction.Transaction, error) {
	var items []domaintransaction.Transaction
	query := r.db.WithContext(ctx).Where("user_id = ?", filter.UserID)
	if filter.Type != "" {
		query = query.Where("type = ?", filter.Type)
	}
	if filter.CategoryID != "" {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if filter.AccountID != "" {
		query = query.Where("account_id = ?", filter.AccountID)
	}
	if filter.StartDate != nil {
		query = query.Where("transaction_date >= ?", *filter.StartDate)
	}
	if filter.EndDate != nil {
		query = query.Where("transaction_date <= ?", *filter.EndDate)
	}
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	err := query.Order("transaction_date desc, created_at desc").Find(&items).Error
	return items, err
}

func (r *TransactionRepository) SumByType(ctx context.Context, userID, accountID string, startDate, endDate time.Time, transactionType domaintransaction.Type) (decimal.Decimal, error) {
	type row struct{ Total decimal.Decimal }
	var result row
	query := r.db.WithContext(ctx).Model(&domaintransaction.Transaction{}).
		Select("COALESCE(SUM(amount), 0) AS total").
		Where("user_id = ? AND type = ? AND transaction_date BETWEEN ? AND ?", userID, transactionType, startDate, endDate)
	if accountID != "" {
		query = query.Where("account_id = ?", accountID)
	}
	err := query.Scan(&result).Error
	return result.Total, err
}

func (r *TransactionRepository) CategoryTotals(ctx context.Context, userID, accountID string, startDate, endDate time.Time, transactionType domaintransaction.Type) ([]domaintransaction.CategoryTotal, error) {
	var rows []domaintransaction.CategoryTotal
	query := r.db.WithContext(ctx).Table("transactions").
		Select("categories.id AS category_id, categories.name AS category_name, transactions.type, COALESCE(SUM(transactions.amount), 0) AS total, categories.color").
		Joins("JOIN categories ON categories.id = transactions.category_id").
		Where("transactions.user_id = ? AND transactions.type = ? AND transactions.deleted_at IS NULL AND transactions.transaction_date BETWEEN ? AND ?", userID, transactionType, startDate, endDate)
	if accountID != "" {
		query = query.Where("transactions.account_id = ?", accountID)
	}
	err := query.Group("categories.id, categories.name, categories.color, transactions.type").
		Order("total desc").Scan(&rows).Error
	if err != nil {
		return nil, err
	}
	var total decimal.Decimal
	for _, item := range rows {
		total = total.Add(item.Total)
	}
	for i := range rows {
		if total.GreaterThan(decimal.Zero) {
			rows[i].Percentage = rows[i].Total.Div(total).Mul(decimal.NewFromInt(100)).Round(2)
		}
	}
	_ = category.TypeIncome
	return rows, nil
}

func (r *TransactionRepository) DailyTotals(ctx context.Context, userID, accountID string, startDate, endDate time.Time) ([]domaintransaction.DailyTotal, error) {
	var rows []domaintransaction.DailyTotal
	query := r.db.WithContext(ctx).Table("transactions").
		Select("to_char(transaction_date, 'YYYY-MM-DD') AS date, COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income, COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense").
		Where("user_id = ? AND deleted_at IS NULL AND transaction_date BETWEEN ? AND ?", userID, startDate, endDate)
	if accountID != "" {
		query = query.Where("account_id = ?", accountID)
	}
	err := query.Group("transaction_date").Order("transaction_date asc").Scan(&rows).Error
	return rows, err
}
