package dto

type TransactionRequest struct {
	Type            string `json:"type" binding:"required,oneof=income expense"`
	Amount          string `json:"amount" binding:"required"`
	CategoryID      string `json:"category_id" binding:"required,uuid"`
	AccountID       string `json:"account_id" binding:"required,uuid"`
	TransactionDate string `json:"transaction_date" binding:"required"`
	Notes           string `json:"notes"`
}

type TransactionFilterRequest struct {
	Type       string `form:"type"`
	CategoryID string `form:"category_id"`
	AccountID  string `form:"account_id"`
	StartDate  string `form:"start_date"`
	EndDate    string `form:"end_date"`
	Limit      int    `form:"limit" binding:"omitempty,min=1,max=100"`
}
