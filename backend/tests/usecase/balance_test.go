package usecase_test

import (
	"testing"

	domaintransaction "easysaving/backend/internal/domain/transaction"

	"github.com/shopspring/decimal"
)

func TestBalanceDelta(t *testing.T) {
	amount := decimal.NewFromInt(100000)
	income := domaintransaction.Transaction{Type: domaintransaction.TypeIncome, Amount: amount}
	expense := domaintransaction.Transaction{Type: domaintransaction.TypeExpense, Amount: amount}

	if !income.BalanceDelta().Equal(amount) {
		t.Fatalf("income should add balance")
	}
	if !expense.BalanceDelta().Equal(amount.Neg()) {
		t.Fatalf("expense should reduce balance")
	}
}
