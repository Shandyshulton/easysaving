package postgres

import (
	"context"
	"errors"
	"time"

	"easysaving/backend/internal/domain/passwordreset"

	"gorm.io/gorm"
)

type PasswordResetRepository struct{ db *gorm.DB }

func NewPasswordResetRepository(db *gorm.DB) *PasswordResetRepository {
	return &PasswordResetRepository{db: db}
}

func (r *PasswordResetRepository) Create(ctx context.Context, item *passwordreset.PasswordResetOTP) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *PasswordResetRepository) FindLatestByEmail(ctx context.Context, email string) (*passwordreset.PasswordResetOTP, error) {
	return r.FindLatestByEmailAndPurpose(ctx, email, "password_reset")
}

func (r *PasswordResetRepository) FindLatestByEmailAndPurpose(ctx context.Context, email string, purpose string) (*passwordreset.PasswordResetOTP, error) {
	var item passwordreset.PasswordResetOTP
	err := r.db.WithContext(ctx).
		Where("email = ? AND purpose = ? AND used_at IS NULL", email, purpose).
		Order("created_at DESC").
		First(&item).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *PasswordResetRepository) MarkUsed(ctx context.Context, id string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&passwordreset.PasswordResetOTP{}).
		Where("id = ?", id).
		Update("used_at", now).Error
}
