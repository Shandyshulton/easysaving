package scheduled

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	domainaccount "easysaving/backend/internal/domain/account"
	domaincategory "easysaving/backend/internal/domain/category"
	domainscheduled "easysaving/backend/internal/domain/scheduledtransaction"
	domaintransaction "easysaving/backend/internal/domain/transaction"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/daterange"
	"easysaving/backend/internal/pkg/money"
	"easysaving/backend/internal/pkg/recurrence"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// MaxCatchUp caps how many missed occurrences a single run replays per schedule.
// Anything older is skipped (and logged) so a server that was down for a year
// cannot flood the ledger in one go.
const MaxCatchUp = 12

type Usecase struct {
	scheduled    domainscheduled.Repository
	transactions domaintransaction.Repository
	accounts     domainaccount.Repository
	categories   domaincategory.Repository
}

func New(
	scheduled domainscheduled.Repository,
	transactions domaintransaction.Repository,
	accounts domainaccount.Repository,
	categories domaincategory.Repository,
) *Usecase {
	return &Usecase{scheduled: scheduled, transactions: transactions, accounts: accounts, categories: categories}
}

// ---------------------------------------------------------------- CRUD

func (u *Usecase) List(ctx context.Context, userID string, req dto.ScheduledTransactionFilterRequest) ([]domainscheduled.ScheduledTransaction, error) {
	filter := domainscheduled.Filter{UserID: userID, AccountID: req.AccountID, Mode: req.Mode}
	switch req.IsActive {
	case "true":
		active := true
		filter.IsActive = &active
	case "false":
		active := false
		filter.IsActive = &active
	}
	items, err := u.scheduled.List(ctx, filter)
	if err != nil {
		return nil, err
	}
	today := daterange.TodayJakarta()
	for i := range items {
		items[i].OverduePeriods = overduePeriods(&items[i], today)
	}
	return items, nil
}

func (u *Usecase) Get(ctx context.Context, userID, id string) (*domainscheduled.ScheduledTransaction, error) {
	item, err := u.scheduled.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	item.OverduePeriods = overduePeriods(item, daterange.TodayJakarta())
	return item, nil
}

// overduePeriods counts how many occurrences are due on or before `today`, using
// the same recurrence rules as the scheduler.
func overduePeriods(schedule *domainscheduled.ScheduledTransaction, today time.Time) int {
	if !schedule.IsActive {
		return 0
	}
	next := daterange.ToJakartaDate(schedule.NextDueDate)
	if next.After(today) {
		return 0
	}
	upper := today
	if schedule.EndDate != nil {
		if end := daterange.ToJakartaDate(*schedule.EndDate); end.Before(upper) {
			upper = end
		}
	}
	// Cap the scan so a very old schedule cannot make this expensive.
	occurrences := recurrence.Occurrences(
		recurrence.Frequency(schedule.Frequency),
		schedule.Interval,
		daterange.ToJakartaDate(schedule.StartDate),
		next,
		upper,
		MaxCatchUp*4,
	)
	return len(occurrences)
}

// SkipPeriod advances the schedule by exactly one period without creating any
// transaction. It exists so a user who does not want to record a given period is
// not stuck with a permanently overdue reminder.
func (u *Usecase) SkipPeriod(ctx context.Context, userID, id string) (*domainscheduled.ScheduledTransaction, error) {
	schedule, err := u.scheduled.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	current := daterange.ToJakartaDate(schedule.NextDueDate)
	next := recurrence.NextAfter(
		recurrence.Frequency(schedule.Frequency),
		schedule.Interval,
		daterange.ToJakartaDate(schedule.StartDate),
		current,
	)
	schedule.NextDueDate = next
	if schedule.EndDate != nil && next.After(daterange.ToJakartaDate(*schedule.EndDate)) {
		schedule.IsActive = false
	}
	schedule.UpdatedAt = time.Now()

	if err := u.scheduled.Update(ctx, schedule); err != nil {
		return nil, err
	}
	schedule.OverduePeriods = overduePeriods(schedule, daterange.TodayJakarta())
	return schedule, nil
}

