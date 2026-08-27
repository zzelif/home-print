#!/bin/bash
# ==============================================================================
# HomePrint OS — External USB SSD Persistent Mount Utility
# Formats (optional) and adds resilient /etc/fstab mount for the data SSD
# ==============================================================================

set -e

MOUNT_DIR="/mnt/ssd"

echo "=============================================================================="
echo "HomePrint OS — External SSD Setup & Persistent Mount Configuration"
echo "=============================================================================="

# 1. Discover all connected storage devices
echo "=== [1/4] Connected Storage Block Devices ==="
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,UUID

echo -e "\n------------------------------------------------------------------------------"
read -rp "Enter the partition identifier for your SSD (e.g. sda1 or sdb1): " PART_INPUT

# Clean up input (strip /dev/ if entered)
PART_NAME=$(echo "$PART_INPUT" | sed 's|/dev/||')
PART_DEVICE="/dev/$PART_NAME"

if [ ! -b "$PART_DEVICE" ]; then
    echo "[ERROR] Device '$PART_DEVICE' does not exist or is not a valid block device."
    exit 1
fi

# 2. Check if filesystem already exists
UUID=$(blkid -s UUID -o value "$PART_DEVICE" || true)
FSTYPE=$(blkid -s TYPE -o value "$PART_DEVICE" || true)

if [ -z "$FSTYPE" ]; then
    echo "[WARN] No filesystem detected on $PART_DEVICE."
    read -rp "Format $PART_DEVICE as ext4? ALL EXISTING DATA ON $PART_DEVICE WILL BE ERASED (y/N): " CONFIRM_FMT
    if [[ "$CONFIRM_FMT" =~ ^[Yy]$ ]]; then
        echo "Formatting $PART_DEVICE with ext4..."
        sudo mkfs.ext4 -F "$PART_DEVICE"
        UUID=$(blkid -s UUID -o value "$PART_DEVICE")
        FSTYPE="ext4"
    else
        echo "[ERROR] Cannot mount unformatted partition without a filesystem. Exiting."
        exit 1
    fi
fi

echo "Detected UUID: $UUID"
echo "Detected Filesystem: $FSTYPE"

# 3. Create mount point directory
echo "=== [2/4] Creating Mount Point Directory at $MOUNT_DIR ==="
sudo mkdir -p "$MOUNT_DIR"

# 4. Add persistent entry to /etc/fstab (if not already present)
echo "=== [3/4] Adding Resilient Persistent Mount to /etc/fstab ==="
if grep -q "$UUID" /etc/fstab; then
    echo "Entry with UUID=$UUID already exists in /etc/fstab."
else
    # Mount options:
    # - noatime: Eliminates access-time write overhead (crucial for flash/SSD longevity)
    # - nofail: Allows the Pi to boot smoothly even if the external drive is temporarily unplugged
    # - x-systemd.device-timeout=10: Prevents boot hangs waiting for slow USB spindown
    FSTAB_LINE="UUID=$UUID  $MOUNT_DIR  $FSTYPE  defaults,noatime,nofail,x-systemd.device-timeout=10  0  2"
    echo "Appending to /etc/fstab: $FSTAB_LINE"
    sudo bash -c "echo '$FSTAB_LINE' >> /etc/fstab"
fi

# Mount all drives
echo "Mounting all fstab filesystems..."
sudo mount -a

# 5. Set directory permissions and data folder
echo "=== [4/4] Configuring Data Directory Permissions ==="
sudo mkdir -p "$MOUNT_DIR/homeprint-data"
sudo chown -R "$USER:$USER" "$MOUNT_DIR"

echo "=============================================================================="
echo "External SSD Successfully Mounted!"
echo "Mount Point: $MOUNT_DIR"
echo "Available Space: $(df -h "$MOUNT_DIR" | awk 'NR==2 {print $4}')"
echo "Data Directory: $MOUNT_DIR/homeprint-data"
echo "=============================================================================="

