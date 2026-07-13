package dto

import (
	"easysaving/backend/internal/domain/transaction"

	"github.com/shopspring/decimal"
)

type SummaryResponse struct {
	Period          string                      `json:"period"`
	StartDate       string                      `json:"start_date"`
	EndDate         string                      `json:"end_date"`
	TotalBalance    decimal.Decimal             `json:"total_balance"`
	TotalIncome     decimal.Decimal             `json:"total_income"`
	TotalExpense    decimal.Decimal             `json:"total_expense"`
	NetCashflow     decimal.Decimal             `json:"net_cashflow"`
	CategoryTotals  []transaction.CategoryTotal `json:"category_totals"`
	DailyTotals     []transaction.DailyTotal    `json:"daily_totals"`
	RecentLimitHint int                         `json:"recent_limit_hint"`
}
