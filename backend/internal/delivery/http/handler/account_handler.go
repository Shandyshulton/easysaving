package handler

import (
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/response"
	accountusecase "easysaving/backend/internal/usecase/account"

	"github.com/gin-gonic/gin"
)

type AccountHandler struct{ accounts *accountusecase.Usecase }

func NewAccountHandler(accounts *accountusecase.Usecase) *AccountHandler {
	return &AccountHandler{accounts: accounts}
}

func (h *AccountHandler) Create(c *gin.Context) {
	var req dto.AccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.accounts.Create(c.Request.Context(), httpmiddleware.UserID(c), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.Created(c, item)
}

func (h *AccountHandler) List(c *gin.Context) {
	items, err := h.accounts.List(c.Request.Context(), httpmiddleware.UserID(c))
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.OK(c, items)
}

func (h *AccountHandler) Update(c *gin.Context) {
	var req dto.UpdateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.accounts.Update(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, item)
}

func (h *AccountHandler) Delete(c *gin.Context) {
	if err := h.accounts.Delete(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id")); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"deleted": true})
}
