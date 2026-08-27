#!/bin/bash
# ==============================================================================
# HomePrint OS — Raspberry Pi 4 (64-bit Lite / Bookworm) Provisioning Script
# Configures headless Raspberry Pi 4 host for local-first print shop operation
# ==============================================================================

set -e

echo "=============================================================================="
echo "Starting HomePrint OS Provisioning on Raspberry Pi 4..."
echo "=============================================================================="

# 1. Update and install core build tools and utilities
echo "=== [1/7] Updating package manager & installing dependencies ==="
sudo apt-get update
sudo apt-get install -y \
  cups cups-client cups-bsd cups-filters \
  hplip printer-driver-hpcups libcups2-dev \
  libreoffice-writer-nogui libreoffice-impress-nogui libreoffice-calc-nogui \
  poppler-utils sqlite3 curl git build-essential python3 g++ make \
  avahi-daemon avahi-utils ca-certificates

# 2. Configure CUPS printing subsystem
echo "=== [2/7] Enabling and starting CUPS service ==="
sudo systemctl enable cups
sudo systemctl start cups
sudo usermod -a -G lpadmin "$USER"
# Allow remote printer administration on local LAN
sudo cupsctl --remote-admin --remote-any --share-printers

# 3. Setup Node.js 20 LTS (NodeSource)
echo "=== [3/7] Setting up Node.js 20 LTS ==="
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1)" != "v20" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Build Frontend & Backend
echo "=== [4/7] Compiling Frontend SPA and Backend TypeScript ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR/frontend"
npm ci
npm run build

cd "$ROOT_DIR/backend"
npm ci
npm run build

# 5. Create Systemd Service for HomePrint
echo "=== [5/7] Registering Systemd Production Service ==="
sudo bash -c "cat <<EOF > /etc/systemd/system/homeprint.service
[Unit]
Description=HomePrint OS Local Print Shop Server
After=network.target cups.service avahi-daemon.service
Wants=cups.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$ROOT_DIR/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DATABASE_PATH=$ROOT_DIR/homeprint.sqlite

# Resource limits for edge stability
MemoryMax=600M
CPUQuota=90%

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable homeprint.service
sudo systemctl restart homeprint.service

# 6. Setup mDNS broadcast (homeprint.local)
echo "=== [6/7] Configuring Avahi mDNS discovery (homeprint.local) ==="
sudo systemctl enable avahi-daemon
sudo systemctl restart avahi-daemon

# 7. Setup Automated Daily Database Backup Cron
echo "=== [7/7] Installing nightly SQLite backup cron (11:00 PM) ==="
chmod +x "$ROOT_DIR/scripts/backup-db.sh"
(crontab -l 2>/dev/null | grep -v "backup-db.sh"; echo "0 23 * * * $ROOT_DIR/scripts/backup-db.sh >> /var/log/homeprint-backup.log 2>&1") | crontab -

echo "=============================================================================="
echo "HomePrint OS Provisioning Complete!"
echo "Service Status: sudo systemctl status homeprint.service"
echo "Operator Station: http://homeprint.local:5000"
echo "Customer Drop:     http://homeprint.local:5000/drop"
echo "LAN IP Access:    http://$(hostname -I | awk '{print $1}'):5000"
echo "=============================================================================="
