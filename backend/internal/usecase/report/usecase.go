package report

import (
	"context"
	"time"

	domainaccount "easysaving/backend/internal/domain/account"
	domaintransaction "easysaving/backend/internal/domain/transaction"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/daterange"

	"github.com/shopspring/decimal"
)

type balanceSummer interface {
	SumBalance(ctx context.Context, userID string) (decimal.Decimal, error)
}

type Usecase struct {
	transactions domaintransaction.Repository
	accounts     domainaccount.Repository
}

func New(transactions domaintransaction.Repository, accounts domainaccount.Repository) *Usecase {
	return &Usecase{transactions: transactions, accounts: accounts}
}

func (u *Usecase) Summary(ctx context.Context, userID, period, date, accountID string) (*dto.SummaryResponse, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	start, end, normalized, err := daterange.ForPeriod(period, date)
	if err != nil {
		return nil, err
	}
	if accountID != "" {
		if _, err := u.accounts.FindByID(ctx, accountID, userID); err != nil {
			return nil, err
		}
	}
	income, err := u.transactions.SumByType(ctx, userID, accountID, start, end, domaintransaction.TypeIncome)
	if err != nil {
		return nil, err
	}
	expense, err := u.transactions.SumByType(ctx, userID, accountID, start, end, domaintransaction.TypeExpense)
	if err != nil {
		return nil, err
	}
	categories, err := u.transactions.CategoryTotals(ctx, userID, accountID, start, end, domaintransaction.TypeExpense)
	if err != nil {
		return nil, err
	}
	daily, err := u.transactions.DailyTotals(ctx, userID, accountID, start, end)
	if err != nil {
		return nil, err
	}
	totalBalance := decimal.Zero
	if accountID != "" {
		account, err := u.accounts.FindByID(ctx, accountID, userID)
		if err != nil {
			return nil, err
		}
		totalBalance = account.CurrentBalance
	} else if summer, ok := u.accounts.(balanceSummer); ok {
		totalBalance, err = summer.SumBalance(ctx, userID)
		if err != nil {
			return nil, err
		}
	}
	return &dto.SummaryResponse{
		Period:          normalized,
		StartDate:       start.Format("2006-01-02"),
		EndDate:         end.Format("2006-01-02"),
		TotalBalance:    totalBalance,
		TotalIncome:     income,
		TotalExpense:    expense,
		NetCashflow:     income.Sub(expense),
		CategoryTotals:  categories,
		DailyTotals:     daily,
		RecentLimitHint: 8,
	}, nil
}
