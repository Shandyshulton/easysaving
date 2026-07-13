package validator

import "github.com/gin-gonic/gin"

func BindJSON(c *gin.Context, target any) error {
	return c.ShouldBindJSON(target)
}
