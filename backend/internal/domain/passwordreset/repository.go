package passwordreset

import "context"

type Repository interface {
	Create(ctx context.Context, item *PasswordResetOTP) error
	FindLatestByEmail(ctx context.Context, email string) (*PasswordResetOTP, error)
	FindLatestByEmailAndPurpose(ctx context.Context, email string, purpose string) (*PasswordResetOTP, error)
	MarkUsed(ctx context.Context, id string) error
}
