package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"easysaving/backend/internal/domain/category"
	"easysaving/backend/internal/domain/passwordreset"
	"easysaving/backend/internal/domain/user"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/email"
	jwtpkg "easysaving/backend/internal/pkg/jwt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

const (
	otpPurposeLogin         = "login"
	otpPurposePasswordReset = "password_reset"
	otpExpiresInSeconds     = 60
)

type Usecase struct {
	users          user.Repository
	categories     category.Repository
	passwordResets passwordreset.Repository
	mailer         email.Service
	jwt            jwtpkg.Service
}

func New(users user.Repository, categories category.Repository, passwordResets passwordreset.Repository, mailer email.Service, jwt jwtpkg.Service) *Usecase {
	return &Usecase{users: users, categories: categories, passwordResets: passwordResets, mailer: mailer, jwt: jwt}
}

func (u *Usecase) Register(ctx context.Context, req dto.RegisterRequest) (*dto.AuthResponse, error) {
	req.Email = normalizeEmail(req.Email)
	existing, err := u.users.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email already registered")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	item := user.User{ID: uuid.NewString(), Name: req.Name, Email: req.Email, PasswordHash: string(hash)}
	if err := u.users.Create(ctx, &item); err != nil {
		return nil, err
	}
	if err := u.categories.EnsureDefaults(ctx, item.ID); err != nil {
		return nil, err
	}
	token, err := u.jwt.Generate(item.ID)
	if err != nil {
		return nil, err
	}
	return authResponse(token, item), nil
}

func (u *Usecase) Login(ctx context.Context, req dto.LoginRequest) (*dto.LoginOTPResponse, error) {
	req.Email = normalizeEmail(req.Email)
	item, err := u.users.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, err
	}
	if item == nil || bcrypt.CompareHashAndPassword([]byte(item.PasswordHash), []byte(req.Password)) != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := u.createAndSendOTP(ctx, *item, otpPurposeLogin, otpExpiresInSeconds, u.mailer.SendLoginOTP); err != nil {
		return nil, err
	}

	return &dto.LoginOTPResponse{Sent: true, Email: req.Email, ExpiresIn: otpExpiresInSeconds}, nil
}

func (u *Usecase) VerifyLoginOTP(ctx context.Context, req dto.VerifyLoginOTPRequest) (*dto.AuthResponse, error) {
	normalizedEmail := normalizeEmail(req.Email)
	item, err := u.users.FindByEmail(ctx, normalizedEmail)
	if err != nil {
		return nil, err
	}
	if item == nil {
		return nil, errors.New("invalid or expired OTP")
	}

	reset, err := u.passwordResets.FindLatestByEmailAndPurpose(ctx, normalizedEmail, otpPurposeLogin)
	if err != nil {
		return nil, err
	}
	if reset == nil || time.Now().After(reset.ExpiresAt) {
		return nil, errors.New("invalid or expired OTP")
	}
	if bcrypt.CompareHashAndPassword([]byte(reset.OTPHash), []byte(req.OTP)) != nil {
		return nil, errors.New("invalid or expired OTP")
	}

	token, err := u.jwt.Generate(item.ID)
	if err != nil {
		return nil, err
	}
	if err := u.passwordResets.MarkUsed(ctx, reset.ID); err != nil {
		return nil, err
	}
	return authResponse(token, *item), nil
}

func (u *Usecase) Me(ctx context.Context, userID string) (*dto.UserResponse, error) {
	item, err := u.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	res := userResponse(*item)
	return &res, nil
}

func (u *Usecase) UpdateProfile(ctx context.Context, userID string, req dto.UpdateProfileRequest) (*dto.UserResponse, error) {
	item, err := u.users.FindByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	item.Name = req.Name
	if err := u.users.Update(ctx, item); err != nil {
		return nil, err
	}
	res := userResponse(*item)
	return &res, nil
}

func (u *Usecase) UpdatePassword(ctx context.Context, userID string, req dto.UpdatePasswordRequest) error {
	item, err := u.users.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(item.PasswordHash), []byte(req.CurrentPassword)) != nil {
		return errors.New("current password is incorrect")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	item.PasswordHash = string(hash)
	return u.users.Update(ctx, item)
}

func (u *Usecase) ForgotPassword(ctx context.Context, req dto.ForgotPasswordRequest) error {
	normalizedEmail := normalizeEmail(req.Email)
	item, err := u.users.FindByEmail(ctx, normalizedEmail)
	if err != nil {
		return err
	}
	if item == nil {
		return nil
	}

	latest, err := u.passwordResets.FindLatestByEmailAndPurpose(ctx, normalizedEmail, otpPurposePasswordReset)
	if err != nil {
		return err
	}
	if latest != nil && time.Since(latest.CreatedAt) < time.Minute {
		return nil
	}

	return u.createAndSendOTP(ctx, *item, otpPurposePasswordReset, otpExpiresInSeconds, u.mailer.SendPasswordResetOTP)
}

func (u *Usecase) ResetPassword(ctx context.Context, req dto.ResetPasswordRequest) error {
	normalizedEmail := normalizeEmail(req.Email)
	reset, err := u.passwordResets.FindLatestByEmailAndPurpose(ctx, normalizedEmail, otpPurposePasswordReset)
	if err != nil {
		return err
	}
	if reset == nil || time.Now().After(reset.ExpiresAt) {
		return errors.New("invalid or expired OTP")
	}
	if bcrypt.CompareHashAndPassword([]byte(reset.OTPHash), []byte(req.OTP)) != nil {
		return errors.New("invalid or expired OTP")
	}

	item, err := u.users.FindByEmail(ctx, normalizedEmail)
	if err != nil {
		return err
	}
	if item == nil {
		return errors.New("invalid or expired OTP")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	item.PasswordHash = string(hash)
	if err := u.users.Update(ctx, item); err != nil {
		return err
	}
	return u.passwordResets.MarkUsed(ctx, reset.ID)
}

func authResponse(token string, item user.User) *dto.AuthResponse {
	return &dto.AuthResponse{
		Token: token,
		User:  userResponse(item),
	}
}

func userResponse(item user.User) dto.UserResponse {
	return dto.UserResponse{ID: item.ID, Name: item.Name, Email: item.Email}
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func (u *Usecase) createAndSendOTP(ctx context.Context, item user.User, purpose string, expiresInSeconds int, send func(context.Context, string, string) error) error {
	otp, err := generateOTP()
	if err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(otp), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	reset := passwordreset.PasswordResetOTP{
		ID:        uuid.NewString(),
		UserID:    item.ID,
		Email:     normalizeEmail(item.Email),
		Purpose:   purpose,
		OTPHash:   string(hash),
		ExpiresAt: time.Now().Add(time.Duration(expiresInSeconds) * time.Second),
	}
	if err := u.passwordResets.Create(ctx, &reset); err != nil {
		return err
	}
	return send(ctx, reset.Email, otp)
}

func generateOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}
