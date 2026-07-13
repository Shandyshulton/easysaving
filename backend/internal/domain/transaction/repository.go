package transaction

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Filter struct {
	UserID     string
	Type       string
	CategoryID string
	AccountID  string
	StartDate  *time.Time
	EndDate    *time.Time
	Limit      int
}

type CategoryTotal struct {
	CategoryID   string          `json:"category_id"`
	CategoryName string          `json:"category_name"`
	Type         string          `json:"type"`
	Total        decimal.Decimal `json:"total"`
	Percentage   decimal.Decimal `json:"percentage"`
	Color        string          `json:"color"`
}

type DailyTotal struct {
	Date    string          `json:"date"`
	Income  decimal.Decimal `json:"income"`
	Expense decimal.Decimal `json:"expense"`
}

type Repository interface {
	CreateTx(ctx context.Context, db *gorm.DB, item *Transaction) error
	UpdateTx(ctx context.Context, db *gorm.DB, item *Transaction) error
	DeleteTx(ctx context.Context, db *gorm.DB, item *Transaction) error
	FindByID(ctx context.Context, id, userID string) (*Transaction, error)
	List(ctx context.Context, filter Filter) ([]Transaction, error)
	SumByType(ctx context.Context, userID, accountID string, startDate, endDate time.Time, transactionType Type) (decimal.Decimal, error)
	CategoryTotals(ctx context.Context, userID, accountID string, startDate, endDate time.Time, transactionType Type) ([]CategoryTotal, error)
	DailyTotals(ctx context.Context, userID, accountID string, startDate, endDate time.Time) ([]DailyTotal, error)
	WithTx(ctx context.Context, fn func(tx *gorm.DB) error) error
}
