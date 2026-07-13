package category

import "time"

type Type string

const (
	TypeIncome  Type = "income"
	TypeExpense Type = "expense"
)

type Category struct {
	ID        string    `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    *string   `gorm:"type:uuid;index" json:"user_id"`
	Name      string    `gorm:"size:120;not null" json:"name"`
	Type      Type      `gorm:"size:20;not null;index" json:"type"`
	Color     string    `gorm:"size:20;not null;default:'#10b981'" json:"color"`
	Icon      string    `gorm:"size:60;not null;default:'Circle'" json:"icon"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
