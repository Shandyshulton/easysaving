package account

import (
	"context"

	domainaccount "easysaving/backend/internal/domain/account"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/money"

	"github.com/google/uuid"
)

type Usecase struct{ accounts domainaccount.Repository }

func New(accounts domainaccount.Repository) *Usecase { return &Usecase{accounts: accounts} }

func (u *Usecase) Create(ctx context.Context, userID string, req dto.AccountRequest) (*domainaccount.Account, error) {
	amount, err := money.ParsePositive(req.InitialBalance)
	if err != nil {
		return nil, err
	}
	item := domainaccount.Account{
		ID:             uuid.NewString(),
		UserID:         userID,
		AccountName:    req.AccountName,
		Category:       req.Category,
		InitialBalance: amount,
		CurrentBalance: amount,
		Notes:          req.Notes,
	}
	return &item, u.accounts.Create(ctx, &item)
}

func (u *Usecase) List(ctx context.Context, userID string) ([]domainaccount.Account, error) {
	return u.accounts.ListByUser(ctx, userID)
}

func (u *Usecase) Update(ctx context.Context, userID, id string, req dto.UpdateAccountRequest) (*domainaccount.Account, error) {
	amount, err := money.ParsePositive(req.CurrentBalance)
	if err != nil {
		return nil, err
	}
	item, err := u.accounts.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	item.AccountName = req.AccountName
	item.Category = req.Category
	item.CurrentBalance = amount
	item.Notes = req.Notes
	return item, u.accounts.Update(ctx, item)
}

func (u *Usecase) Delete(ctx context.Context, userID, id string) error {
	if _, err := u.accounts.FindByID(ctx, id, userID); err != nil {
		return err
	}
	return u.accounts.Delete(ctx, id, userID)
}
