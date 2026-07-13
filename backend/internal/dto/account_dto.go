package dto

type AccountRequest struct {
	AccountName    string `json:"account_name" binding:"required,min=2,max=120"`
	Category       string `json:"category" binding:"required,oneof=bank wallet cash investment other"`
	InitialBalance string `json:"initial_balance" binding:"required"`
	Notes          string `json:"notes"`
}

type UpdateAccountRequest struct {
	AccountName    string `json:"account_name" binding:"required,min=2,max=120"`
	Category       string `json:"category" binding:"required,oneof=bank wallet cash investment other"`
	CurrentBalance string `json:"current_balance" binding:"required"`
	Notes          string `json:"notes"`
}
