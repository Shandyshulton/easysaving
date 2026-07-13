FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/easysaving-api ./cmd/api

FROM alpine:3.22

WORKDIR /app

COPY --from=builder /app/easysaving-api ./easysaving-api

EXPOSE 8080

CMD ["./easysaving-api"]
