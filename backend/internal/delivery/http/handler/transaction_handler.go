package handler

import (
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/response"
	transactionusecase "easysaving/backend/internal/usecase/transaction"

	"github.com/gin-gonic/gin"
)

type TransactionHandler struct{ transactions *transactionusecase.Usecase }

func NewTransactionHandler(transactions *transactionusecase.Usecase) *TransactionHandler {
	return &TransactionHandler{transactions: transactions}
}

func (h *TransactionHandler) Create(c *gin.Context) {
	var req dto.TransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.transactions.Create(c.Request.Context(), httpmiddleware.UserID(c), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.Created(c, item)
}

func (h *TransactionHandler) List(c *gin.Context) {
	var req dto.TransactionFilterRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	items, err := h.transactions.List(c.Request.Context(), httpmiddleware.UserID(c), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, items)
}

func (h *TransactionHandler) Update(c *gin.Context) {
	var req dto.TransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.transactions.Update(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, item)
}

func (h *TransactionHandler) Delete(c *gin.Context) {
	if err := h.transactions.Delete(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id")); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"deleted": true})
}
