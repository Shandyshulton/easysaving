package main

import (
	"log"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"easysaving/backend/internal/config"
	"easysaving/backend/internal/delivery/http/handler"
	httpmiddleware "easysaving/backend/internal/delivery/http/middleware"
	"easysaving/backend/internal/delivery/http/route"
	"easysaving/backend/internal/pkg/email"
	jwtpkg "easysaving/backend/internal/pkg/jwt"
	"easysaving/backend/internal/repository/postgres"
	accountusecase "easysaving/backend/internal/usecase/account"
	authusecase "easysaving/backend/internal/usecase/auth"
	categoryusecase "easysaving/backend/internal/usecase/category"
	reportusecase "easysaving/backend/internal/usecase/report"
	transactionusecase "easysaving/backend/internal/usecase/transaction"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatal(err)
	}
	db, err := config.OpenPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	if err := config.AutoMigrate(db); err != nil {
		log.Fatal(err)
	}

	jwt := jwtpkg.New(cfg.JWTSecret, cfg.JWTExpiresHours)
	userRepo := postgres.NewUserRepository(db)
	passwordResetRepo := postgres.NewPasswordResetRepository(db)
	accountRepo := postgres.NewAccountRepository(db)
	categoryRepo := postgres.NewCategoryRepository(db)
	transactionRepo := postgres.NewTransactionRepository(db)
	mailer := email.NewSMTPService(email.Config{
		AppEnv:   cfg.AppEnv,
		Host:     cfg.SMTPHost,
		Port:     cfg.SMTPPort,
		User:     cfg.SMTPUser,
		Password: cfg.SMTPPassword,
		From:     cfg.SMTPFrom,
	})

	authUC := authusecase.New(userRepo, categoryRepo, passwordResetRepo, mailer, jwt)
	accountUC := accountusecase.New(accountRepo)
	categoryUC := categoryusecase.New(categoryRepo)
	transactionUC := transactionusecase.New(transactionRepo, accountRepo, categoryRepo)
	reportUC := reportusecase.New(transactionRepo, accountRepo)

	if err := os.MkdirAll(filepath.Dir(cfg.APILogPath), 0755); err != nil {
		log.Fatal(err)
	}
	apiLogFile, err := os.OpenFile(cfg.APILogPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Fatal(err)
	}
	defer apiLogFile.Close()

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(httpmiddleware.RequestLogger(apiLogFile))
	r.Use(cors.New(cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		AllowOriginFunc: func(origin string) bool {
			allowedOrigins := strings.Split(cfg.FrontendOrigin, ",")
			for _, allowed := range allowedOrigins {
				if strings.TrimSpace(allowed) == origin {
					return true
				}
			}
			parsed, err := url.Parse(origin)
			if cfg.AppEnv == "development" && err == nil && parsed.Port() == "3000" {
				return parsed.Scheme == "http" && (parsed.Hostname() == "localhost" || strings.HasPrefix(parsed.Hostname(), "10."))
			}
			return false
		},
	}))
	route.Register(r, route.Handlers{
		Auth:         handler.NewAuthHandler(authUC),
		Accounts:     handler.NewAccountHandler(accountUC),
		Categories:   handler.NewCategoryHandler(categoryUC),
		Transactions: handler.NewTransactionHandler(transactionUC),
		Reports:      handler.NewReportHandler(reportUC),
	}, jwt)

	log.Printf("EasySaving API listening on :%s", cfg.HTTPPort)
	if err := r.Run(":" + cfg.HTTPPort); err != nil {
		log.Fatal(err)
	}
}
