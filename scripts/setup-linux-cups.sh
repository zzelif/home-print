#!/bin/bash
# ==============================================================================
# HomePrint OS — Linux Mint / Debian CUPS, HPLIP & LibreOffice Setup Script (v4)
# Configures the Asus Laptop (4GB RAM) for direct HP Smart Tank 670 printing
# ==============================================================================

set -e

echo "=== [1/6] Updating package manager and installing core print utilities ==="
sudo apt-get update
sudo apt-get install -y \
  cups cups-client cups-bsd cups-filters \
  hplip hplip-gui libcups2-dev \
  libreoffice-writer libreoffice-impress poppler-utils \
  sqlite3 curl

echo "=== [2/6] Enabling and Starting CUPS Printing Service ==="
sudo systemctl enable cups
sudo systemctl start cups
sudo usermod -a -G lpadmin $USER

echo "=== [3/6] Setting up HP Smart Tank 670 via HPLIP ==="
echo "Please ensure the HP Smart Tank 670 is connected via USB cable and powered ON."
sudo hp-setup -i

echo "=== [4/6] Setting up Node.js LTS Runtime ==="
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "=== [5/6] Creating Systemd Service for HomePrint Local Server ==="
sudo bash -c 'cat <<EOF > /etc/systemd/system/homeprint.service
[Unit]
Description=HomePrint OS Local Server
After=network.target cups.service

[Service]
Type=simple
User='$USER'
WorkingDirectory='$(pwd)'/backend
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable homeprint.service

echo "=== [6/6] Creating Desktop Launcher (Dual-Use: Non-Intrusive) ==="
mkdir -p ~/Desktop
cat <<EOF > ~/Desktop/HomePrint-Shop.desktop
[Desktop Entry]
Version=1.0
Type=Application
Name=HomePrint Shop
Comment=Open HomePrint Operator Station
Exec=chromium --app=http://localhost:5000
Icon=printer
Terminal=false
Categories=Office;Utility;
EOF
chmod +x ~/Desktop/HomePrint-Shop.desktop

echo "=============================================================================="
echo "Setup Complete! HomePrint OS is ready."
echo "Desktop is in standard mode (LibreOffice available for presentations)."
echo "Launch HomePrint via Desktop Icon or: http://localhost:5000"
echo "Customer QR Drop accessible on LAN: http://$(hostname -I | awk '{print $1}'):5000/drop"
echo "=============================================================================="

