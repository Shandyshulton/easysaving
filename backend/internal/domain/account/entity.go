package account

import (
	"time"

	"github.com/shopspring/decimal"
)

type Account struct {
	ID             string          `gorm:"type:uuid;primaryKey" json:"id"`
	UserID         string          `gorm:"type:uuid;not null;index" json:"user_id"`
	AccountName    string          `gorm:"size:120;not null" json:"account_name"`
	Category       string          `gorm:"size:80;not null;default:'bank'" json:"category"`
	InitialBalance decimal.Decimal `gorm:"type:numeric(18,2);not null" json:"initial_balance"`
	CurrentBalance decimal.Decimal `gorm:"type:numeric(18,2);not null" json:"current_balance"`
	Notes          string          `gorm:"type:text" json:"notes"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}
