package vision

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// geminiProvider calls the Gemini generateContent REST endpoint directly (no
// SDK) and asks for JSON output constrained by a response schema.
type geminiProvider struct {
	apiKey string
	model  string
	client *http.Client
}

// NewGemini builds a Gemini-backed Provider. When apiKey is empty the returned
// provider still satisfies the interface but every call returns
// ErrNotConfigured, so the handler can report the feature as disabled.
func NewGemini(apiKey, model string) Provider {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &geminiProvider{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 35 * time.Second},
	}
}

// buildPrompt returns the instruction sent to the model. todayISO (Asia/Jakarta,
// YYYY-MM-DD) is injected so the model can resolve ambiguous dates correctly.
func buildPrompt(todayISO string) string {
	return `You extract data from an Indonesian retail receipt image.
Today's date is ` + todayISO + ` (Asia/Jakarta).
Return ONLY structured data matching the schema. Rules:
- total: the FINAL amount that must be paid. Prefer labels: TOTAL, GRAND TOTAL, TOTAL BAYAR, JUMLAH, JUMLAH TAGIHAN, TAGIHAN.
- NEVER pick any of these as the total: SUBTOTAL (when tax/service appears below it), TUNAI / CASH / BAYAR (money handed over), KEMBALI / CHANGE (change returned), DISKON (discount), PPN / PB1 / PAJAK / SERVICE on their own, receipt/invoice number, card number, or phone number.
- If several total candidates are ambiguous, choose the most plausible FINAL bill amount and LOWER confidence.total accordingly.
- Indonesian numbers use "." for thousands and "," for decimals.
- date: this is an Indonesian receipt. Dates are dd/mm/yy or dd/mm/yyyy, NOT mm/dd. A 2-digit year means 20xx.
  Return the date as ISO (YYYY-MM-DD) ONLY when clearly readable, otherwise null. Do NOT guess or adjust the date to look plausible.
- date_raw: the date text EXACTLY as printed on the receipt (verbatim), or null if none is visible.
- merchant: store name if visible, else null.
- category_suggestion: a short generic Indonesian category word (e.g. "Makanan", "Belanja", "Transportasi") or null.
- confidence.total and confidence.date: 0..1 how sure you are.
- If the total is not clearly readable, return null (do NOT guess) and add a short Indonesian note to warnings. Never guess any field.`
}

