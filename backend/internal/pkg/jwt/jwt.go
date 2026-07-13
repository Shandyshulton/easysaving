package jwtpkg

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Service struct {
	secret []byte
	ttl    time.Duration
}

func New(secret string, ttlHours int) Service {
	return Service{secret: []byte(secret), ttl: time.Duration(ttlHours) * time.Hour}
}

func (s Service) Generate(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(s.ttl).Unix(),
		"iat": time.Now().Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.secret)
}

func (s Service) Parse(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return "", err
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", jwt.ErrTokenInvalidClaims
	}
	userID, ok := claims["sub"].(string)
	if !ok || userID == "" {
		return "", jwt.ErrTokenInvalidClaims
	}
	return userID, nil
}
