package handler

import (
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/pkg/response"
	reportusecase "easysaving/backend/internal/usecase/report"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct{ reports *reportusecase.Usecase }

func NewReportHandler(reports *reportusecase.Usecase) *ReportHandler {
	return &ReportHandler{reports: reports}
}

func (h *ReportHandler) Summary(c *gin.Context) {
	result, err := h.reports.Summary(c.Request.Context(), httpmiddleware.UserID(c), c.DefaultQuery("period", "monthly"), c.Query("date"), c.Query("account_id"))
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, result)
}
