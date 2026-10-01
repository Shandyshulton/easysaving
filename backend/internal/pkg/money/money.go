package money

import (
	"errors"
	"strings"

	"github.com/shopspring/decimal"
)

func ParsePositive(value string) (decimal.Decimal, error) {
	amount, err := decimal.NewFromString(strings.TrimSpace(value))
	if err != nil {
		return decimal.Zero, errors.New("nominal tidak valid")
	}
	if !amount.GreaterThan(decimal.Zero) {
		return decimal.Zero, errors.New("nominal harus lebih besar dari 0")
	}
	return amount.Round(2), nil
}
