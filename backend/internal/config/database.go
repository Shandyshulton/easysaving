package config

import (
	"easysaving/backend/internal/domain/account"
	"easysaving/backend/internal/domain/category"
	"easysaving/backend/internal/domain/passwordreset"
	"easysaving/backend/internal/domain/transaction"
	"easysaving/backend/internal/domain/user"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func OpenPostgres(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, err
	}
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&user.User{}, &account.Account{}, &category.Category{}, &transaction.Transaction{}, &passwordreset.PasswordResetOTP{})
}
