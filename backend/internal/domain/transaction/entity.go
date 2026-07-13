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
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
	DeletedAt       gorm.DeletedAt  `gorm:"index" json:"-"`
}

func (t Transaction) BalanceDelta() decimal.Decimal {
	if t.Type == TypeExpense {
		return t.Amount.Neg()
	}
	return t.Amount
}