// geminiRequest and friends model the subset of the API we use.
type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	GenerationConfig geminiGenerationConfig `json:"generationConfig"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text       string            `json:"text,omitempty"`
	InlineData *geminiInlineData `json:"inlineData,omitempty"`
}

type geminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type geminiGenerationConfig struct {
	ResponseMimeType string          `json:"responseMimeType"`
	ResponseSchema   map[string]any  `json:"responseSchema"`
	Temperature      float64         `json:"temperature"`
	MaxOutputTokens  int             `json:"maxOutputTokens,omitempty"`
	ThinkingConfig   *thinkingConfig `json:"thinkingConfig,omitempty"`
}

// thinkingConfig lets us cap/disable the model's internal "thinking" budget.
// Gemini 3.x models think before answering; for a small structured extraction
// that thinking can otherwise consume the whole output budget and leave no
// room for the JSON (finishReason MAX_TOKENS, empty parts).
type thinkingConfig struct {
	ThinkingBudget int `json:"thinkingBudget"`
}

type geminiResponse struct {
	Candidates []struct {
		FinishReason string `json:"finishReason"`
		Content      struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	UsageMetadata struct {
		PromptTokenCount     int `json:"promptTokenCount"`
		CandidatesTokenCount int `json:"candidatesTokenCount"`
		TotalTokenCount      int `json:"totalTokenCount"`
	} `json:"usageMetadata"`
}

// responseSchema constrains the model output to our receipt shape.
func responseSchema() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"merchant":            map[string]any{"type": "string", "nullable": true},
			"date":                map[string]any{"type": "string", "nullable": true},
			"date_raw":            map[string]any{"type": "string", "nullable": true},
			"total":               map[string]any{"type": "number", "nullable": true},
			"currency":            map[string]any{"type": "string"},
			"category_suggestion": map[string]any{"type": "string", "nullable": true},
			"confidence": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"total": map[string]any{"type": "number"},
					"date":  map[string]any{"type": "number"},
				},
			},
			"warnings": map[string]any{
				"type":  "array",
				"items": map[string]any{"type": "string"},
			},
		},
		"required": []string{"total", "date", "currency", "confidence", "warnings"},
	}
}

func (g *geminiProvider) ScanReceipt(ctx context.Context, imageData []byte, mimeType string) (*Receipt, error) {
	if g.apiKey == "" {
		return nil, ErrNotConfigured
	}

	// Today's date in Asia/Jakarta, injected into the prompt so the model can
	// resolve ambiguous dates. Fall back to UTC date if the zone is unavailable.
	todayISO := time.Now().UTC().Format("2006-01-02")
	if loc, err := time.LoadLocation("Asia/Jakarta"); err == nil {
		todayISO = time.Now().In(loc).Format("2006-01-02")
	}

	reqBody := geminiRequest{
		Contents: []geminiContent{{
			Parts: []geminiPart{
				{Text: buildPrompt(todayISO)},
				{InlineData: &geminiInlineData{
					MimeType: mimeType,
					Data:     base64.StdEncoding.EncodeToString(imageData),
				}},
			},
		}},
		GenerationConfig: geminiGenerationConfig{
			ResponseMimeType: "application/json",
			ResponseSchema:   responseSchema(),
			Temperature:      0,
			// Enough room for the small JSON object.
			MaxOutputTokens: 800,
			// Disable "thinking" so it cannot consume the output budget and
			// leave no room for the JSON (which caused empty parts / MAX_TOKENS).
			ThinkingConfig: &thinkingConfig{ThinkingBudget: 0},
		},
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, ErrUpstream
	}

	// The API key goes in a header, never in the URL, so it cannot end up in
	// request logs that capture the path.
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", g.model)

	// Retry transient upstream failures (503 "high demand", 429) with a short
	// backoff. Non-transient errors (model unavailable, bad image) return
	// immediately. Honours ctx cancellation/timeout between attempts.
	const maxAttempts = 4
	var lastErr error
	for attempt := 0; attempt < maxAttempts; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(time.Duration(attempt) * 700 * time.Millisecond):
			}
		}

		receipt, err := g.doRequest(ctx, url, payload)
		if err == nil {
			return receipt, nil
		}
		lastErr = err
		// Only retry on transient quota/busy; everything else is final.
		if err != ErrQuotaExceeded {
			return nil, err
		}
	}
	return nil, lastErr
}

// doRequest performs a single generateContent call and parses the result.
func (g *geminiProvider) doRequest(ctx context.Context, url string, payload []byte) (*Receipt, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, ErrUpstream
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", g.apiKey)

	resp, err := g.client.Do(httpReq)
	if err != nil {
		// Context cancellation (user pressed Batal) or timeout bubbles up here.
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}
		return nil, ErrUpstream
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))

	switch {
	case resp.StatusCode == http.StatusOK:
		// fallthrough to parse
	case resp.StatusCode == http.StatusTooManyRequests:
		return nil, ErrQuotaExceeded
	case resp.StatusCode == http.StatusServiceUnavailable:
		// "Model experiencing high demand" — transient; tell the user it is busy.
		return nil, ErrQuotaExceeded
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusForbidden:
		// Model not found or no access for this project.
		return nil, ErrModelUnavailable
	case resp.StatusCode == http.StatusBadRequest:
		return nil, ErrBadImage
	default:
		return nil, ErrUpstream
	}

	var gr geminiResponse
	if err := json.Unmarshal(body, &gr); err != nil {
		return nil, ErrUpstream
	}
	if len(gr.Candidates) == 0 {
		return nil, ErrBadImage
	}
	cand := gr.Candidates[0]

	// Find the first non-empty text part. Some models may emit multiple parts;
	// the JSON answer is the one with text content.
	jsonText := ""
	for _, p := range cand.Content.Parts {
		if p.Text != "" {
			jsonText = p.Text
			break
		}
	}

	// No usable text: usually the output budget was exhausted (MAX_TOKENS) or
	// the content was blocked. Treat as an unreadable image for the user.
	if jsonText == "" {
		log.Printf("receipt scan: empty content (finishReason=%s)", cand.FinishReason)
		return nil, ErrBadImage
	}

	// The model returns our JSON object as a string.
	var receipt Receipt
	if err := json.Unmarshal([]byte(jsonText), &receipt); err != nil {
		log.Printf("receipt scan: model returned non-JSON text (finishReason=%s)", cand.FinishReason)
		return nil, ErrUpstream
	}
	if receipt.Currency == "" {
		receipt.Currency = "IDR"
	}
	receipt.Usage = &TokenUsage{
		PromptTokens: gr.UsageMetadata.PromptTokenCount,
		OutputTokens: gr.UsageMetadata.CandidatesTokenCount,
		TotalTokens:  gr.UsageMetadata.TotalTokenCount,
	}
	return &receipt, nil
}
