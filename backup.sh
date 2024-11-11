#!/bin/sh

# Ensure SQLite is not being written to
sqlite3 /app/sprt-dev.db ".backup '/app/backup.db'"

aws s3 cp /app/backup.db s3://tylers-big-bucket/sprt-dev.db

# Remove backup file
rm /app/data/backup.db
