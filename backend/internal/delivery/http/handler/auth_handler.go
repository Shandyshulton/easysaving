package handler

import (
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/dto"
	"easysaving/backend/internal/pkg/response"
	authusecase "easysaving/backend/internal/usecase/auth"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct{ auth *authusecase.Usecase }

func NewAuthHandler(auth *authusecase.Usecase) *AuthHandler { return &AuthHandler{auth: auth} }

func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	res, err := h.auth.Register(c.Request.Context(), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.Created(c, res)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	res, err := h.auth.Login(c.Request.Context(), req)
	if err != nil {
		response.Error(c, 401, err.Error())
		return
	}
	response.OK(c, res)
}

func (h *AuthHandler) VerifyLoginOTP(c *gin.Context) {
	var req dto.VerifyLoginOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	res, err := h.auth.VerifyLoginOTP(c.Request.Context(), req)
	if err != nil {
		response.Error(c, 401, err.Error())
		return
	}
	response.OK(c, res)
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req dto.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	if err := h.auth.ForgotPassword(c.Request.Context(), req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"sent": true})
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
	var req dto.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	if err := h.auth.ResetPassword(c.Request.Context(), req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"reset": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	res, err := h.auth.Me(c.Request.Context(), httpmiddleware.UserID(c))
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, res)
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	var req dto.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	res, err := h.auth.UpdateProfile(c.Request.Context(), httpmiddleware.UserID(c), req)
	if err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, res)
}

func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	var req dto.UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	if err := h.auth.UpdatePassword(c.Request.Context(), httpmiddleware.UserID(c), req); err != nil {
		response.Error(c, 400, err.Error())
		return
	}
	response.OK(c, gin.H{"updated": true})
}
