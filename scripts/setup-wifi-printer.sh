#!/bin/bash
# ==============================================================================
# HomePrint OS — Wi-Fi Network Printer Setup Script for HP Smart Tank 670
# Connects Raspberry Pi CUPS to HP Smart Tank 670 over local Wi-Fi / IPP
# ==============================================================================

set -e

PRINTER_NAME="HP_Smart_Tank_670"

echo "=============================================================================="
echo "Setting up HP Smart Tank 670 over Local Wi-Fi (CUPS IPP / Network)..."
echo "=============================================================================="

# 1. Probing for network printers on LAN via avahi, dnssd, and raw print ports
echo "=== [1/3] Scanning for HP Smart Tank on local Wi-Fi / LAN ==="
DISCOVERED_URI=""

# Try Avahi mDNS discovery first (standard on Debian/Raspberry Pi)
if command -v avahi-browse &> /dev/null; then
    PRINTER_HOST=$(avahi-browse -rt _ipp._tcp 2>/dev/null | grep -i "hostname =" | head -n 1 | awk -F'[' '{print $2}' | awk -F']' '{print $1}' || true)
    if [ -n "$PRINTER_HOST" ]; then
        DISCOVERED_URI="ipp://$PRINTER_HOST/ipp/print"
    fi
fi

# Try ippfind
if [ -z "$DISCOVERED_URI" ] && command -v ippfind &> /dev/null; then
    DISCOVERED_URI=$(ippfind -T 5 2>/dev/null | grep -i "hp" | head -n 1 || true)
fi

# Try lpinfo
if [ -z "$DISCOVERED_URI" ] && command -v lpinfo &> /dev/null; then
    DISCOVERED_URI=$(lpinfo -v 2>/dev/null | grep -i "dnssd://.*hp" | awk '{print $2}' | head -n 1 || true)
fi

# Try scanning local ARP table for active printer ports (9100, 631)
if [ -z "$DISCOVERED_URI" ]; then
    echo "Scanning active LAN devices for printer ports..."
    for IP in $(arp -an 2>/dev/null | grep -oP '\(\K[^\)]+' || ip neigh 2>/dev/null | awk '{print $1}'); do
        if timeout 0.5 bash -c "echo > /dev/tcp/$IP/9100" 2>/dev/null || timeout 0.5 bash -c "echo > /dev/tcp/$IP/631" 2>/dev/null; then
            echo "Found active printer service at IP: $IP"
            DISCOVERED_URI="ipp://$IP/ipp/print"
            break
        fi
    done
fi

# 2. Prompt or accept manual IP if auto-discovery is empty
if [ -z "$DISCOVERED_URI" ]; then
    echo "Could not automatically discover printer mDNS URI."
    read -rp "Please enter your HP Smart Tank 670 IP address (e.g. 192.168.1.50): " PRINTER_IP
    if [ -n "$PRINTER_IP" ]; then
        DISCOVERED_URI="ipp://$PRINTER_IP/ipp/print"
    else
        echo "No IP provided. Exiting setup."
        exit 1
    fi
fi

echo "Using Printer URI: $DISCOVERED_URI"


# 3. Add Printer to CUPS as Driverless IPP Everywhere or standard HP queue
echo "=== [2/3] Adding $PRINTER_NAME to CUPS queue ==="
sudo lpadmin -p "$PRINTER_NAME" -E -v "$DISCOVERED_URI" -m everywhere 2>/dev/null || \
sudo lpadmin -p "$PRINTER_NAME" -E -v "$DISCOVERED_URI" -m drv:///hp/hpcups.drv/hp-smart_tank_670_series.ppd 2>/dev/null || \
sudo lpadmin -p "$PRINTER_NAME" -E -v "$DISCOVERED_URI" -m raw

# 4. Set as default printer and accept jobs
echo "=== [3/3] Setting $PRINTER_NAME as Default Printer ==="
sudo lpadmin -d "$PRINTER_NAME"
sudo cupsenable "$PRINTER_NAME"
sudo cupsaccept "$PRINTER_NAME"

echo "=============================================================================="
echo "Wi-Fi Printer Configuration Complete!"
echo "Default Printer: $(lpstat -d)"
echo "Printer Status:  $(lpstat -p $PRINTER_NAME)"
echo "=============================================================================="
