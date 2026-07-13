package transaction

import (
	"context"
	"errors"
	"time"

	domainaccount "easysaving/backend/internal/domain/account"
	domaincategory "easysaving/backend/internal/domain/category"
	domaintransaction "easysaving/backend/internal/domain/transaction"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/daterange"
	"easysaving/backend/internal/pkg/money"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Usecase struct {
	transactions domaintransaction.Repository
	accounts     domainaccount.Repository
	categories   domaincategory.Repository
}

func New(transactions domaintransaction.Repository, accounts domainaccount.Repository, categories domaincategory.Repository) *Usecase {
	return &Usecase{transactions: transactions, accounts: accounts, categories: categories}
}

func (u *Usecase) Create(ctx context.Context, userID string, req dto.TransactionRequest) (*domaintransaction.Transaction, error) {
	item, err := u.build(ctx, userID, uuid.NewString(), req)
	if err != nil {
		return nil, err
	}
	err = u.transactions.WithTx(ctx, func(tx *gorm.DB) error {
		if err := u.transactions.CreateTx(ctx, tx, item); err != nil {
			return err
		}
		return u.accounts.AdjustBalance(ctx, tx, item.AccountID, userID, item.BalanceDelta())
	})
	return item, err
}

func (u *Usecase) Update(ctx context.Context, userID, id string, req dto.TransactionRequest) (*domaintransaction.Transaction, error) {
	old, err := u.transactions.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	next, err := u.build(ctx, userID, id, req)
	if err != nil {
		return nil, err
	}
	next.CreatedAt = old.CreatedAt
	err = u.transactions.WithTx(ctx, func(tx *gorm.DB) error {
		if err := u.accounts.AdjustBalance(ctx, tx, old.AccountID, userID, old.BalanceDelta().Neg()); err != nil {
			return err
		}
		if err := u.transactions.UpdateTx(ctx, tx, next); err != nil {
			return err
		}
		return u.accounts.AdjustBalance(ctx, tx, next.AccountID, userID, next.BalanceDelta())
	})
	return next, err
}

func (u *Usecase) Delete(ctx context.Context, userID, id string) error {
	old, err := u.transactions.FindByID(ctx, id, userID)
	if err != nil {
		return err
	}
	return u.transactions.WithTx(ctx, func(tx *gorm.DB) error {
		if err := u.accounts.AdjustBalance(ctx, tx, old.AccountID, userID, old.BalanceDelta().Neg()); err != nil {
			return err
		}
		return u.transactions.DeleteTx(ctx, tx, old)
	})
}

func (u *Usecase) List(ctx context.Context, userID string, req dto.TransactionFilterRequest) ([]domaintransaction.Transaction, error) {
	filter := domaintransaction.Filter{UserID: userID, Type: req.Type, CategoryID: req.CategoryID, AccountID: req.AccountID, Limit: req.Limit}
	if req.StartDate != "" {
		start, err := daterange.ParseDate(req.StartDate)
		if err != nil {
			return nil, err
		}
		filter.StartDate = &start
	}
	if req.EndDate != "" {
		end, err := daterange.ParseDate(req.EndDate)
		if err != nil {
			return nil, err
		}
		filter.EndDate = &end
	}
	return u.transactions.List(ctx, filter)
}

func (u *Usecase) build(ctx context.Context, userID, id string, req dto.TransactionRequest) (*domaintransaction.Transaction, error) {
	amount, err := money.ParsePositive(req.Amount)
	if err != nil {
		return nil, err
	}
	txType := domaintransaction.Type(req.Type)
	if !txType.IsValid() {
		return nil, errors.New("invalid transaction type")
	}
	date, err := daterange.ParseDate(req.TransactionDate)
	if err != nil {
		return nil, err
	}
	if _, err := u.accounts.FindByID(ctx, req.AccountID, userID); err != nil {
		return nil, err
	}
	cat, err := u.categories.FindByID(ctx, req.CategoryID, userID)
	if err != nil {
		return nil, err
	}
	if string(cat.Type) != string(txType) {
		return nil, errors.New("category type must match transaction type")
	}
	return &domaintransaction.Transaction{
		ID:              id,
		UserID:          userID,
		AccountID:       req.AccountID,
		CategoryID:      req.CategoryID,
		Type:            txType,
		Amount:          amount,
		TransactionDate: date,
		Notes:           req.Notes,
		UpdatedAt:       time.Now(),
	}, nil
}
