package dto

// ScheduledTransactionRequest is the create/update payload for a schedule.
//
// Amount is a string so the frontend can send the raw digits produced by
// AmountField. It may be empty for mode "remind" (an unknown bill amount).
type ScheduledTransactionRequest struct {
	Type             string `json:"type" binding:"required,oneof=income expense"`
	Name             string `json:"name" binding:"required,min=1,max=120"`
	Amount           string `json:"amount"`
	CategoryID       string `json:"category_id" binding:"required,uuid"`
	AccountID        string `json:"account_id" binding:"required,uuid"`
	Mode             string `json:"mode" binding:"required,oneof=auto remind"`
	Frequency        string `json:"frequency" binding:"required,oneof=daily weekly monthly yearly"`
	Interval         int    `json:"interval" binding:"omitempty,min=1,max=365"`
	StartDate        string `json:"start_date" binding:"required"`
	EndDate          string `json:"end_date"`
	RemindDaysBefore *int  `json:"remind_days_before" binding:"omitempty,min=0,max=30"`
	Notes            string `json:"notes"`
	IsActive         *bool  `json:"is_active"`
}

// ScheduledTransactionFilterRequest narrows down the listing.
type ScheduledTransactionFilterRequest struct {
	AccountID string `form:"account_id"`
	Mode      string `form:"mode" binding:"omitempty,oneof=auto remind"`
	IsActive  string `form:"is_active" binding:"omitempty,oneof=true false"`
}

// MarkPaidRequest confirms a reminder. The amount is mandatory here even when the
// schedule itself stores none.
type MarkPaidRequest struct {
	Amount          string `json:"amount" binding:"required"`
	TransactionDate string `json:"transaction_date"`
	Notes           string `json:"notes"`
}

// ScheduledRunResult reports what a scheduler run did, mirrored in the log line.
type ScheduledRunResult struct {
	Processed int      `json:"processed"`
	Created   int      `json:"created"`
	Skipped   int      `json:"skipped"`
	Failed    int      `json:"failed"`
	Truncated int      `json:"truncated"`
	Errors    []string `json:"errors,omitempty"`
}
