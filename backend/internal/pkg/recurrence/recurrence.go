// Package recurrence contains the pure date arithmetic behind scheduled
// transactions. It has no dependency on the database or HTTP layer so the rules
// can be unit tested in isolation.
package recurrence

import "time"

// Frequency mirrors the domain frequency values.
type Frequency string

const (
	Daily   Frequency = "daily"
	Weekly  Frequency = "weekly"
	Monthly Frequency = "monthly"
	Yearly  Frequency = "yearly"
)

// DateOnly strips the clock part, keeping the location. All recurrence math works
// on whole days.
func DateOnly(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

// daysInMonth returns how many days the given year/month has.
func daysInMonth(year int, month time.Month) int {
	// Day 0 of the next month is the last day of this month.
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func floorDiv(a, b int) int {
	q := a / b
	if (a%b != 0) && ((a < 0) != (b < 0)) {
		q--
	}
	return q
}

func floorMod(a, b int) int {
	return a - floorDiv(a, b)*b
}

// addMonthsAnchored adds months to start while keeping the *original* day of month
// as the anchor. When the target month is shorter the date is clamped to that
// month's last day, but the anchor is never lost. This is what prevents drift:
// 31 Jan -> 28 Feb -> 31 Mar (not 28 Mar).
func addMonthsAnchored(start time.Time, months int) time.Time {
	anchorDay := start.Day()
	total := int(start.Month()) - 1 + months
	year := start.Year() + floorDiv(total, 12)
	month := time.Month(floorMod(total, 12) + 1)

	day := anchorDay
	if max := daysInMonth(year, month); day > max {
		day = max
	}
	return time.Date(year, month, day, 0, 0, 0, 0, start.Location())
}

// stepDays returns the fixed day step for day-based frequencies.
func stepDays(freq Frequency, interval int) int {
	switch freq {
	case Daily:
		return interval
	case Weekly:
		return 7 * interval
	}
	return 0
}

// stepMonths returns the month step for month-based frequencies.
func stepMonths(freq Frequency, interval int) int {
	switch freq {
	case Monthly:
		return interval
	case Yearly:
		return 12 * interval
	}
	return 0
}

// Occurrence returns the k-th occurrence of the schedule, where k = 0 is the
// start date itself. Negative k is treated as 0.
func Occurrence(freq Frequency, interval int, start time.Time, k int) time.Time {
	if interval < 1 {
		interval = 1
	}
	if k < 0 {
		k = 0
	}
	start = DateOnly(start)

	if days := stepDays(freq, interval); days > 0 {
		return start.AddDate(0, 0, days*k)
	}
	if months := stepMonths(freq, interval); months > 0 {
		return addMonthsAnchored(start, months*k)
	}
	// Unknown frequency: behave like a one-off on the start date.
	return start
}

// NextAfter returns the earliest occurrence strictly after `after`.
// If the schedule has not started yet, the start date is returned.
func NextAfter(freq Frequency, interval int, start, after time.Time) time.Time {
	if interval < 1 {
		interval = 1
	}
	start = DateOnly(start)
	after = DateOnly(after)

	if start.After(after) {
		return start
	}

	k := estimateIndex(freq, interval, start, after)
	if k < 0 {
		k = 0
	}
	// Walk back to the first candidate that is not after `after`, then step forward
	// until we pass it. The loops are bounded because the estimate is at most a
	// couple of steps away.
	for k > 0 && Occurrence(freq, interval, start, k-1).After(after) {
		k--
	}
	for !Occurrence(freq, interval, start, k).After(after) {
		k++
	}
	return Occurrence(freq, interval, start, k)
}

// NextOnOrAfter returns the earliest occurrence on or after `from`. Useful when
// initialising next_due_date from a start date.
func NextOnOrAfter(freq Frequency, interval int, start, from time.Time) time.Time {
	start = DateOnly(start)
	from = DateOnly(from)
	if !start.Before(from) {
		return start
	}
	return NextAfter(freq, interval, start, from.AddDate(0, 0, -1))
}

// estimateIndex gives a close starting guess for the occurrence index so that
// catching up across long gaps stays cheap.
func estimateIndex(freq Frequency, interval int, start, after time.Time) int {
	if days := stepDays(freq, interval); days > 0 {
		diff := int(after.Sub(start).Hours() / 24)
		return diff / days
	}
	if months := stepMonths(freq, interval); months > 0 {
		diff := (after.Year()-start.Year())*12 + int(after.Month()) - int(start.Month())
		return diff / months
	}
	return 0
}

// Occurrences collects every occurrence in the inclusive range [from, to],
// stopping at `limit` items. A limit <= 0 means no cap. It is used for catch-up
// so a missed job can replay the schedules it skipped.
func Occurrences(freq Frequency, interval int, start, from, to time.Time, limit int) []time.Time {
	from = DateOnly(from)
	to = DateOnly(to)
	if to.Before(from) {
		return nil
	}

	var result []time.Time
	current := NextOnOrAfter(freq, interval, start, from)
	for !current.After(to) {
		result = append(result, current)
		if limit > 0 && len(result) >= limit {
			break
		}
		next := NextAfter(freq, interval, start, current)
		if !next.After(current) {
			break // safety valve against a non-advancing schedule
		}
		current = next
	}
	return result
}
