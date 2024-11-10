#!/bin/sh
set -e

aws s3 cp "s3://tylers-big-bucket/sprt-dev.db" "$DB_PATH"

# Start the application
exec "$@"