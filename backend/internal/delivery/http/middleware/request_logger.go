package middleware

import (
	"fmt"
	"io"
	"log"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

func RequestLogger(writer io.Writer) gin.HandlerFunc {
	logger := log.New(writer, "", 0)

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		if c.Request.URL.RawQuery != "" {
			path += "?" + c.Request.URL.RawQuery
		}

		userID := UserID(c)
		if userID == "" {
			userID = "-"
		}

		errorMessage := "-"
		if len(c.Errors) > 0 {
			errorMessage = c.Errors.String()
		}

		logger.Println(fmt.Sprintf(
			"time=%s method=%s path=%q status=%d latency=%s client_ip=%s user_id=%s user_agent=%s bytes=%d errors=%s",
			time.Now().Format(time.RFC3339),
			c.Request.Method,
			path,
			c.Writer.Status(),
			time.Since(start).Round(time.Microsecond),
			c.ClientIP(),
			userID,
			strconv.Quote(c.Request.UserAgent()),
			c.Writer.Size(),
			strconv.Quote(errorMessage),
		))
	}
}
