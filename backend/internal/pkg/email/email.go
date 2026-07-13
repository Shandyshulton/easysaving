package email

import (
	"context"
	"fmt"
	"log"
	"net/smtp"
	"strings"
)

type Service interface {
	SendPasswordResetOTP(ctx context.Context, to string, otp string) error
	SendLoginOTP(ctx context.Context, to string, otp string) error
}

type Config struct {
	AppEnv   string
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

type SMTPService struct {
	cfg Config
}

func NewSMTPService(cfg Config) *SMTPService {
	return &SMTPService{cfg: cfg}
}

func (s *SMTPService) SendPasswordResetOTP(ctx context.Context, to string, otp string) error {
	return s.sendOTP(ctx, to, otp, "Kode OTP Reset Password EasySaving", "reset password")
}

func (s *SMTPService) SendLoginOTP(ctx context.Context, to string, otp string) error {
	return s.sendOTP(ctx, to, otp, "Kode OTP Login EasySaving", "login")
}

func (s *SMTPService) sendOTP(ctx context.Context, to string, otp string, subject string, action string) error {
	if s.cfg.Host == "" || s.cfg.Port == "" || s.cfg.User == "" || s.cfg.Password == "" || s.cfg.From == "" {
		if s.cfg.AppEnv == "development" {
			log.Printf("EasySaving %s OTP for %s: %s", action, to, otp)
			return nil
		}
		return fmt.Errorf("email service is not configured")
	}

	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}

	addr := s.cfg.Host + ":" + s.cfg.Port
	auth := smtp.PlainAuth("", s.cfg.User, s.cfg.Password, s.cfg.Host)
	body := fmt.Sprintf("Kode OTP %s EasySaving Anda adalah %s.\n\nKode ini berlaku selama 1 menit. Abaikan email ini jika Anda tidak meminta kode OTP.", action, otp)
	message := strings.Join([]string{
		"From: " + s.cfg.From,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		body,
	}, "\r\n")

	return smtp.SendMail(addr, auth, s.cfg.From, []string{to}, []byte(message))
}
