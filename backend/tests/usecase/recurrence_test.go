package usecase_test

import (
	"testing"
	"time"

	"easysaving/backend/internal/pkg/recurrence"
)

// date is a small helper to keep the table-driven tests readable.
func date(y int, m time.Month, d int) time.Time {
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}

func TestNextAfterDaily(t *testing.T) {
	start := date(2026, time.January, 1)

	got := recurrence.NextAfter(recurrence.Daily, 1, start, date(2026, time.January, 1))
	if want := date(2026, time.January, 2); !got.Equal(want) {
		t.Fatalf("daily interval 1: got %s want %s", got, want)
	}

	// Interval > 1 must land on multiples of the interval from the start date.
	got = recurrence.NextAfter(recurrence.Daily, 3, start, date(2026, time.January, 5))
	if want := date(2026, time.January, 7); !got.Equal(want) {
		t.Fatalf("daily interval 3: got %s want %s", got, want)
	}
}

func TestNextAfterWeekly(t *testing.T) {
	// 2026-01-05 is a Monday.
	start := date(2026, time.January, 5)

	got := recurrence.NextAfter(recurrence.Weekly, 1, start, start)
	if want := date(2026, time.January, 12); !got.Equal(want) {
		t.Fatalf("weekly: got %s want %s", got, want)
	}
	if got.Weekday() != time.Monday {
		t.Fatalf("weekly must stay on the same weekday, got %s", got.Weekday())
	}

	// Bi-weekly.
	got = recurrence.NextAfter(recurrence.Weekly, 2, start, date(2026, time.January, 20))
	if want := date(2026, time.February, 2); !got.Equal(want) {
		t.Fatalf("weekly interval 2: got %s want %s", got, want)
	}
}

// The critical end-of-month rule: a schedule anchored on the 31st must clamp to
// the shorter month and then bounce back, never drifting to the 28th permanently.
func TestMonthlyEndOfMonthDoesNotDrift(t *testing.T) {
	start := date(2026, time.January, 31) // 2026 is not a leap year

	want := []time.Time{
		date(2026, time.February, 28),
		date(2026, time.March, 31),
		date(2026, time.April, 30),
		date(2026, time.May, 31),
	}

	current := start
	for i, expected := range want {
		current = recurrence.NextAfter(recurrence.Monthly, 1, start, current)
		if !current.Equal(expected) {
			t.Fatalf("step %d: got %s want %s", i+1, current.Format("2006-01-02"), expected.Format("2006-01-02"))
		}
	}
}

func TestMonthlyEndOfMonthLeapYear(t *testing.T) {
	start := date(2028, time.January, 31) // 2028 is a leap year

	got := recurrence.NextAfter(recurrence.Monthly, 1, start, start)
	if want := date(2028, time.February, 29); !got.Equal(want) {
		t.Fatalf("leap February: got %s want %s", got.Format("2006-01-02"), want.Format("2006-01-02"))
	}

	got = recurrence.NextAfter(recurrence.Monthly, 1, start, got)
	if want := date(2028, time.March, 31); !got.Equal(want) {
		t.Fatalf("after leap February: got %s want %s", got.Format("2006-01-02"), want.Format("2006-01-02"))
	}
}

func TestMonthlyIntervalGreaterThanOne(t *testing.T) {
	start := date(2026, time.January, 31)

	// Quarterly from 31 Jan: Apr has 30 days, Jul has 31.
	got := recurrence.NextAfter(recurrence.Monthly, 3, start, start)
	if want := date(2026, time.April, 30); !got.Equal(want) {
		t.Fatalf("quarterly step 1: got %s want %s", got.Format("2006-01-02"), want.Format("2006-01-02"))
	}
	got = recurrence.NextAfter(recurrence.Monthly, 3, start, got)
	if want := date(2026, time.July, 31); !got.Equal(want) {
		t.Fatalf("quarterly step 2: got %s want %s", got.Format("2006-01-02"), want.Format("2006-01-02"))
	}
}

// A yearly schedule anchored on 29 February must fall back to 28 February in
// common years and return to the 29th in leap years.
func TestYearlyLeapDay(t *testing.T) {
	start := date(2028, time.February, 29) // leap year

	got := recurrence.NextAfter(recurrence.Yearly, 1, start, start)
	if want := date(2029, time.February, 28); !got.Equal(want) {
		t.Fatalf("yearly into common year: got %s want %s", got.Format("2006-01-02"), want.Format("2006-01-02"))
	}

	// Four years later the anchor day is available again.
	got = recurrence.Occurrence(recurrence.Yearly, 1, start, 4)
	if want := date(2032, time.February, 29); !got.Equal(want) {
		t.Fatalf("yearly back to leap day: got %s want %s", got.Format("2006-01-02"), want.Format("2006-01-02"))
	}
}

func TestNextOnOrAfterReturnsStartWhenNotStarted(t *testing.T) {
	start := date(2026, time.June, 10)

	got := recurrence.NextOnOrAfter(recurrence.Monthly, 1, start, date(2026, time.January, 1))
	if !got.Equal(start) {
		t.Fatalf("future schedule should return start date, got %s", got.Format("2006-01-02"))
	}

	// Exactly on the start date it stays on the start date.
	got = recurrence.NextOnOrAfter(recurrence.Monthly, 1, start, start)
	if !got.Equal(start) {
		t.Fatalf("on start date should return start date, got %s", got.Format("2006-01-02"))
	}
}

// Catch-up: collecting the occurrences that a stopped server missed, and the
// behaviour once the end date is passed.
func TestOccurrencesCatchUpAndEndDate(t *testing.T) {
	start := date(2026, time.January, 31)

	// Server was down from February to May: four occurrences are missed.
	got := recurrence.Occurrences(recurrence.Monthly, 1, start, date(2026, time.February, 1), date(2026, time.May, 31), 0)
	want := []time.Time{
		date(2026, time.February, 28),
		date(2026, time.March, 31),
		date(2026, time.April, 30),
		date(2026, time.May, 31),
	}
	if len(got) != len(want) {
		t.Fatalf("catch-up count: got %d want %d (%v)", len(got), len(want), got)
	}
	for i := range want {
		if !got[i].Equal(want[i]) {
			t.Fatalf("catch-up item %d: got %s want %s", i, got[i].Format("2006-01-02"), want[i].Format("2006-01-02"))
		}
	}

	// The limit caps how much a single run replays.
	limited := recurrence.Occurrences(recurrence.Monthly, 1, start, date(2026, time.February, 1), date(2026, time.May, 31), 2)
	if len(limited) != 2 {
		t.Fatalf("limit should cap results, got %d", len(limited))
	}

	// Past the end date nothing is produced.
	none := recurrence.Occurrences(recurrence.Monthly, 1, start, date(2026, time.June, 1), date(2026, time.May, 31), 0)
	if len(none) != 0 {
		t.Fatalf("range ending before it starts must be empty, got %v", none)
	}
}

func TestEndDatePassedStopsSchedule(t *testing.T) {
	start := date(2026, time.January, 10)
	endDate := date(2026, time.March, 31)

	// The occurrence after the end date must fall outside the window, which is how
	// the usecase detects a finished schedule.
	next := recurrence.NextAfter(recurrence.Monthly, 1, start, date(2026, time.March, 10))
	if want := date(2026, time.April, 10); !next.Equal(want) {
		t.Fatalf("next occurrence: got %s want %s", next.Format("2006-01-02"), want.Format("2006-01-02"))
	}
	if !next.After(endDate) {
		t.Fatalf("expected %s to be after end date %s", next.Format("2006-01-02"), endDate.Format("2006-01-02"))
	}
}
