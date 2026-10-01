package ratelimit

import (
	"testing"
	"time"
)

func TestReceiptLimiter_PerUserMinute(t *testing.T) {
	l := NewReceiptLimiter(2, 100, 100)

	// First two allowed, each released so in-flight does not block.
	for i := 0; i < 2; i++ {
		d := l.Acquire("u1")
		if !d.Allowed {
			t.Fatalf("request %d should be allowed", i)
		}
		l.Release("u1")
	}
	// Third within the same minute is blocked by per-user-minute.
	d := l.Acquire("u1")
	if d.Allowed || d.Reason != "user_minute" {
		t.Fatalf("expected user_minute block, got %+v", d)
	}
	if d.RetryAfter <= 0 {
		t.Fatalf("expected positive RetryAfter, got %v", d.RetryAfter)
	}
}

func TestReceiptLimiter_InFlight(t *testing.T) {
	l := NewReceiptLimiter(10, 100, 100)
	d := l.Acquire("u1")
	if !d.Allowed {
		t.Fatal("first should be allowed")
	}
	// Second without releasing is blocked as in-flight.
	d2 := l.Acquire("u1")
	if d2.Allowed || d2.Reason != "in_flight" {
		t.Fatalf("expected in_flight block, got %+v", d2)
	}
	l.Release("u1")
	d3 := l.Acquire("u1")
	if !d3.Allowed {
		t.Fatal("after release should be allowed")
	}
}

func TestReceiptLimiter_Global(t *testing.T) {
	l := NewReceiptLimiter(100, 100, 2)
	// Two different users consume the global minute budget of 2.
	for _, u := range []string{"a", "b"} {
		d := l.Acquire(u)
		if !d.Allowed {
			t.Fatalf("user %s should be allowed", u)
		}
		l.Release(u)
	}
	d := l.Acquire("c")
	if d.Allowed || d.Reason != "global_minute" {
		t.Fatalf("expected global_minute block, got %+v", d)
	}
}

func TestReceiptLimiter_WindowResets(t *testing.T) {
	l := NewReceiptLimiter(1, 100, 100)
	now := time.Now()
	l.now = func() time.Time { return now }

	d := l.Acquire("u1")
	if !d.Allowed {
		t.Fatal("first allowed")
	}
	l.Release("u1")

	d = l.Acquire("u1")
	if d.Allowed {
		t.Fatal("second blocked in same minute")
	}

	// Advance past the minute window.
	now = now.Add(61 * time.Second)
	d = l.Acquire("u1")
	if !d.Allowed {
		t.Fatalf("expected allowed after window reset, got %+v", d)
	}
}

func TestReceiptLimiter_RejectDoesNotConsume(t *testing.T) {
	// Per-minute = 1, in-flight blocks must not consume the minute budget.
	l := NewReceiptLimiter(1, 100, 100)
	d := l.Acquire("u1")
	if !d.Allowed {
		t.Fatal("first allowed")
	}
	// in-flight block (not released yet)
	if d2 := l.Acquire("u1"); d2.Reason != "in_flight" {
		t.Fatalf("expected in_flight, got %+v", d2)
	}
	l.Release("u1")
	// The minute budget (1) was consumed by the first; now should be user_minute.
	if d3 := l.Acquire("u1"); d3.Allowed || d3.Reason != "user_minute" {
		t.Fatalf("expected user_minute, got %+v", d3)
	}
}
