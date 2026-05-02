#!/bin/sh
set -eu

attempt=0
until alembic upgrade head
do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 20 ]; then
    echo "Alembic failed after $attempt attempts"
    exit 1
  fi
  echo "Waiting for database... attempt $attempt"
  sleep 2
done

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
