package response

import "github.com/gin-gonic/gin"

func OK(c *gin.Context, data any) {
	c.JSON(200, gin.H{"success": true, "data": data})
}

func Created(c *gin.Context, data any) {
	c.JSON(201, gin.H{"success": true, "data": data})
}

func Error(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"success": false, "message": message})
}
