package vision

import (
	"context"
	"errors"
)

// Receipt is the raw structured result the model is asked to produce. Parsing,
// normalisation and plausibility checks happen on the frontend (TypeScript),
// so this mirrors the loose shape and is passed through to the client as-is.
type Receipt struct {
	Merchant           *string     `json:"merchant"`
	Date               *string     `json:"date"`
	DateRaw            *string     `json:"date_raw,omitempty"`
	Total              *float64    `json:"total"`
	Currency           string      `json:"currency"`
	CategorySuggestion *string     `json:"category_suggestion"`
	Confidence         Confidence  `json:"confidence"`
	Warnings           []string    `json:"warnings"`
	Usage              *TokenUsage `json:"usage,omitempty"`
}

type Confidence struct {
	Total float64 `json:"total"`
	Date  float64 `json:"date"`
}

// TokenUsage echoes the model's reported token counts so callers can monitor
// cost. It never contains receipt contents.
type TokenUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// Provider abstracts the vision backend so it can be swapped (Gemini today,
// something else later) without touching the handler.
type Provider interface {
	// ScanReceipt sends the image bytes (already validated + compressed) and
	// returns the raw structured receipt. It must honour ctx cancellation and
	// timeouts. Errors should be one of the typed errors below where possible.
	ScanReceipt(ctx context.Context, imageData []byte, mimeType string) (*Receipt, error)
}

// Typed errors let the handler translate failures into the right HTTP status
// and a user-safe message, without leaking provider details or secrets.
var (
	// ErrModelUnavailable: model not found / no access (HTTP 404/403 upstream).
	ErrModelUnavailable = errors.New("vision model unavailable")
	// ErrQuotaExceeded: upstream quota/rate limit hit (HTTP 429 upstream).
	ErrQuotaExceeded = errors.New("vision quota exceeded")
	// ErrBadImage: upstream rejected the image as invalid/unprocessable.
	ErrBadImage = errors.New("vision could not read image")
	// ErrUpstream: any other upstream failure.
	ErrUpstream = errors.New("vision upstream error")
	// ErrNotConfigured: no API key configured; feature disabled.
	ErrNotConfigured = errors.New("vision not configured")
)
