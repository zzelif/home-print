#!/bin/bash
# ==============================================================================
# HomePrint OS — Raspberry Pi OS Routine Maintenance & Health Script
# Executes apt upgrades, SSD TRIM, log rotation, systemd vacuum, & SQLite health
# ==============================================================================

set -e

echo "=============================================================================="
echo "Starting Raspberry Pi Routine Maintenance & Health Check..."
echo "=============================================================================="

# 1. Update package lists and perform safe upgrades
echo "=== [1/6] Running System Package Upgrades ==="
sudo apt-get update
sudo apt-get --with-new-pkgs upgrade -y
sudo apt-get autoremove -y
sudo apt-get clean

# 2. SSD TRIM (FSTRIM) for flash storage longevity
echo "=== [2/6] Running SSD TRIM for Flash Storage Longevity ==="
if command -v fstrim &> /dev/null; then
    sudo fstrim -av || true
    echo "SSD TRIM completed."
fi

# 3. Systemd Journal Vacuuming (Free up disk space)
echo "=== [3/6] Vacuuming Systemd Journal Logs (Retain 7 Days) ==="
sudo journalctl --vacuum-time=7d

# 4. Check & Rotate HomePrint Application Logs
echo "=== [4/6] Checking Application Logs ==="
if [ -d "/var/log" ]; then
    sudo find /var/log -name "homeprint*.log" -size +10M -exec truncate -s 5M {} \; 2>/dev/null || true
fi

# 5. SQLite Database Integrity Check
echo "=== [5/6] Verifying SQLite Database Integrity ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${DATABASE_PATH:-$ROOT_DIR/homeprint.sqlite}"

if [ -f "$DB_PATH" ] && command -v sqlite3 &> /dev/null; then
    INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;")
    if [ "$INTEGRITY" = "ok" ]; then
        echo "SQLite Database Integrity: OK ($DB_PATH)"
    else
        echo "SQLite Database Warning ($DB_PATH): $INTEGRITY"
    fi
fi

# 6. Thermal & System Throttling Report
echo "=== [6/6] Thermal & Power Supply Status ==="
if command -v vcgencmd &> /dev/null; then
    echo "CPU Temp: $(vcgencmd measure_temp)"
    echo "Throttling: $(vcgencmd get_throttled)"
fi

echo "=============================================================================="
echo "Raspberry Pi Maintenance Routine Completed Successfully!"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $3 "/" $2 " used (" $5 ")"}')"
if mountpoint -q /mnt/storage 2>/dev/null; then
    echo "SSD Usage (/mnt/storage): $(df -h /mnt/storage | awk 'NR==2 {print $3 "/" $2 " used (" $5 ")"}')"
elif mountpoint -q /mnt/ssd 2>/dev/null; then
    echo "SSD Usage (/mnt/ssd):     $(df -h /mnt/ssd | awk 'NR==2 {print $3 "/" $2 " used (" $5 ")"}')"
fi
echo "=============================================================================="

