package route

import (
	"easysaving/backend/internal/delivery/http/handler"
	"easysaving/backend/internal/delivery/http/middleware"
	jwtpkg "easysaving/backend/internal/pkg/jwt"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth         *handler.AuthHandler
	Accounts     *handler.AccountHandler
	Categories   *handler.CategoryHandler
	Transactions *handler.TransactionHandler
	Reports      *handler.ReportHandler
}

func Register(r *gin.Engine, h Handlers, jwt jwtpkg.Service) {
	r.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	api := r.Group("/api/v1")
	api.POST("/auth/register", h.Auth.Register)
	api.POST("/auth/login", h.Auth.Login)
	api.POST("/auth/login/verify", h.Auth.VerifyLoginOTP)
	api.POST("/auth/forgot-password", h.Auth.ForgotPassword)
	api.POST("/auth/reset-password", h.Auth.ResetPassword)

	protected := api.Group("")
	protected.Use(middleware.Auth(jwt))
	protected.GET("/profile", h.Auth.Me)
	protected.PUT("/profile", h.Auth.UpdateProfile)
	protected.PUT("/profile/password", h.Auth.UpdatePassword)
	protected.GET("/accounts", h.Accounts.List)
	protected.POST("/accounts", h.Accounts.Create)
	protected.PUT("/accounts/:id", h.Accounts.Update)
	protected.DELETE("/accounts/:id", h.Accounts.Delete)
	protected.GET("/categories", h.Categories.List)
	protected.GET("/transactions", h.Transactions.List)
	protected.POST("/transactions", h.Transactions.Create)
	protected.PUT("/transactions/:id", h.Transactions.Update)
	protected.DELETE("/transactions/:id", h.Transactions.Delete)
	protected.GET("/reports/summary", h.Reports.Summary)
	protected.GET("/dashboard/summary", h.Reports.Summary)
}
