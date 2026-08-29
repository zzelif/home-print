#!/usr/bin/env bash
# =============================================================================
# HomePrint OS — Raspberry Pi 4 Host CUPS Setup Script
# Target: Raspberry Pi OS 64-bit Lite (Debian Bookworm)
# Printer: HP Smart Tank 670 All-in-One (Wi-Fi IPP / USB 2.0)
# Run as: sudo bash setup-host-cups.sh [--printer-ip 192.168.1.60]
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PRINTER_IP="${PRINTER_IP:-}"
PRINTER_QUEUE_NAME="HP_Smart_Tank_670"
CUPS_ADMIN_USER="${CUPS_ADMIN_USER:-pi}"

log() { echo "[HomePrint] $*"; }
err() { echo "[HomePrint ERROR] $*" >&2; exit 1; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --printer-ip) PRINTER_IP="$2"; shift 2 ;;
    --queue-name) PRINTER_QUEUE_NAME="$2"; shift 2 ;;
    --admin-user) CUPS_ADMIN_USER="$2"; shift 2 ;;
    *) shift ;;
  esac
done

# ---------------------------------------------------------------------------
# Step 1: Install CUPS, HPLIP, and required tools
# ---------------------------------------------------------------------------
log "Installing CUPS, HPLIP, cups-ipp-utils, and required packages..."
apt-get update -qq
apt-get install -y --no-install-recommends \
    cups \
    cups-client \
    cups-bsd \
    cups-filters \
    cups-ipp-utils \
    hplip \
    printer-driver-hpcups \
    ippfind \
    avahi-daemon \
    libnss-mdns \
    curl \
    python3-pexpect \
    python3-requests

# ---------------------------------------------------------------------------
# Step 2: Enable and start CUPS and Avahi (mDNS for printer discovery)
# ---------------------------------------------------------------------------
log "Enabling and starting CUPS daemon..."
systemctl enable --now cups
systemctl enable --now avahi-daemon

# ---------------------------------------------------------------------------
# Step 3: Allow remote CUPS administration over local network
# ---------------------------------------------------------------------------
log "Configuring CUPS for LAN remote access..."

# Backup original config
cp /etc/cups/cupsd.conf /etc/cups/cupsd.conf.bak.$(date +%Y%m%d%H%M%S) 2>/dev/null || true

# Apply configuration
cat > /etc/cups/cupsd.conf << 'CUPSCONF'
# HomePrint OS — CUPS Daemon Configuration
# Optimized for Raspberry Pi 4 local-first print server

LogLevel warn
MaxLogSize 1m
LogTimeFormat standard

# Listen on all interfaces for LAN access
Listen /run/cups/cups.sock
Listen 0.0.0.0:631

# Enable sharing and remote admin
ServerAlias *
Browsing On
DefaultAuthType Basic

# Root Web UI
<Location />
  Order allow,deny
  Allow from 127.0.0.1
  Allow from 192.168.0.0/16
  Allow from 10.0.0.0/8
  Allow from 172.16.0.0/12
</Location>

# Admin pages require auth
<Location /admin>
  AuthType Default
  Require valid-user
  Order allow,deny
  Allow from 127.0.0.1
  Allow from 192.168.0.0/16
</Location>

# Policy
<Policy default>
  JobPrivateAccess all
  JobPrivateValues none
  SubscriptionPrivateAccess all
  SubscriptionPrivateValues none
  <Limit Create-Job Print-Job Print-URI Validate-Job>
    Order deny,allow
  </Limit>
  <Limit Send-Document Send-URI Hold-Job Release-Job Restart-Job Purge-Jobs Set-Job-Attributes Create-Job-Subscription Renew-Subscription Cancel-Subscription Get-Notifications Reprocess-Job Cancel-Current-Job Suspend-Current-Job Resume-Job Cancel-My-Jobs Close-Job CUPS-Move-Job CUPS-Get-Document>
    Order deny,allow
  </Limit>
  <Limit CUPS-Add-Modify-Printer CUPS-Delete-Printer CUPS-Add-Modify-Class CUPS-Delete-Class>
    AuthType Default
    Require valid-user
    Order deny,allow
  </Limit>
  <Limit Pause-Printer Resume-Printer Enable-Printer Disable-Printer Pause-Printer-After-Current-Job Hold-New-Jobs Release-Held-New-Jobs Deactivate-Printer Activate-Printer Restart-Printer Shutdown-Printer Startup-Printer Promote-Job Schedule-Job-After Cancel-Jobs CUPS-Accept-Jobs CUPS-Reject-Jobs>
    AuthType Default
    Require valid-user
    Order deny,allow
  </Limit>
  <Limit Cancel-Job CUPS-Authenticate-Job>
    Order deny,allow
  </Limit>
  <Limit All>
    Order deny,allow
  </Limit>
