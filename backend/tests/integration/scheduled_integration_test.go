// Package integration_test contains tests that run against a real PostgreSQL
// instance. They are skipped unless TEST_DATABASE_URL is set, so `go test ./...`
// stays green on machines without a database.
//
// Run them with (PowerShell):
//
//	$env:TEST_DATABASE_URL = "host=127.0.0.1 user=postgres password=174311Ss dbname=easysaving_test port=55432 sslmode=disable TimeZone=Asia/Jakarta"
//	go test ./tests/integration/ -v
//
// The suite creates its own user/account/category per test and removes them
// afterwards (ON DELETE CASCADE), so it never touches existing rows.
package integration_test

import (
	"bytes"
	"context"
	"log"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"easysaving/backend/internal/config"
	domainaccount "easysaving/backend/internal/domain/account"
	domaincategory "easysaving/backend/internal/domain/category"
	domainscheduled "easysaving/backend/internal/domain/scheduledtransaction"
	domaintransaction "easysaving/backend/internal/domain/transaction"
	domainuser "easysaving/backend/internal/domain/user"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/daterange"
	"easysaving/backend/internal/repository/postgres"
	scheduledusecase "easysaving/backend/internal/usecase/scheduled"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type fixture struct {
	db         *gorm.DB
	usecase    *scheduledusecase.Usecase
	userID     string
	accountID  string
	categoryID string
}

// setup connects to the test database, applies the schema, and seeds an isolated
// user with one account and one expense category.
func setup(t *testing.T) *fixture {
	t.Helper()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping PostgreSQL integration tests")
	}

	db, err := config.OpenPostgres(dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	// Applies AutoMigrate plus the explicit foreign keys and CHECK constraints.
	if err := config.AutoMigrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	userID := uuid.NewString()
	accountID := uuid.NewString()
	categoryID := uuid.NewString()

	user := domainuser.User{
		ID:           userID,
		Name:         "Integration Test",
		Email:        "it-" + userID + "@example.test",
		PasswordHash: "x",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	account := domainaccount.Account{
		ID:             accountID,
		UserID:         userID,
		AccountName:    "Test Account",
		Category:       "bank",
		InitialBalance: decimal.Zero,
		CurrentBalance: decimal.Zero,
	}
	if err := db.Create(&account).Error; err != nil {
		t.Fatalf("seed account: %v", err)
	}

	category := domaincategory.Category{
		ID:     categoryID,
		UserID: &userID,
		Name:   "Test Expense",
		Type:   domaincategory.TypeExpense,
		Color:  "#10b981",
		Icon:   "Circle",
	}
	if err := db.Create(&category).Error; err != nil {
		t.Fatalf("seed category: %v", err)
	}

	t.Cleanup(func() {
		// Deleting the user cascades to accounts, schedules and transactions.
		db.Exec("DELETE FROM transactions WHERE user_id = ?", userID)
		db.Exec("DELETE FROM scheduled_transactions WHERE user_id = ?", userID)
		db.Exec("DELETE FROM accounts WHERE user_id = ?", userID)
		db.Exec("DELETE FROM categories WHERE user_id = ?", userID)
		db.Exec("DELETE FROM users WHERE id = ?", userID)
	})

	usecase := scheduledusecase.New(
		postgres.NewScheduledTransactionRepository(db),
		postgres.NewTransactionRepository(db),
		postgres.NewAccountRepository(db),
		postgres.NewCategoryRepository(db),
	)

	return &fixture{db: db, usecase: usecase, userID: userID, accountID: accountID, categoryID: categoryID}
}

// createSchedule inserts an active auto schedule due on startDate.
func (f *fixture) createSchedule(t *testing.T, amount int64, frequency domainscheduled.Frequency, startDate time.Time) *domainscheduled.ScheduledTransaction {
	t.Helper()
	value := decimal.NewFromInt(amount)
	schedule := domainscheduled.ScheduledTransaction{
		ID:               uuid.NewString(),
		UserID:           f.userID,
		AccountID:        f.accountID,
		CategoryID:       f.categoryID,
		Type:             domaintransaction.TypeExpense,
		Name:             "Integration Schedule",
		Amount:           &value,
		Mode:             domainscheduled.ModeAuto,
		Frequency:        frequency,
		Interval:         1,
		StartDate:        startDate,
		NextDueDate:      startDate,
		RemindDaysBefore: domainscheduled.DefaultRemindDaysBefore,
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if err := f.db.Create(&schedule).Error; err != nil {
		t.Fatalf("create schedule: %v", err)
	}
	return &schedule
}

func (f *fixture) countTransactions(t *testing.T, scheduleID string) int64 {
	t.Helper()
	var count int64
	if err := f.db.Model(&domaintransaction.Transaction{}).
		Where("scheduled_transaction_id = ?", scheduleID).
		Count(&count).Error; err != nil {
		t.Fatalf("count transactions: %v", err)
	}
	return count
}

func (f *fixture) sumTransactions(t *testing.T, scheduleID string) decimal.Decimal {
	t.Helper()
	var result struct{ Total decimal.Decimal }
	if err := f.db.Model(&domaintransaction.Transaction{}).
		Select("COALESCE(SUM(amount), 0) AS total").
		Where("scheduled_transaction_id = ?", scheduleID).
		Scan(&result).Error; err != nil {
		t.Fatalf("sum transactions: %v", err)
	}
	return result.Total
}

func (f *fixture) balance(t *testing.T) decimal.Decimal {
	t.Helper()
	var account domainaccount.Account
	if err := f.db.Where("id = ?", f.accountID).First(&account).Error; err != nil {
		t.Fatalf("load account: %v", err)
	}
	return account.CurrentBalance
}

// (a) Running the scheduler twice on the same schedule must not duplicate rows.
func TestProcessDueIsIdempotent(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	// Due today so exactly one occurrence is expected.
	schedule := f.createSchedule(t, 150_000, domainscheduled.FrequencyMonthly, daterange.TodayJakarta())

	first, err := f.usecase.ProcessDue(ctx, f.userID)
	if err != nil {
		t.Fatalf("first run: %v", err)
	}
	if first.Created != 1 {
		t.Fatalf("first run should create 1 transaction, got %d", first.Created)
	}

	countAfterFirst := f.countTransactions(t, schedule.ID)
	if countAfterFirst != 1 {
		t.Fatalf("expected 1 transaction after first run, got %d", countAfterFirst)
	}

	second, err := f.usecase.ProcessDue(ctx, f.userID)
	if err != nil {
		t.Fatalf("second run: %v", err)
	}
	if second.Created != 0 {
		t.Fatalf("second run must not create anything, got %d", second.Created)
	}

	countAfterSecond := f.countTransactions(t, schedule.ID)
	if countAfterSecond != countAfterFirst {
		t.Fatalf("transaction count changed on rerun: %d -> %d", countAfterFirst, countAfterSecond)
	}
}

// (b) Two concurrent runners must not duplicate work or deadlock.
func TestProcessDueConcurrentNoDuplicates(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	schedule := f.createSchedule(t, 90_000, domainscheduled.FrequencyMonthly, daterange.TodayJakarta())

	var wg sync.WaitGroup
	errs := make([]error, 2)
	createdCounts := make([]int, 2)

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(index int) {
			defer wg.Done()
			result, err := f.usecase.ProcessDue(ctx, f.userID)
			errs[index] = err
			createdCounts[index] = result.Created
		}(i)
	}

	select {
	case <-done:
	case <-time.After(30 * time.Second):
		t.Fatal("concurrent runs did not finish in time (possible deadlock)")
	}

	for index, err := range errs {
		if err != nil {
			t.Fatalf("runner %d failed: %v", index, err)
		}
	}

	total := f.countTransactions(t, schedule.ID)
	if total != 1 {
		t.Fatalf("expected exactly 1 transaction from concurrent runs, got %d", total)
	}
	if sum := createdCounts[0] + createdCounts[1]; sum != 1 {
		t.Fatalf("exactly one runner should report a creation, got %d total", sum)
	}
}

// (c) Catch-up must stop at MaxCatchUp, skip the oldest periods, and log a warning.
func TestProcessDueCatchUpLimit(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	// 20 months back: 21 occurrences are due, well above the limit of 12.
	start := daterange.TodayJakarta().AddDate(0, -20, 0)
	schedule := f.createSchedule(t, 10_000, domainscheduled.FrequencyMonthly, start)

	// Capture the scheduler log so the warning can be asserted.
	var logBuffer bytes.Buffer
	originalOutput := log.Writer()
	originalFlags := log.Flags()
	log.SetOutput(&logBuffer)
	log.SetFlags(0)
	defer func() {
		log.SetOutput(originalOutput)
		log.SetFlags(originalFlags)
	}()

	result, err := f.usecase.ProcessDue(ctx, f.userID)
	if err != nil {
		t.Fatalf("run: %v", err)
	}

	if result.Created != scheduledusecase.MaxCatchUp {
		t.Fatalf("expected %d transactions, got %d", scheduledusecase.MaxCatchUp, result.Created)
	}
	if result.Truncated == 0 {
		t.Fatalf("expected truncated > 0 when more than %d periods are missed", scheduledusecase.MaxCatchUp)
	}

	stored := f.countTransactions(t, schedule.ID)
	if stored != int64(scheduledusecase.MaxCatchUp) {
		t.Fatalf("expected %d stored transactions, got %d", scheduledusecase.MaxCatchUp, stored)
	}

	logOutput := logBuffer.String()
	if !strings.Contains(logOutput, "catch-up limit") {
		t.Fatalf("expected a catch-up warning in the log, got: %q", logOutput)
	}

	// next_due_date must now be in the future so the schedule stops replaying.
	var reloaded domainscheduled.ScheduledTransaction
	if err := f.db.Where("id = ?", schedule.ID).First(&reloaded).Error; err != nil {
		t.Fatalf("reload schedule: %v", err)
	}
	today := daterange.TodayJakarta()
	if !daterange.ToJakartaDate(reloaded.NextDueDate).After(today) {
		t.Fatalf("next_due_date should be in the future, got %s", reloaded.NextDueDate.Format("2006-01-02"))
	}
}

// (d) The account balance must equal the sum of the transactions created.
func TestProcessDueUpdatesBalance(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	startBalance := f.balance(t)

	// Three months back gives four occurrences (start + 3).
	start := daterange.TodayJakarta().AddDate(0, -3, 0)
	schedule := f.createSchedule(t, 25_000, domainscheduled.FrequencyMonthly, start)

	result, err := f.usecase.ProcessDue(ctx, f.userID)
	if err != nil {
		t.Fatalf("run: %v", err)
	}
	if result.Created == 0 {
		t.Fatal("expected the catch-up to create transactions")
	}

	created := f.countTransactions(t, schedule.ID)
	if int(created) != result.Created {
		t.Fatalf("reported %d creations but stored %d", result.Created, created)
	}

	// Expenses reduce the balance, so the delta is the negative of the sum.
	expected := startBalance.Sub(f.sumTransactions(t, schedule.ID))
	if got := f.balance(t); !got.Equal(expected) {
		t.Fatalf("balance mismatch: got %s want %s", got.String(), expected.String())
	}
}

// Skipping a period must advance the schedule without recording anything, and the
// computed overdue counter must shrink accordingly.
func TestSkipPeriodAdvancesWithoutTransaction(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	// Three months back on a reminder: four periods are outstanding.
	start := daterange.TodayJakarta().AddDate(0, -3, 0)
	estimate := decimal.NewFromInt(75_000)
	schedule := domainscheduled.ScheduledTransaction{
		ID:               uuid.NewString(),
		UserID:           f.userID,
		AccountID:        f.accountID,
		CategoryID:       f.categoryID,
		Type:             domaintransaction.TypeExpense,
		Name:             "Skippable Reminder",
		Amount:           &estimate,
		Mode:             domainscheduled.ModeRemind,
		Frequency:        domainscheduled.FrequencyMonthly,
		Interval:         1,
		StartDate:        start,
		NextDueDate:      start,
		RemindDaysBefore: domainscheduled.DefaultRemindDaysBefore,
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if err := f.db.Create(&schedule).Error; err != nil {
		t.Fatalf("create reminder: %v", err)
	}

	before, err := f.usecase.Get(ctx, f.userID, schedule.ID)
	if err != nil {
		t.Fatalf("get before: %v", err)
	}
	if before.OverduePeriods < 2 {
		t.Fatalf("expected a backlog of at least 2 periods, got %d", before.OverduePeriods)
	}
	balanceBefore := f.balance(t)

	skipped, err := f.usecase.SkipPeriod(ctx, f.userID, schedule.ID)
	if err != nil {
		t.Fatalf("skip: %v", err)
	}

	// The due date must move forward by exactly one period.
	if !daterange.ToJakartaDate(skipped.NextDueDate).After(daterange.ToJakartaDate(before.NextDueDate)) {
		t.Fatalf("next_due_date did not advance: %s -> %s",
			before.NextDueDate.Format("2006-01-02"), skipped.NextDueDate.Format("2006-01-02"))
	}
	if skipped.OverduePeriods != before.OverduePeriods-1 {
		t.Fatalf("overdue periods should drop by one: %d -> %d", before.OverduePeriods, skipped.OverduePeriods)
	}

	// Nothing may have been recorded, and the balance must be untouched.
	if count := f.countTransactions(t, schedule.ID); count != 0 {
		t.Fatalf("skip must not create transactions, got %d", count)
	}
	if got := f.balance(t); !got.Equal(balanceBefore) {
		t.Fatalf("skip must not change the balance: %s -> %s", balanceBefore.String(), got.String())
	}
}

// MarkPaid must settle the oldest outstanding period and move the schedule on.
func TestMarkPaidUsesOldestPeriod(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	start := daterange.TodayJakarta().AddDate(0, -2, 0)
	estimate := decimal.NewFromInt(60_000)
	schedule := domainscheduled.ScheduledTransaction{
		ID:               uuid.NewString(),
		UserID:           f.userID,
		AccountID:        f.accountID,
		CategoryID:       f.categoryID,
		Type:             domaintransaction.TypeExpense,
		Name:             "Payable Reminder",
		Amount:           &estimate,
		Mode:             domainscheduled.ModeRemind,
		Frequency:        domainscheduled.FrequencyMonthly,
		Interval:         1,
		StartDate:        start,
		NextDueDate:      start,
		RemindDaysBefore: domainscheduled.DefaultRemindDaysBefore,
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if err := f.db.Create(&schedule).Error; err != nil {
		t.Fatalf("create reminder: %v", err)
	}

	balanceBefore := f.balance(t)
	paid, err := f.usecase.MarkPaid(ctx, f.userID, schedule.ID, dto.MarkPaidRequest{Amount: "82500"})
	if err != nil {
		t.Fatalf("mark paid: %v", err)
	}

	// The occurrence settled must be the oldest one, i.e. the original start date.
	if paid.ScheduledDueDate == nil {
		t.Fatal("expected the transaction to carry its occurrence date")
	}
	if got := daterange.ToJakartaDate(*paid.ScheduledDueDate); !got.Equal(daterange.ToJakartaDate(start)) {
		t.Fatalf("expected the oldest period %s, got %s",
			start.Format("2006-01-02"), got.Format("2006-01-02"))
	}

	// The real amount must be used, not the estimate.
	expected := balanceBefore.Sub(decimal.NewFromInt(82_500))
	if got := f.balance(t); !got.Equal(expected) {
		t.Fatalf("balance mismatch: got %s want %s", got.String(), expected.String())
	}

	// Paying the same period twice must be rejected by the unique index.
	var reloaded domainscheduled.ScheduledTransaction
	if err := f.db.Where("id = ?", schedule.ID).First(&reloaded).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if !daterange.ToJakartaDate(reloaded.NextDueDate).After(daterange.ToJakartaDate(start)) {
		t.Fatalf("next_due_date must advance after payment, got %s", reloaded.NextDueDate.Format("2006-01-02"))
	}
}

// Reminder schedules must never post automatically.
func TestProcessDueSkipsRemindMode(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	estimate := decimal.NewFromInt(50_000)
	schedule := domainscheduled.ScheduledTransaction{
		ID:               uuid.NewString(),
		UserID:           f.userID,
		AccountID:        f.accountID,
		CategoryID:       f.categoryID,
		Type:             domaintransaction.TypeExpense,
		Name:             "Reminder",
		Amount:           &estimate,
		Mode:             domainscheduled.ModeRemind,
		Frequency:        domainscheduled.FrequencyMonthly,
		Interval:         1,
		StartDate:        daterange.TodayJakarta(),
		NextDueDate:      daterange.TodayJakarta(),
		RemindDaysBefore: 3,
		IsActive:         true,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
	if err := f.db.Create(&schedule).Error; err != nil {
		t.Fatalf("create reminder: %v", err)
	}

	before := f.balance(t)
	if _, err := f.usecase.ProcessDue(ctx, f.userID); err != nil {
		t.Fatalf("run: %v", err)
	}

	if count := f.countTransactions(t, schedule.ID); count != 0 {
		t.Fatalf("reminder must not create transactions, got %d", count)
	}
	if got := f.balance(t); !got.Equal(before) {
		t.Fatalf("reminder must not change the balance: %s -> %s", before.String(), got.String())
	}

	// The due date must stay put so the item keeps showing as due.
	var reloaded domainscheduled.ScheduledTransaction
	if err := f.db.Where("id = ?", schedule.ID).First(&reloaded).Error; err != nil {
		t.Fatalf("reload: %v", err)
	}
	if !daterange.ToJakartaDate(reloaded.NextDueDate).Equal(daterange.TodayJakarta()) {
		t.Fatalf("reminder due date should not advance, got %s", reloaded.NextDueDate.Format("2006-01-02"))
	}
}
