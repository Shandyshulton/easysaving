package category

import "context"

type Repository interface {
	Create(ctx context.Context, item *Category) error
	ListByUser(ctx context.Context, userID string, categoryType string) ([]Category, error)
	FindByID(ctx context.Context, id, userID string) (*Category, error)
	EnsureDefaults(ctx context.Context, userID string) error
}
