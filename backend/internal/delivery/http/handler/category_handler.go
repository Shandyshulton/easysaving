package handler

import (
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/pkg/response"
	categoryusecase "easysaving/backend/internal/usecase/category"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct{ categories *categoryusecase.Usecase }

func NewCategoryHandler(categories *categoryusecase.Usecase) *CategoryHandler {
	return &CategoryHandler{categories: categories}
}

func (h *CategoryHandler) List(c *gin.Context) {
	items, err := h.categories.List(c.Request.Context(), httpmiddleware.UserID(c), c.Query("type"))
	if err != nil {
		response.Error(c, 500, err.Error())
		return
	}
	response.OK(c, items)
}
