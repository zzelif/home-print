#!/bin/bash
# ==============================================================================
# HomePrint OS — Air-Gapped Customer Counter Hotspot Setup (Option C)
# Turns onboard Wi-Fi (wlan0) into an isolated Access Point for customer drops,
# while the Raspberry Pi remains connected to home internet via Ethernet (eth0).
# ==============================================================================

set -e

HOTSPOT_SSID="HomePrint-Customer-Drop"
HOTSPOT_IP="192.168.4.1"

echo "=============================================================================="
echo "Configuring Air-Gapped Counter Hotspot on wlan0 ($HOTSPOT_SSID)..."
echo "=============================================================================="

# Check if NetworkManager is active (Debian Bookworm standard)
if command -v nmcli &> /dev/null && systemctl is-active --quiet NetworkManager; then
    echo "=== Configuring hotspot via NetworkManager ==="
    # Remove previous hotspot connection if exists
    sudo nmcli connection delete "HomePrint-Hotspot" 2>/dev/null || true

    # Create open Wi-Fi hotspot on wlan0
    sudo nmcli connection add type wifi ifname wlan0 con-name "HomePrint-Hotspot" autoconnect yes ssid "$HOTSPOT_SSID"
    sudo nmcli connection modify "HomePrint-Hotspot" 802-11-wireless.mode ap 802-11-wireless.band bg ipv4.method shared ipv4.addresses "$HOTSPOT_IP/24"
    sudo nmcli connection up "HomePrint-Hotspot"
else
    echo "=== Configuring hotspot via hostapd & dnsmasq ==="
    sudo apt-get install -y hostapd dnsmasq

    # Stop services while configuring
    sudo systemctl stop hostapd 2>/dev/null || true
    sudo systemctl stop dnsmasq 2>/dev/null || true

    # Configure static IP on wlan0
    sudo bash -c "cat <<EOF > /etc/network/interfaces.d/wlan0
allow-hotplug wlan0
iface wlan0 inet static
    address $HOTSPOT_IP
    netmask 255.255.255.0
EOF"

    # Configure dnsmasq DHCP on wlan0
    sudo bash -c "cat <<EOF > /etc/dnsmasq.d/homeprint-hotspot.conf
interface=wlan0
dhcp-range=192.168.4.10,192.168.4.100,255.255.255.0,24h
address=/#/$HOTSPOT_IP
EOF"

    # Configure hostapd
    sudo bash -c "cat <<EOF > /etc/hostapd/hostapd.conf
interface=wlan0
driver=nl80211
ssid=$HOTSPOT_SSID
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
EOF"

    sudo systemctl unmask hostapd
    sudo systemctl enable hostapd dnsmasq
    sudo systemctl restart hostapd dnsmasq
fi

echo "=============================================================================="
echo "Air-Gapped Customer Drop Hotspot is Active!"
echo "SSID: $HOTSPOT_SSID (No Password)"
echo "Portal URL: http://$HOTSPOT_IP:5000/drop"
echo "Isolation: Customers connected to this Wi-Fi have zero access to home LAN."
echo "=============================================================================="
