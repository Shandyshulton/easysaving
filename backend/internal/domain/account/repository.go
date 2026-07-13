package account

import (
	"context"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type Repository interface {
	Create(ctx context.Context, item *Account) error
	ListByUser(ctx context.Context, userID string) ([]Account, error)
	FindByID(ctx context.Context, id, userID string) (*Account, error)
	Update(ctx context.Context, item *Account) error
	Delete(ctx context.Context, id, userID string) error
	AdjustBalance(ctx context.Context, db *gorm.DB, id, userID string, delta decimal.Decimal) error
}
