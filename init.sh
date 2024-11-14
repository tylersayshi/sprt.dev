#!/bin/sh
set -e

aws s3 cp "s3://tylers-big-bucket/sprt-dev.db" "$DB_FILE"

crond -b

# Start the application
exec "$@"
