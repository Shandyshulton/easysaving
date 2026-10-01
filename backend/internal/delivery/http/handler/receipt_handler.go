package handler

import (
	"context"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/pkg/ratelimit"
	"easysaving/backend/internal/pkg/response"
	"easysaving/backend/internal/pkg/vision"

	"github.com/gin-gonic/gin"
)

// Limits for the uploaded image. The frontend compresses to ~2 MB; we allow a
// little headroom and hard-reject anything larger.
const (
	maxUploadBytes = 6 << 20 // 6 MiB
	scanTimeout    = 30 * time.Second
)

// ReceiptHandler is a thin layer: auth (via middleware), file validation, rate
// limiting, and delegation to a VisionProvider. It stores nothing and logs no
// image bytes or amounts.
type ReceiptHandler struct {
	vision  vision.Provider
	limiter *ratelimit.ReceiptLimiter
	enabled bool
}

func NewReceiptHandler(v vision.Provider, limiter *ratelimit.ReceiptLimiter, enabled bool) *ReceiptHandler {
	return &ReceiptHandler{vision: v, limiter: limiter, enabled: enabled}
}

// detectImageMime inspects magic bytes and returns the canonical MIME type for
// the formats we accept, or "" when unsupported. We trust bytes, not the
// client-supplied Content-Type or filename.
func detectImageMime(b []byte) string {
	if len(b) >= 3 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF {
		return "image/jpeg"
	}
	if len(b) >= 8 && b[0] == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47 &&
		b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A {
		return "image/png"
	}
	// WEBP: "RIFF"????"WEBP"
	if len(b) >= 12 && string(b[0:4]) == "RIFF" && string(b[8:12]) == "WEBP" {
		return "image/webp"
	}
	return ""
}

// Scan handles POST /api/v1/receipts/scan (multipart form, field "image").
func (h *ReceiptHandler) Scan(c *gin.Context) {
	userID := middleware.UserID(c)
	if userID == "" {
		response.Error(c, http.StatusUnauthorized, "invalid token")
		return
	}

	if !h.enabled {
		// No API key configured. Fail loud but user-safe; form falls back to manual.
		response.Error(c, http.StatusServiceUnavailable, "Layanan scan belum tersedia, isi manual.")
		return
	}

	// Rate limit (per-user minute/day, global minute, one-in-flight).
	decision := h.limiter.Acquire(userID)
	if !decision.Allowed {
		retry := int(decision.RetryAfter.Seconds())
		if retry < 1 {
			retry = 1
		}
		c.Header("Retry-After", strconv.Itoa(retry))
		msg := "Layanan scan sedang sibuk, coba lagi sebentar atau isi manual."
		if decision.Reason == "user_day" {
			msg = "Batas harian scan tercapai. Coba lagi besok atau isi manual."
		} else if decision.Reason == "in_flight" {
			msg = "Masih memproses scan sebelumnya, mohon tunggu."
		}
		response.Error(c, http.StatusTooManyRequests, msg)
		return
	}
	defer h.limiter.Release(userID)

	// Read the uploaded file with a hard size cap.
	fileHeader, err := c.FormFile("image")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "File gambar tidak ditemukan.")
		return
	}
	if fileHeader.Size > maxUploadBytes {
		response.Error(c, http.StatusRequestEntityTooLarge, "Ukuran gambar terlalu besar.")
		return
	}

	f, err := fileHeader.Open()
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Gagal membaca gambar.")
		return
	}
	defer f.Close()

	data, err := io.ReadAll(io.LimitReader(f, maxUploadBytes+1))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Gagal membaca gambar.")
		return
	}
	if len(data) > maxUploadBytes {
		response.Error(c, http.StatusRequestEntityTooLarge, "Ukuran gambar terlalu besar.")
		return
	}

	// Validate by magic bytes, not Content-Type / extension.
	mimeType := detectImageMime(data)
	if mimeType == "" {
		response.Error(c, http.StatusUnsupportedMediaType, "Format gambar tidak didukung (gunakan JPG, PNG, atau WebP).")
		return
	}

	// Timeout + propagate client cancellation (Batal button aborts the request,
	// which cancels c.Request.Context()).
	ctx, cancel := context.WithTimeout(c.Request.Context(), scanTimeout)
	defer cancel()

	receipt, err := h.vision.ScanReceipt(ctx, data, mimeType)
	if err != nil {
		h.handleVisionError(c, err)
		return
	}

	// Debug: log the date reason only (future / too_old / unparseable / ok) and
	// the raw date text, so date mismatches can be diagnosed server-side.
	// Never logs amount, image bytes, merchant, or other data.
	logDateReason(receipt)

	// Success: return the raw structured JSON. Frontend normalises + validates.
	response.OK(c, receipt)
}

// handleVisionError maps provider errors to a safe status + message. It logs a
// short reason WITHOUT image bytes, amounts, or the API key.
func (h *ReceiptHandler) handleVisionError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, context.Canceled):
		// Client aborted (Batal). Nothing to return; connection likely gone.
		c.Status(499) // nginx-style "client closed request"
		return
	case errors.Is(err, context.DeadlineExceeded):
		response.Error(c, http.StatusGatewayTimeout, "Scan memakan waktu terlalu lama, coba lagi atau isi manual.")
	case errors.Is(err, vision.ErrNotConfigured):
		log.Printf("receipt scan: provider not configured")
		response.Error(c, http.StatusServiceUnavailable, "Layanan scan belum tersedia, isi manual.")
	case errors.Is(err, vision.ErrModelUnavailable):
		log.Printf("receipt scan: model unavailable (check GEMINI_MODEL access for this project)")
		response.Error(c, http.StatusServiceUnavailable, "Layanan scan belum tersedia, isi manual.")
	case errors.Is(err, vision.ErrQuotaExceeded):
		c.Header("Retry-After", "60")
		response.Error(c, http.StatusTooManyRequests, "Layanan scan sedang sibuk, coba lagi atau isi manual.")
	case errors.Is(err, vision.ErrBadImage):
		response.Error(c, http.StatusUnprocessableEntity, "Struk tidak terbaca. Coba foto lebih jelas atau isi manual.")
	default:
		log.Printf("receipt scan: upstream error")
		response.Error(c, http.StatusBadGateway, "Gagal membaca struk, coba lagi atau isi manual.")
	}
}

// logDateReason logs why the model's date would be accepted or rejected
// (ok / future / too_old / unparseable), plus the raw printed date text. It is
// for debugging date issues only and never logs amounts, image data, or other
// receipt contents.
func logDateReason(r *vision.Receipt) {
	iso := ""
	if r.Date != nil {
		iso = *r.Date
	}
	raw := ""
	if r.DateRaw != nil {
		raw = *r.DateRaw
	}

	reason := "ok"
	switch {
	case iso == "":
		if raw == "" {
			return // no date at all; nothing useful to log
		}
		reason = "unparseable"
	default:
		reason = classifyDateForLog(iso)
	}
	log.Printf("receipt scan: date reason=%s date_raw=%q", reason, raw)
}

// classifyDateForLog mirrors the frontend rules (Asia/Jakarta, calendar-only,
// +1 day future tolerance, 1 year window) for logging purposes.
func classifyDateForLog(iso string) string {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	today := now.Format("2006-01-02")
	tomorrow := now.AddDate(0, 0, 1).Format("2006-01-02")
	oneYearAgo := now.AddDate(-1, 0, 0).Format("2006-01-02")

	switch {
	case iso > tomorrow:
		return "future"
	case iso < oneYearAgo:
		return "old"
	default:
		_ = today
		return "ok"
	}
}
