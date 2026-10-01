package ratelimit

import (
	"sync"
	"time"
)

// ReceiptLimiter enforces three independent limits for the receipt scan
// feature, all in-memory (single-instance deployment):
//   - per user per minute
//   - per user per day (calendar day in server local time)
//   - global per minute (protects the per-project Gemini quota)
//
// It also enforces that a single user has at most one scan in flight at a time.
//
// It stores only counters and timestamps, never request contents.
type ReceiptLimiter struct {
	mu sync.Mutex

	perUserPerMin int
	perUserPerDay int
	globalPerMin  int

	userMinute map[string]*window
	userDay    map[string]*window
	global     *window

	inFlight map[string]bool

	now func() time.Time
}

type window struct {
	count int
	reset time.Time
}

func NewReceiptLimiter(perUserPerMin, perUserPerDay, globalPerMin int) *ReceiptLimiter {
	return &ReceiptLimiter{
		perUserPerMin: perUserPerMin,
		perUserPerDay: perUserPerDay,
		globalPerMin:  globalPerMin,
		userMinute:    make(map[string]*window),
		userDay:       make(map[string]*window),
		global:        &window{},
		inFlight:      make(map[string]bool),
		now:           time.Now,
	}
}

// Decision reports whether a request is allowed and, if not, how long to wait.
type Decision struct {
	Allowed    bool
	RetryAfter time.Duration
	Reason     string // "user_minute" | "user_day" | "global_minute" | "in_flight"
}

func bump(w *window, limit int, now time.Time, dur time.Duration) (bool, time.Duration) {
	if now.After(w.reset) {
		w.count = 0
		w.reset = now.Add(dur)
	}
	if w.count >= limit {
		return false, time.Until(w.reset)
	}
	w.count++
	return true, 0
}

// Acquire checks all limits and, when allowed, marks the user as having a scan
// in flight. Call Release when the scan finishes. Counters are only consumed
// when the request is allowed.
func (l *ReceiptLimiter) Acquire(userID string) Decision {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()

	if l.inFlight[userID] {
		return Decision{Allowed: false, RetryAfter: 2 * time.Second, Reason: "in_flight"}
	}

	// Peek all windows first so a rejection does not consume another window's
	// quota. Use temporary copies for the check.
	um := l.ensure(l.userMinute, userID)
	ud := l.ensure(l.userDay, userID)

	// Check day first (longest window), then minute, then global.
	if ok, retry := peek(ud, l.perUserPerDay, now, 24*time.Hour); !ok {
		return Decision{Allowed: false, RetryAfter: retry, Reason: "user_day"}
	}
	if ok, retry := peek(um, l.perUserPerMin, now, time.Minute); !ok {
		return Decision{Allowed: false, RetryAfter: retry, Reason: "user_minute"}
	}
	if ok, retry := peek(l.global, l.globalPerMin, now, time.Minute); !ok {
		return Decision{Allowed: false, RetryAfter: retry, Reason: "global_minute"}
	}

	// All good: consume.
	bump(ud, l.perUserPerDay, now, 24*time.Hour)
	bump(um, l.perUserPerMin, now, time.Minute)
	bump(l.global, l.globalPerMin, now, time.Minute)
	l.inFlight[userID] = true

	return Decision{Allowed: true}
}

// Release clears the in-flight flag for a user. Safe to call always.
func (l *ReceiptLimiter) Release(userID string) {
	l.mu.Lock()
	delete(l.inFlight, userID)
	l.mu.Unlock()
}

func (l *ReceiptLimiter) ensure(m map[string]*window, key string) *window {
	w := m[key]
	if w == nil {
		w = &window{}
		m[key] = w
	}
	return w
}

// peek reports whether the window currently has room, without consuming it.
func peek(w *window, limit int, now time.Time, dur time.Duration) (bool, time.Duration) {
	if now.After(w.reset) {
		return true, 0 // window will reset on bump
	}
	if w.count >= limit {
		return false, time.Until(w.reset)
	}
	return true, 0
}
