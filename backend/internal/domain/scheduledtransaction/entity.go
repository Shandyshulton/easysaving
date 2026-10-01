package scheduledtransaction

import (
	"errors"
	"fmt"
	"time"

	domaintransaction "easysaving/backend/internal/domain/transaction"

	"github.com/shopspring/decimal"
)

// MaxRemindDaysBefore caps how early a reminder may surface before its due date.
// Mirrored by the chk_scheduled_remind_days database constraint and the form.
const MaxRemindDaysBefore = 30

// DefaultRemindDaysBefore is used when the client omits the field.
const DefaultRemindDaysBefore = 3

// Mode determines whether the schedule records a transaction automatically or
// only reminds the user to confirm it.
type Mode string

const (
	// ModeAuto records the transaction automatically when it falls due.
	ModeAuto Mode = "auto"
	// ModeRemind only surfaces the schedule in the due list; the user confirms it.
	ModeRemind Mode = "remind"
)

func (m Mode) IsValid() bool {
	return m == ModeAuto || m == ModeRemind
}

// Frequency of the recurrence.
type Frequency string

const (
	FrequencyDaily   Frequency = "daily"
	FrequencyWeekly  Frequency = "weekly"
	FrequencyMonthly Frequency = "monthly"
	FrequencyYearly  Frequency = "yearly"
)

func (f Frequency) IsValid() bool {
	switch f {
	case FrequencyDaily, FrequencyWeekly, FrequencyMonthly, FrequencyYearly:
		return true
	}
	return false
}

// ScheduledTransaction is a recurring money movement template.
//
// Amount is optional (nil) for ModeRemind, where it only acts as an estimate and
// the real amount is supplied when the user marks the bill as paid. For ModeAuto
// the amount is mandatory and must be greater than zero.
type ScheduledTransaction struct {
	ID         string `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     string `gorm:"type:uuid;not null;index" json:"user_id"`
	AccountID  string `gorm:"type:uuid;not null;index" json:"account_id"`
	CategoryID string `gorm:"type:uuid;not null;index" json:"category_id"`

	Type   domaintransaction.Type `gorm:"size:20;not null" json:"type"`
	Name   string                 `gorm:"size:120;not null" json:"name"`
	Amount *decimal.Decimal       `gorm:"type:numeric(18,2)" json:"amount,omitempty"`
	Mode   Mode                   `gorm:"size:20;not null;default:'auto'" json:"mode"`

	Frequency Frequency `gorm:"size:20;not null" json:"frequency"`
	Interval  int       `gorm:"not null;default:1" json:"interval"`

	StartDate   time.Time  `gorm:"type:date;not null" json:"start_date"`
	EndDate     *time.Time `gorm:"type:date" json:"end_date,omitempty"`
	NextDueDate time.Time  `gorm:"type:date;not null;index" json:"next_due_date"`

	RemindDaysBefore int  `gorm:"not null;default:3" json:"remind_days_before"`
	IsActive         bool `gorm:"not null;default:true;index" json:"is_active"`

	Notes     string    `gorm:"type:text" json:"notes"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// OverduePeriods is computed, never stored: how many whole periods are already
	// past due. It lets the UI collapse a long backlog into a single
	// "Terlambat N periode" row instead of guessing with its own date maths.
	OverduePeriods int `gorm:"-" json:"overdue_periods"`
}

// Validate checks the invariants that must hold regardless of transport layer.
func (s ScheduledTransaction) Validate() error {
	if !s.Type.IsValid() {
		return errors.New("invalid transaction type")
	}
	if !s.Mode.IsValid() {
		return errors.New("invalid mode")
	}
	if !s.Frequency.IsValid() {
		return errors.New("invalid frequency")
	}
	if s.Interval < 1 {
		return errors.New("interval must be at least 1")
	}
	if s.Name == "" {
		return errors.New("name is required")
	}
	if s.Mode == ModeAuto {
		if s.Amount == nil || !s.Amount.GreaterThan(decimal.Zero) {
			return errors.New("amount is required and must be greater than zero for auto mode")
		}
	}
	if s.Amount != nil && !s.Amount.GreaterThan(decimal.Zero) {
		return errors.New("amount must be greater than zero")
	}
	if s.RemindDaysBefore < 0 || s.RemindDaysBefore > MaxRemindDaysBefore {
		return fmt.Errorf("remind_days_before must be between 0 and %d", MaxRemindDaysBefore)
	}
	if s.EndDate != nil && s.EndDate.Before(s.StartDate) {
		return errors.New("end_date cannot be before start_date")
	}
	return nil
}

// Finished reports whether the schedule has passed its end date.
func (s ScheduledTransaction) Finished() bool {
	return s.EndDate != nil && s.NextDueDate.After(*s.EndDate)
}
