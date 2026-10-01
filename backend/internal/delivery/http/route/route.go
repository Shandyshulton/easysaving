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
	Scheduled    *handler.ScheduledTransactionHandler
	Receipt      *handler.ReceiptHandler
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

	// Scheduled transactions. Every route requires a valid token, including the
	// manual scheduler trigger, which only processes the caller's own schedules.
	protected.GET("/scheduled", h.Scheduled.List)
	protected.POST("/scheduled", h.Scheduled.Create)
	protected.POST("/scheduled/preview", h.Scheduled.Preview)
	protected.POST("/scheduled/run", h.Scheduled.Run)
	protected.GET("/scheduled/:id", h.Scheduled.Get)
	protected.PUT("/scheduled/:id", h.Scheduled.Update)
	protected.DELETE("/scheduled/:id", h.Scheduled.Delete)
	protected.PATCH("/scheduled/:id/active", h.Scheduled.Toggle)
	protected.POST("/scheduled/:id/pay", h.Scheduled.MarkPaid)
	protected.POST("/scheduled/:id/skip", h.Scheduled.SkipPeriod)

	// Receipt scan (optional feature; handler reports unavailable when the
	// vision provider has no API key configured).
	if h.Receipt != nil {
		protected.POST("/receipts/scan", h.Receipt.Scan)
	}
}
