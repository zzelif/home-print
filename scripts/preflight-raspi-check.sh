#!/bin/bash
# ==============================================================================
# HomePrint OS — Raspberry Pi Pre-Flight Hardware & Network Sanity Diagnostic
# Audits Wi-Fi, Ethernet, external SSD mount, CUPS, LibreOffice, thermals & power
# ==============================================================================

set -u

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=============================================================================="
echo "HomePrint OS — Raspberry Pi 4 Pre-Flight System Diagnostic"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 1. System Architecture & Memory
# ------------------------------------------------------------------------------
echo -e "\n[1/6] Hardware Architecture & Memory:"
ARCH=$(uname -m)
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
FREE_RAM_MB=$(free -m | awk '/^Mem:/{print $7}')

if [ "$ARCH" = "aarch64" ]; then
    echo -e "  ${GREEN}[OK]${NC} Architecture: $ARCH (64-bit ARM Linux)"
else
    echo -e "  ${YELLOW}[WARN]${NC} Architecture: $ARCH (Warning: 64-bit aarch64 recommended for Sharp & LibreOffice)"
fi
echo -e "  ${GREEN}[OK]${NC} RAM: ${TOTAL_RAM_MB}MB Total | ${FREE_RAM_MB}MB Free"

# ------------------------------------------------------------------------------
# 2. Thermal & Voltage Throttling Inspection
# ------------------------------------------------------------------------------
echo -e "\n[2/6] Thermal & Power Supply Health:"
if command -v vcgencmd &> /dev/null; then
    TEMP=$(vcgencmd measure_temp)
    THROTTLED=$(vcgencmd get_throttled)
    echo -e "  ${GREEN}[OK]${NC} CPU Temperature: $TEMP"
    if [ "$THROTTLED" = "throttled=0x0" ]; then
        echo -e "  ${GREEN}[OK]${NC} Power & Voltage: Nominal (No under-voltage or thermal throttling detected)"
    else
        echo -e "  ${RED}[WARN]${NC} Power Warning ($THROTTLED): Possible under-voltage or thermal throttling. Check power supply (5V 3A required)."
    fi
elif [ -f /sys/class/thermal/thermal_zone0/temp ]; then
    RAW_TEMP=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$((RAW_TEMP / 1000))
    echo -e "  ${GREEN}[OK]${NC} CPU Temperature: ${TEMP_C}°C"
fi

# ------------------------------------------------------------------------------
# 3. Storage & External SSD Mount Audit
# ------------------------------------------------------------------------------
echo -e "\n[3/6] Storage & External SSD Mount Status:"
ROOT_DEVICE=$(df -h / | awk 'NR==2 {print $1}')
ROOT_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
echo -e "  ${GREEN}[OK]${NC} OS Boot Drive (/): $ROOT_DEVICE | Available: $ROOT_AVAIL"

SSD_MOUNT=""
if mountpoint -q "/mnt/storage" 2>/dev/null; then
    SSD_MOUNT="/mnt/storage"
elif mountpoint -q "/mnt/ssd" 2>/dev/null; then
    SSD_MOUNT="/mnt/ssd"
fi

if [ -n "$SSD_MOUNT" ]; then
    SSD_AVAIL=$(df -h "$SSD_MOUNT" | awk 'NR==2 {print $4}')
    echo -e "  ${GREEN}[OK]${NC} External SSD Mounted: $SSD_MOUNT | Available: $SSD_AVAIL"
    # Write test
    TEST_DIR="$SSD_MOUNT/homeprint_os"
    mkdir -p "$TEST_DIR" 2>/dev/null || true
    TEST_FILE="$TEST_DIR/.homeprint_write_test"
    if touch "$TEST_FILE" 2>/dev/null && rm -f "$TEST_FILE"; then
        echo -e "  ${GREEN}[OK]${NC} SSD Write Permissions: Confirmed writable ($TEST_DIR)"
    else
        echo -e "  ${RED}[FAIL]${NC} SSD Write Permission Error: Cannot write to $SSD_MOUNT. Check chown/permissions."
    fi
else
    echo -e "  ${YELLOW}[WARN]${NC} External SSD not mounted at /mnt/storage or /mnt/ssd."
    echo -e "    Run 'sudo ./scripts/mount-ssd.sh' to configure persistent SSD storage."
fi

