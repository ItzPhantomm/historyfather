#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=== HistoryFather Temporal Intelligence Search Engine ==="

export PYTHONPATH="$DIR/backend"

# Ensure DB initialized
python3 -c "from app.db.database import init_db; from app.services.seed_data import seed_database; init_db(); seed_database()"

PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}

echo "Starting HistoryFather on http://$HOST:$PORT ..."
exec python3 -m uvicorn app.main:app --app-dir "$DIR/backend" --host "$HOST" --port "$PORT"
