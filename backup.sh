#!/bin/sh

# Ensure SQLite is not being written to
sqlite3 /app/data/sprt-dev.db ".backup '/app/data/backup.db'"

aws s3 cp /app/data/backup.db s3://tylers-big-bucket/sprt-dev.db

# Remove backup file
rm /app/data/backup.db
