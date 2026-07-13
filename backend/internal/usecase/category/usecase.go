package category

import (
	"context"

	domaincategory "easysaving/backend/internal/domain/category"
)

type Usecase struct{ categories domaincategory.Repository }

func New(categories domaincategory.Repository) *Usecase { return &Usecase{categories: categories} }

func (u *Usecase) List(ctx context.Context, userID, categoryType string) ([]domaincategory.Category, error) {
	if err := u.categories.EnsureDefaults(ctx, userID); err != nil {
		return nil, err
	}
	return u.categories.ListByUser(ctx, userID, categoryType)
}
