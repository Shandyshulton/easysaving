package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	AppEnv          string
	HTTPPort        string
	DatabaseURL     string
	JWTSecret       string
	JWTExpiresHours int
	FrontendOrigin  string
	APILogPath      string
	SMTPHost        string
	SMTPPort        string
	SMTPUser        string
	SMTPPassword    string
	SMTPFrom        string

	// Receipt scan (Gemini vision). GeminiAPIKey empty => feature disabled.
	GeminiAPIKey        string
	GeminiModel         string
	ReceiptScanPerMin   int
	ReceiptScanPerDay   int
	ReceiptScanGlobalPM int
}

func Load() Config {
	hours, err := strconv.Atoi(getenv("JWT_EXPIRES_HOURS", "168"))
	if err != nil {
		hours = 168
	}
	return Config{
		AppEnv:          getenv("APP_ENV", "development"),
		HTTPPort:        getenv("HTTP_PORT", "8080"),
		DatabaseURL:     getenv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=easysaving port=5432 sslmode=disable TimeZone=Asia/Bangkok"),
		JWTSecret:       getenv("JWT_SECRET", "dev-secret"),
		JWTExpiresHours: hours,
		FrontendOrigin:  getenv("FRONTEND_ORIGIN", "http://localhost:3000"),
		APILogPath:      getenv("API_LOG_PATH", "logs/api.log"),
		SMTPHost:        getenv("SMTP_HOST", ""),
		SMTPPort:        getenv("SMTP_PORT", "587"),
		SMTPUser:        getenv("SMTP_USER", ""),
		SMTPPassword:    getenv("SMTP_PASSWORD", ""),
		SMTPFrom:        getenv("SMTP_FROM", ""),

		GeminiAPIKey: getenv("GEMINI_API_KEY", ""),
		GeminiModel:  getenv("GEMINI_MODEL", "gemini-2.5-flash"),
		// Per-user limits.
		ReceiptScanPerMin: getenvInt("RECEIPT_SCAN_PER_MINUTE", 5),
		ReceiptScanPerDay: getenvInt("RECEIPT_SCAN_PER_DAY", 30),
		// App-wide ceiling. Gemini free tier is per-project (~10 RPM for
		// 2.5 Flash per Google docs/third-party refs), so keep the global
		// default comfortably below that to leave headroom.
		ReceiptScanGlobalPM: getenvInt("RECEIPT_SCAN_GLOBAL_PER_MINUTE", 8),
	}
}

func (c Config) Validate() error {
	if c.AppEnv != "production" {
		return nil
	}
	secret := strings.TrimSpace(c.JWTSecret)
	if secret == "" || secret == "dev-secret" || secret == "change-me" || strings.HasPrefix(secret, "replace-with-") {
		return errors.New("JWT_SECRET must be set to a strong random value in production")
	}
	if len(secret) < 32 {
		return errors.New("JWT_SECRET must be at least 32 characters in production")
	}
	if strings.TrimSpace(c.FrontendOrigin) == "" {
		return errors.New("FRONTEND_ORIGIN must be set in production")
	}
	return nil
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	if value := os.Getenv(key); value != "" {
		if n, err := strconv.Atoi(value); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}
