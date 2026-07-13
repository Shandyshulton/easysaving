package daterange

import "time"

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
