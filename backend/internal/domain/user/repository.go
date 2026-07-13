package user

import "context"

type Repository interface {
	Create(ctx context.Context, item *User) error
	FindByEmail(ctx context.Context, email string) (*User, error)
	FindByID(ctx context.Context, id string) (*User, error)
	Update(ctx context.Context, item *User) error
}
