package postgres

import (
	"context"
	"errors"

	"easysaving/backend/internal/domain/user"

	"gorm.io/gorm"
)

type UserRepository struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) *UserRepository { return &UserRepository{db: db} }

func (r *UserRepository) Create(ctx context.Context, item *user.User) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	var item user.User
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&item).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &item, nil
}

func (r *UserRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
	var item user.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *UserRepository) Update(ctx context.Context, item *user.User) error {
	return r.db.WithContext(ctx).Save(item).Error
}
