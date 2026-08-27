#!/bin/bash
# ==============================================================================
# HomePrint OS — Automated Daily SQLite Database Backup Script
# Performs atomic backup of the WAL database to a timestamped backup directory
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_PATH="${DATABASE_PATH:-$ROOT_DIR/homeprint.sqlite}"
BACKUP_DIR="${BACKUP_TARGET_DIR:-$ROOT_DIR/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_FILE="${BACKUP_DIR}/homeprint_backup_${TIMESTAMP}.sqlite"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
    echo "Database not found at: $DB_PATH. Checking default paths..."
    if [ -f "$ROOT_DIR/backend/homeprint.sqlite" ]; then
        DB_PATH="$ROOT_DIR/backend/homeprint.sqlite"
    fi
fi

echo "=== Creating atomic SQLite backup of $DB_PATH ==="
if command -v sqlite3 &> /dev/null && [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" ".backup '${TARGET_FILE}'"
    gzip -f "${TARGET_FILE}"
    echo "Backup successfully created and compressed: ${TARGET_FILE}.gz"
elif [ -f "$DB_PATH" ]; then
    echo "sqlite3 CLI not found. Copying database file..."
    cp "$DB_PATH" "${TARGET_FILE}"
    gzip -f "${TARGET_FILE}"
    echo "Backup copied and compressed: ${TARGET_FILE}.gz"
else
    echo "No database file found to back up."
    exit 1
fi

# Rotate backups: retain only the last 14 days
find "$BACKUP_DIR" -type f -name "homeprint_backup_*.gz" -mtime +14 -delete
echo "=== Backup rotation complete ==="
