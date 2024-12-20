FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o main .

FROM alpine:latest
RUN apk add --no-cache aws-cli sqlite
WORKDIR /app
COPY --from=builder /app/main .
COPY backup.sh .

RUN mkdir -p /app/data
VOLUME /app/data

COPY crontab /etc/crontabs/root
RUN apk add --no-cache dcron
COPY init.sh .

# Start both the Go app and crond
ENTRYPOINT ["/app/init.sh"]
CMD ["./main"]