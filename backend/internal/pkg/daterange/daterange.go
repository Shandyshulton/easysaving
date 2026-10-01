package daterange

import (
	"sync"
	"time"
)

// jakartaOnce guards the one-time timezone lookup.
var (
	jakartaOnce sync.Once
	jakartaLoc  *time.Location
)

// Jakarta returns the Asia/Jakarta location used for every scheduling decision.
// The binary embeds the timezone database (see the `time/tzdata` import in
// cmd/api/main.go) so this works even on minimal images such as Alpine. If the
// lookup still fails we fall back to a fixed +07:00 offset, which is correct for
// Western Indonesia Time (WIB) since it has no daylight saving.
func Jakarta() *time.Location {
	jakartaOnce.Do(func() {
		if loc, err := time.LoadLocation("Asia/Jakarta"); err == nil {
			jakartaLoc = loc
			return
		}
		jakartaLoc = time.FixedZone("WIB", 7*60*60)
	})
	return jakartaLoc
}

// TodayJakarta returns today's date (midnight) in Asia/Jakarta.
func TodayJakarta() time.Time {
	now := time.Now().In(Jakarta())
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, Jakarta())
}

// ParseDateJakarta parses a YYYY-MM-DD string as a date in Asia/Jakarta.
func ParseDateJakarta(value string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", value, Jakarta())
}

// ToJakartaDate normalises any time to a midnight date in Asia/Jakarta, keeping
// the calendar day the value represents.
func ToJakartaDate(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, Jakarta())
}

func ParseDate(value string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02", value, time.Local)
}

func ForPeriod(period, value string) (time.Time, time.Time, string, error) {
	base, err := ParseDate(value)
	if err != nil {
		return time.Time{}, time.Time{}, "", err
	}
	switch period {
	case "daily":
		return base, base, "daily", nil
	case "weekly":
		weekday := int(base.Weekday())
		if weekday == 0 {
			weekday = 7
		}
		start := base.AddDate(0, 0, -(weekday - 1))
		return start, start.AddDate(0, 0, 6), "weekly", nil
	case "monthly":
		start := time.Date(base.Year(), base.Month(), 1, 0, 0, 0, 0, base.Location())
		return start, start.AddDate(0, 1, -1), "monthly", nil
	default:
		return base, base, "daily", nil
	}
}