</Policy>
CUPSCONF

# ---------------------------------------------------------------------------
# Step 4: Add operator user to CUPS admin group
# ---------------------------------------------------------------------------
log "Adding ${CUPS_ADMIN_USER} to lp and lpadmin groups..."
usermod -aG lp,lpadmin "${CUPS_ADMIN_USER}" 2>/dev/null || true

# Restart CUPS to apply config
systemctl restart cups
sleep 2

# ---------------------------------------------------------------------------
# Step 5: Discover and Register HP Smart Tank 670 Queue
# ---------------------------------------------------------------------------
if [[ -z "${PRINTER_IP}" ]]; then
  log "Auto-discovering HP Smart Tank 670 on local network (this may take 10-20 seconds)..."
  # Try avahi/mDNS discovery first
  DISCOVERED_URI=$(ippfind --type _ipp._tcp --timeout 15 --ls 2>/dev/null | grep -i 'hp\|smart.tank\|700' | head -1 || true)
  
  if [[ -z "${DISCOVERED_URI}" ]]; then
    log "mDNS discovery found nothing. Trying ARP scan for HP OUI (3C:52:82, 60:BE:B4, DC:67:26, 24:FD:52)..."
    PRINTER_IP=$(arp -n 2>/dev/null | grep -iE '3c:52:82|60:be:b4|dc:67:26|24:fd:52' | awk '{print $1}' | head -1 || true)
  fi
  
  if [[ -z "${PRINTER_IP}" ]]; then
    log "WARNING: Could not auto-discover printer IP."
    log "Please run this script with --printer-ip <ip_address>"
    log "Or add the printer manually at http://localhost:631"
    log "Then set it as default: lpoptions -d <printer-queue-name>"
    exit 0
  fi
  log "Discovered printer at IP: ${PRINTER_IP}"
fi

# Verify printer is reachable
log "Verifying IPP reachability at ipp://${PRINTER_IP}:631/ipp/print ..."
if ! curl -sf --max-time 5 "http://${PRINTER_IP}:631" > /dev/null 2>&1; then
  log "WARNING: Cannot reach printer at ${PRINTER_IP}:631. The queue will be registered anyway."
  log "Ensure the printer is ON and connected to Wi-Fi before printing."
fi

# Register the IPP Everywhere / driverless queue
log "Registering CUPS queue '${PRINTER_QUEUE_NAME}' for HP Smart Tank 670..."

# Remove stale queue first if exists
lpadmin -x "${PRINTER_QUEUE_NAME}" 2>/dev/null || true
sleep 1

# Try IPP Everywhere driverless (best)
if lpadmin -p "${PRINTER_QUEUE_NAME}" \
    -E \
    -v "ipp://${PRINTER_IP}:631/ipp/print" \
    -m everywhere \
    -D "HP Smart Tank 670 (${PRINTER_IP})" \
    -L "Counter" 2>/dev/null; then
  log "Queue registered using IPP Everywhere driverless driver."
else
  # Fallback: HPLIP driver
  log "IPP Everywhere unavailable — trying HPLIP driver..."
  if hp-setup -i -a "${PRINTER_IP}" 2>/dev/null; then
    log "Queue registered via HPLIP auto-setup."
  else
    log "WARNING: Both registration methods failed. Manually add at http://localhost:631"
  fi
fi

# Enable and accept jobs
cupsenable "${PRINTER_QUEUE_NAME}" 2>/dev/null || true
cupsaccept "${PRINTER_QUEUE_NAME}" 2>/dev/null || true

# Set as system default
lpoptions -d "${PRINTER_QUEUE_NAME}"
log "Default printer set to: ${PRINTER_QUEUE_NAME}"

# ---------------------------------------------------------------------------
# Step 6: Verify installation
# ---------------------------------------------------------------------------
log ""
log "=== CUPS Setup Complete ==="
log "Printer Queue   : $(lpstat -v ${PRINTER_QUEUE_NAME} 2>/dev/null | head -1 || echo 'Not registered yet')"
log "CUPS Web UI     : http://$(hostname -I | awk '{print $1}'):631"
log "Default Printer : $(lpstat -d 2>/dev/null | head -1)"
log ""
log "To test print: lp -d ${PRINTER_QUEUE_NAME} /usr/share/cups/data/testprint"
log "To check ink : hp-levels -d ${PRINTER_IP} 2>/dev/null || hp-info -d ${PRINTER_IP}"
log "For nozzle   : hp-check -d ${PRINTER_IP} 2>/dev/null"
log ""
log "On Docker: docker-compose.yml uses  - /run/cups:/run/cups (host socket)"
log "Container submits jobs to HOST CUPS — no internal cupsd needed."
log ""
