package middleware

import (
	"strings"

	jwtpkg "easysaving/backend/internal/pkg/jwt"
	"easysaving/backend/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

const UserIDKey = "user_id"

func Auth(jwt jwtpkg.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		token := strings.TrimPrefix(header, "Bearer ")
		if token == "" || token == header {
			response.Error(c, 401, "missing bearer token")
			c.Abort()
			return
		}
		userID, err := jwt.Parse(token)
		if err != nil {
			response.Error(c, 401, "invalid token")
			c.Abort()
			return
		}
		c.Set(UserIDKey, userID)
		c.Next()
	}
}

func UserID(c *gin.Context) string {
	value, _ := c.Get(UserIDKey)
	userID, _ := value.(string)
	return userID
}
