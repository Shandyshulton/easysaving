package money

import (
	"errors"
	"strings"

	"github.com/shopspring/decimal"
)

func ParsePositive(value string) (decimal.Decimal, error) {
	amount, err := decimal.NewFromString(strings.TrimSpace(value))
	if err != nil {
		return decimal.Zero, err
	}
	if !amount.GreaterThan(decimal.Zero) {
		return decimal.Zero, errors.New("amount must be greater than zero")
	}
	return amount.Round(2), nil
}
