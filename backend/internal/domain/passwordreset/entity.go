package passwordreset

import "time"

type PasswordResetOTP struct {
	ID        string     `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    string     `gorm:"type:uuid;not null;index" json:"user_id"`
	Email     string     `gorm:"size:180;not null;index" json:"email"`
	Purpose   string     `gorm:"size:32;not null;default:password_reset;index" json:"purpose"`
	OTPHash   string     `gorm:"size:255;not null" json:"-"`
	ExpiresAt time.Time  `gorm:"not null;index" json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}