func (u *Usecase) Create(ctx context.Context, userID string, req dto.ScheduledTransactionRequest) (*domainscheduled.ScheduledTransaction, error) {
	item, err := u.build(ctx, userID, uuid.NewString(), req)
	if err != nil {
		return nil, err
	}
	// The first due date is the start date itself, so a schedule backdated by the
	// user is caught up by the next run (bounded by MaxCatchUp).
	item.NextDueDate = item.StartDate
	item.CreatedAt = time.Now()
	if err := u.scheduled.Create(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

func (u *Usecase) Update(ctx context.Context, userID, id string, req dto.ScheduledTransactionRequest) (*domainscheduled.ScheduledTransaction, error) {
	existing, err := u.scheduled.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	next, err := u.build(ctx, userID, id, req)
	if err != nil {
		return nil, err
	}
	next.CreatedAt = existing.CreatedAt

	// Keep the pending due date when the cadence is untouched; otherwise recompute
	// it from the new rules so the schedule does not fire on a stale date.
	sameCadence := existing.Frequency == next.Frequency &&
		existing.Interval == next.Interval &&
		existing.StartDate.Equal(next.StartDate)
	if sameCadence {
		next.NextDueDate = existing.NextDueDate
	} else {
		next.NextDueDate = recurrence.NextOnOrAfter(
			recurrence.Frequency(next.Frequency), next.Interval, next.StartDate, next.StartDate,
		)
	}
	if req.IsActive != nil {
		next.IsActive = *req.IsActive
	} else {
		next.IsActive = existing.IsActive
	}

	if err := u.scheduled.Update(ctx, next); err != nil {
		return nil, err
	}
	return next, nil
}

func (u *Usecase) Delete(ctx context.Context, userID, id string) error {
	// Deleting a schedule must never remove the transactions it already created.
	// The database enforces this with ON DELETE SET NULL on
	// transactions.scheduled_transaction_id.
	if _, err := u.scheduled.FindByID(ctx, id, userID); err != nil {
		return err
	}
	return u.scheduled.Delete(ctx, id, userID)
}

func (u *Usecase) SetActive(ctx context.Context, userID, id string, active bool) (*domainscheduled.ScheduledTransaction, error) {
	item, err := u.scheduled.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	item.IsActive = active
	// Resuming a schedule whose due date is long past should not replay everything
	// silently; move it to the next upcoming occurrence instead.
	if active {
		today := daterange.TodayJakarta()
		if item.NextDueDate.Before(today) {
			item.NextDueDate = recurrence.NextOnOrAfter(
				recurrence.Frequency(item.Frequency), item.Interval, item.StartDate, today,
			)
		}
	}
	item.UpdatedAt = time.Now()
	if err := u.scheduled.Update(ctx, item); err != nil {
		return nil, err
	}
	return item, nil
}

// ---------------------------------------------------------------- Preview

// PreviewResult tells the form how many backdated transactions a schedule would
// create, so the user can confirm before changing past balances and reports.
type PreviewResult struct {
	NextDueDate     string   `json:"next_due_date"`
	PastCount       int      `json:"past_count"`
	PastDates       []string `json:"past_dates"`
	SkippedTooOld   int      `json:"skipped_too_old"`
	WillCreateNow   bool     `json:"will_create_now"`
	UpcomingPreview []string `json:"upcoming_preview"`
}

func (u *Usecase) Preview(ctx context.Context, req dto.ScheduledTransactionRequest) (*PreviewResult, error) {
	start, err := daterange.ParseDateJakarta(req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date")
	}
	freq := recurrence.Frequency(req.Frequency)
	interval := req.Interval
	if interval < 1 {
		interval = 1
	}
	today := daterange.TodayJakarta()

	upper := today
	if req.EndDate != "" {
		end, err := daterange.ParseDateJakarta(req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date")
		}
		if end.Before(upper) {
			upper = end
		}
	}

	past := recurrence.Occurrences(freq, interval, start, start, upper, 0)
	result := &PreviewResult{
		PastCount:     len(past),
		WillCreateNow: len(past) > 0 && req.Mode == string(domainscheduled.ModeAuto),
	}
	if len(past) > MaxCatchUp {
		result.SkippedTooOld = len(past) - MaxCatchUp
		past = past[len(past)-MaxCatchUp:]
	}
	for _, item := range past {
		result.PastDates = append(result.PastDates, item.Format("2006-01-02"))
	}

	next := recurrence.NextOnOrAfter(freq, interval, start, today)
	if !start.Before(today) {
		next = start
	}
	result.NextDueDate = next.Format("2006-01-02")
	cursor := next
	for i := 0; i < 3; i++ {
		result.UpcomingPreview = append(result.UpcomingPreview, cursor.Format("2006-01-02"))
		cursor = recurrence.NextAfter(freq, interval, start, cursor)
	}
	return result, nil
}

// ---------------------------------------------------------------- Mark paid

// MarkPaid records the real amount for a due reminder, then advances the schedule.
func (u *Usecase) MarkPaid(ctx context.Context, userID, id string, req dto.MarkPaidRequest) (*domaintransaction.Transaction, error) {
	schedule, err := u.scheduled.FindByID(ctx, id, userID)
	if err != nil {
		return nil, err
	}
	amount, err := money.ParsePositive(req.Amount)
	if err != nil {
		return nil, err
	}

	txDate := daterange.TodayJakarta()
	if strings.TrimSpace(req.TransactionDate) != "" {
		parsed, err := daterange.ParseDateJakarta(req.TransactionDate)
		if err != nil {
			return nil, errors.New("invalid transaction_date")
		}
		txDate = parsed
	}

	dueDate := daterange.ToJakartaDate(schedule.NextDueDate)
	notes := strings.TrimSpace(req.Notes)
	if notes == "" {
		notes = schedule.Name
	}

	item := &domaintransaction.Transaction{
		ID:                     uuid.NewString(),
		UserID:                 userID,
		AccountID:              schedule.AccountID,
		CategoryID:             schedule.CategoryID,
		Type:                   schedule.Type,
		Amount:                 amount,
		TransactionDate:        txDate,
		Notes:                  notes,
		ScheduledTransactionID: &schedule.ID,
		ScheduledDueDate:       &dueDate,
		UpdatedAt:              time.Now(),
	}

	err = u.scheduled.WithTx(ctx, func(tx *gorm.DB) error {
		created, err := u.transactions.CreateIfNotExistsTx(ctx, tx, item)
		if err != nil {
			return err
		}
		if !created {
			return errors.New("tagihan untuk periode ini sudah dicatat")
		}
		// Same balance path as a manual transaction.
		if err := u.accounts.AdjustBalance(ctx, tx, item.AccountID, userID, item.BalanceDelta()); err != nil {
			return err
		}
		u.advance(schedule, dueDate)
		return u.scheduled.UpdateTx(ctx, tx, schedule)
	})
	if err != nil {
		return nil, err
	}
	return item, nil
}

// ---------------------------------------------------------------- Scheduler

// ProcessDue runs every active schedule that has fallen due. Pass an empty userID
// to process every user (the background ticker) or a specific user (manual run).
//
// Each schedule is handled in its own database transaction so a single failure
// cannot roll back or block the others.
func (u *Usecase) ProcessDue(ctx context.Context, userID string) (dto.ScheduledRunResult, error) {
	var result dto.ScheduledRunResult

	today := daterange.TodayJakarta()
	ids, err := u.scheduled.DueIDs(ctx, userID, today)
	if err != nil {
		return result, err
	}

	for _, id := range ids {
		result.Processed++

		var created, truncated int
		err := u.scheduled.WithTx(ctx, func(tx *gorm.DB) error {
			schedule, err := u.scheduled.LockForProcessing(ctx, tx, id)
			if err != nil {
				return err
			}
			// Locked by another runner, or vanished meanwhile.
			if schedule == nil {
				return nil
			}
			if !schedule.IsActive {
				return nil
			}
			// Reminders never post automatically; they stay in the due list until the
			// user confirms the real amount.
			if schedule.Mode != domainscheduled.ModeAuto {
				return nil
			}
			created, truncated, err = u.runAuto(ctx, tx, schedule, today)
			return err
		})

		switch {
		case err != nil:
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", id, err))
		case created == 0:
			result.Skipped++
		default:
			result.Created += created
		}
		result.Truncated += truncated
	}

	log.Printf(
		"scheduled run: processed=%d created=%d skipped=%d failed=%d truncated=%d",
		result.Processed, result.Created, result.Skipped, result.Failed, result.Truncated,
	)
	if result.Truncated > 0 {
		log.Printf("scheduled run warning: %d occurrence(s) older than the %d-period catch-up limit were skipped", result.Truncated, MaxCatchUp)
	}
	return result, nil
}

// runAuto creates the missing transactions for an auto schedule and advances it.
func (u *Usecase) runAuto(ctx context.Context, tx *gorm.DB, schedule *domainscheduled.ScheduledTransaction, today time.Time) (int, int, error) {
	if schedule.Amount == nil {
		return 0, 0, errors.New("auto schedule without amount")
	}

	upper := today
	if schedule.EndDate != nil {
		end := daterange.ToJakartaDate(*schedule.EndDate)
		if end.Before(upper) {
			upper = end
		}
	}

	freq := recurrence.Frequency(schedule.Frequency)
	occurrences := recurrence.Occurrences(
		freq, schedule.Interval,
		daterange.ToJakartaDate(schedule.StartDate),
		daterange.ToJakartaDate(schedule.NextDueDate),
		upper, 0,
	)

	truncated := 0
	if len(occurrences) > MaxCatchUp {
		truncated = len(occurrences) - MaxCatchUp
		occurrences = occurrences[len(occurrences)-MaxCatchUp:]
	}

	created := 0
	for _, due := range occurrences {
		dueDate := due
		item := &domaintransaction.Transaction{
			ID:                     uuid.NewString(),
			UserID:                 schedule.UserID,
			AccountID:              schedule.AccountID,
			CategoryID:             schedule.CategoryID,
			Type:                   schedule.Type,
			Amount:                 *schedule.Amount,
			TransactionDate:        dueDate,
			Notes:                  schedule.Name,
			ScheduledTransactionID: &schedule.ID,
			ScheduledDueDate:       &dueDate,
			UpdatedAt:              time.Now(),
		}
		inserted, err := u.transactions.CreateIfNotExistsTx(ctx, tx, item)
		if err != nil {
			return created, truncated, err
		}
		if !inserted {
			// Another run already handled this occurrence.
			continue
		}
		if err := u.accounts.AdjustBalance(ctx, tx, item.AccountID, schedule.UserID, item.BalanceDelta()); err != nil {
			return created, truncated, err
		}
		created++
	}

	u.advance(schedule, today)
	if err := u.scheduled.UpdateTx(ctx, tx, schedule); err != nil {
		return created, truncated, err
	}
	return created, truncated, nil
}

// advance moves next_due_date past `from` and deactivates a finished schedule.
func (u *Usecase) advance(schedule *domainscheduled.ScheduledTransaction, from time.Time) {
	next := recurrence.NextAfter(
		recurrence.Frequency(schedule.Frequency),
		schedule.Interval,
		daterange.ToJakartaDate(schedule.StartDate),
		daterange.ToJakartaDate(from),
	)
	schedule.NextDueDate = next
	if schedule.EndDate != nil && next.After(daterange.ToJakartaDate(*schedule.EndDate)) {
		schedule.IsActive = false
	}
	schedule.UpdatedAt = time.Now()
}

// ---------------------------------------------------------------- helpers

func (u *Usecase) build(ctx context.Context, userID, id string, req dto.ScheduledTransactionRequest) (*domainscheduled.ScheduledTransaction, error) {
	txType := domaintransaction.Type(req.Type)
	if !txType.IsValid() {
		return nil, errors.New("invalid transaction type")
	}
	mode := domainscheduled.Mode(req.Mode)
	frequency := domainscheduled.Frequency(req.Frequency)

	start, err := daterange.ParseDateJakarta(req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start_date")
	}
	var endDate *time.Time
	if strings.TrimSpace(req.EndDate) != "" {
		parsed, err := daterange.ParseDateJakarta(req.EndDate)
		if err != nil {
			return nil, errors.New("invalid end_date")
		}
		endDate = &parsed
	}

	// Amount is optional for reminders, mandatory for auto.
	var amount *decimal.Decimal
	if strings.TrimSpace(req.Amount) != "" {
		parsed, err := money.ParsePositive(req.Amount)
		if err != nil {
			return nil, err
		}
		amount = &parsed
	}

	// Ownership checks, mirroring the manual transaction flow.
	if _, err := u.accounts.FindByID(ctx, req.AccountID, userID); err != nil {
		return nil, errors.New("rekening tidak ditemukan")
	}
	category, err := u.categories.FindByID(ctx, req.CategoryID, userID)
	if err != nil {
		return nil, errors.New("kategori tidak ditemukan")
	}
	if string(category.Type) != string(txType) {
		return nil, errors.New("category type must match transaction type")
	}

	interval := req.Interval
	if interval < 1 {
		interval = 1
	}
	remind := domainscheduled.DefaultRemindDaysBefore
	if req.RemindDaysBefore != nil {
		remind = *req.RemindDaysBefore
	}

	item := &domainscheduled.ScheduledTransaction{
		ID:               id,
		UserID:           userID,
		AccountID:        req.AccountID,
		CategoryID:       req.CategoryID,
		Type:             txType,
		Name:             strings.TrimSpace(req.Name),
		Amount:           amount,
		Mode:             mode,
		Frequency:        frequency,
		Interval:         interval,
		StartDate:        start,
		EndDate:          endDate,
		RemindDaysBefore: remind,
		IsActive:         true,
		Notes:            req.Notes,
		UpdatedAt:        time.Now(),
	}
	if err := item.Validate(); err != nil {
		return nil, err
	}
	return item, nil
}