# ------------------------------------------------------------------------------
# 4. Network Interfaces & Wi-Fi State Probing
# ------------------------------------------------------------------------------
echo -e "\n[4/6] Network Interfaces & Wi-Fi Diagnostics:"

# Ethernet probe
ETH_IP=$(ip -4 addr show eth0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || true)
if [ -n "$ETH_IP" ]; then
    echo -e "  ${GREEN}[OK]${NC} Ethernet (eth0): Connected ($ETH_IP)"
else
    echo -e "  ${YELLOW}[WARN]${NC} Ethernet (eth0): No IP assigned (Check physical cable connection)"
fi

# Wi-Fi hardware & rfkill probe
if command -v rfkill &> /dev/null; then
    WIFI_BLOCKED=$(rfkill list wifi 2>/dev/null | grep -i "Soft blocked: yes" || true)
    if [ -n "$WIFI_BLOCKED" ]; then
        echo -e "  ${RED}[FAIL]${NC} Wi-Fi (wlan0) is Soft-Blocked by rfkill!"
        echo -e "    Fix: Run 'sudo rfkill unblock wifi'"
    else
        echo -e "  ${GREEN}[OK]${NC} Wi-Fi (wlan0) Hardware: Enabled and unblocked"
    fi
fi

WLAN_IP=$(ip -4 addr show wlan0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || true)
if [ -n "$WLAN_IP" ]; then
    echo -e "  ${GREEN}[OK]${NC} Wi-Fi (wlan0) IP: $WLAN_IP"
else
    echo -e "  ${YELLOW}[INFO]${NC} Wi-Fi (wlan0): Not connected to client Wi-Fi (Ready for standalone Hotspot mode or router Wi-Fi)"
fi

# ------------------------------------------------------------------------------
# 5. Core Print Subsystem & Conversion Tooling
# ------------------------------------------------------------------------------
echo -e "\n[5/6] Print Services & Document Converters:"

# CUPS
if systemctl is-active --quiet cups 2>/dev/null; then
    echo -e "  ${GREEN}[OK]${NC} CUPS Daemon: Active & Running"
else
    echo -e "  ${RED}[FAIL]${NC} CUPS Daemon: Inactive / Not installed. Run 'sudo ./scripts/setup-raspberry-pi.sh'"
fi

# Avahi mDNS
if systemctl is-active --quiet avahi-daemon 2>/dev/null; then
    echo -e "  ${GREEN}[OK]${NC} Avahi mDNS (homeprint.local): Active & Broadcasting"
else
    echo -e "  ${YELLOW}[WARN]${NC} Avahi mDNS: Inactive (mDNS name resolution may not work)"
fi

# Headless LibreOffice
if command -v soffice &> /dev/null; then
    LO_VER=$(soffice --version | head -n 1)
    echo -e "  ${GREEN}[OK]${NC} LibreOffice: Installed ($LO_VER)"
else
    echo -e "  ${RED}[FAIL]${NC} LibreOffice: Not installed (Required for DOCX/PPTX conversion)"
fi

# Node.js
if command -v node &> /dev/null; then
    NODE_VER=$(node -v)
    echo -e "  ${GREEN}[OK]${NC} Node.js Runtime: $NODE_VER"
else
    echo -e "  ${RED}[FAIL]${NC} Node.js: Not installed"
fi

# ------------------------------------------------------------------------------
# 6. Default Printer Reachability
# ------------------------------------------------------------------------------
echo -e "\n[6/6] Printer Subsystem & Reachability:"
if command -v lpstat &> /dev/null; then
    DEFAULT_PRINTER=$(lpstat -d 2>/dev/null | awk -F': ' '{print $2}' || true)
    if [ -n "$DEFAULT_PRINTER" ] && [ "$DEFAULT_PRINTER" != "no system default destination" ]; then
        echo -e "  ${GREEN}[OK]${NC} Default CUPS Printer: $DEFAULT_PRINTER"
        PRINTER_STATE=$(lpstat -p "$DEFAULT_PRINTER" 2>/dev/null | head -n 1)
        echo -e "    Status: $PRINTER_STATE"
    else
        echo -e "  ${YELLOW}[WARN]${NC} No default CUPS printer configured yet."
        echo -e "    Run './scripts/setup-wifi-printer.sh' to bind your network printer."
    fi
else
    echo -e "  ${YELLOW}[WARN]${NC} lpstat utility not available."
fi

echo -e "\n=============================================================================="
echo "Pre-flight check complete."
echo "=============================================================================="

