#!/bin/bash
# ==============================================================================
# HomePrint OS — Automated Daily SQLite Database Backup Script
# Performs atomic backup of the WAL database to a timestamped backup directory
# ==============================================================================

set -e

BACKUP_DIR="/var/homeprint/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_PATH="/home/user/home-print/backend/homeprint.sqlite"
TARGET_FILE="${BACKUP_DIR}/homeprint_backup_${TIMESTAMP}.sqlite"

mkdir -p "$BACKUP_DIR"

echo "=== Creating atomic SQLite backup at: ${TARGET_FILE} ==="
if command -v sqlite3 &> /dev/null; then
    sqlite3 "$DB_PATH" ".backup '${TARGET_FILE}'"
    gzip "${TARGET_FILE}"
    echo "✅ Backup successfully created and compressed: ${TARGET_FILE}.gz"
else
    echo "⚠️ sqlite3 CLI not found. Copying database files directly..."
    cp "$DB_PATH" "${TARGET_FILE}"
fi

# Rotate backups: retain only the last 30 days
find "$BACKUP_DIR" -type f -name "homeprint_backup_*.gz" -mtime +30 -delete
echo "=== Backup rotation complete ==="
