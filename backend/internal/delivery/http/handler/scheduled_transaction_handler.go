package handler

import (
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/response"
	scheduledusecase "easysaving/backend/internal/usecase/scheduled"

	"github.com/gin-gonic/gin"
)

type ScheduledTransactionHandler struct{ scheduled *scheduledusecase.Usecase }

func NewScheduledTransactionHandler(scheduled *scheduledusecase.Usecase) *ScheduledTransactionHandler {
	return &ScheduledTransactionHandler{scheduled: scheduled}
}

func (h *ScheduledTransactionHandler) List(c *gin.Context) {
	var req dto.ScheduledTransactionFilterRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	items, err := h.scheduled.List(c.Request.Context(), httpmiddleware.UserID(c), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, items)
}

func (h *ScheduledTransactionHandler) Get(c *gin.Context) {
	item, err := h.scheduled.Get(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"))
	if err != nil {
		response.Error(c, 404, "jadwal tidak ditemukan")
		return
	}
	response.OK(c, item)
}

func (h *ScheduledTransactionHandler) Create(c *gin.Context) {
	var req dto.ScheduledTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.scheduled.Create(c.Request.Context(), httpmiddleware.UserID(c), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.Created(c, item)
}

func (h *ScheduledTransactionHandler) Update(c *gin.Context) {
	var req dto.ScheduledTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.scheduled.Update(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, item)
}

func (h *ScheduledTransactionHandler) Delete(c *gin.Context) {
	if err := h.scheduled.Delete(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id")); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"deleted": true})
}

// Toggle pauses or resumes a schedule.
func (h *ScheduledTransactionHandler) Toggle(c *gin.Context) {
	var body struct {
		IsActive *bool `json:"is_active" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.scheduled.SetActive(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"), *body.IsActive)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, item)
}

// Preview reports how many backdated transactions a schedule would create.
func (h *ScheduledTransactionHandler) Preview(c *gin.Context) {
	var req dto.ScheduledTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	result, err := h.scheduled.Preview(c.Request.Context(), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, result)
}

// MarkPaid confirms a due reminder with its real amount.
func (h *ScheduledTransactionHandler) MarkPaid(c *gin.Context) {
	var req dto.MarkPaidRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	item, err := h.scheduled.MarkPaid(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.Created(c, item)
}

// SkipPeriod advances a schedule one period without recording a transaction.
func (h *ScheduledTransactionHandler) SkipPeriod(c *gin.Context) {
	item, err := h.scheduled.SkipPeriod(c.Request.Context(), httpmiddleware.UserID(c), c.Param("id"))
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, item)
}

// Run triggers the scheduler manually for the authenticated user only. It sits
// behind the auth middleware, so it is never publicly reachable.
func (h *ScheduledTransactionHandler) Run(c *gin.Context) {
	result, err := h.scheduled.ProcessDue(c.Request.Context(), httpmiddleware.UserID(c))
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, result)
}
