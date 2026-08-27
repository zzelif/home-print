# 09. Raspberry Pi 4 Hardware Migration & Operational Runbook

> **Host System**: Raspberry Pi 4 Model B (8GB RAM, Raspberry Pi OS 64-bit Lite / Debian Bookworm)  
> **Boot & OS Storage**: MicroSD Card (Hosts OS, root filesystem `/`)  
> **Data & Application Storage**: External USB 3.0 SSD (Mounted at `/mnt/storage` or `/mnt/ssd` for SQLite WAL, uploads, converted PDFs, and backups)  
> **Target Printer**: HP Smart Tank 670 All-in-One (Connected over Local Wi-Fi IPP `ipp://<printer-ip>/ipp/print`)  
> **Network Uplink**: Gigabit Ethernet (`eth0`) to router  
> **Repository**: `https://github.com/your-org/home-print`  

---

## 1. Storage Topology & MicroSD Longevity Protection

```
+-----------------------------------------------------------------------------+
|                       DUAL-TIER STORAGE ARCHITECTURE                        |
+-----------------------------------------------------------------------------+
|                                                                             |
|   +--------------------------------+    +---------------------------------+ |
|   |     MicroSD Card (Slot)        |    | External USB 3.0 SSD (/mnt/...) | |
|   +--------------------------------+    +---------------------------------+ |
|   | * Raspberry Pi OS 64-bit Lite  |    | * SQLite WAL Database           | |
|   | * Linux Kernel & Bootloader    |    | * Temp Converted PDFs & Buffers | |
|   | * System Binaries (/usr, /etc) |    | * Customer Upload Dropzone      | |
|   | * Read-heavy / Minimal writes  |    | * Daily Compressed Backups      | |
|   +--------------------------------+    +---------------------------------+ |
|                                                                             |
+-----------------------------------------------------------------------------+
```

---

## 2. Step 1: Pre-Flight Hardware & Network Sanity Diagnostic

Before doing any configuration, verify that all hardware subsystems (Ethernet, Wi-Fi, CUPS, memory, power) are enabled and healthy.

Run the diagnostic script:
```bash
cd ~/home-print
chmod +x scripts/*.sh
./scripts/preflight-raspi-check.sh
```

### Common Pre-Flight Issues & Grounded Fixes:
* **Issue 1: Wi-Fi is Soft-Blocked (`rfkill`)**:
  ```bash
  # Check status:
  rfkill list wifi
  # Unblock Wi-Fi:
  sudo rfkill unblock wifi
  sudo nmcli radio wifi on
  ```
* **Issue 2: Under-Voltage Warning (`throttled=0x50000`)**:
  - Ensure the Raspberry Pi 4 is powered by an official **5.1V / 3.0A USB-C power supply**. Weak phone chargers cause CPU throttling and USB dropouts.
* **Issue 3: CUPS or Avahi Daemon Inactive**:
  ```bash
  sudo systemctl enable --now cups avahi-daemon
  ```

---

## 3. Step 2: External SSD Partitioning & Persistent Mount (`/mnt/storage` or `/mnt/ssd`)

Mounting your external SSD with `noatime,nofail` eliminates write fatigue on the MicroSD card while ensuring the Pi boots reliably even if the drive is disconnected.

### Automated Mount Utility:
```bash
sudo ./scripts/mount-ssd.sh
```

### Manual Step-by-Step Procedure:
1. **Identify Block Device**:
   ```bash
   lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,UUID
   # Example: sda (111.8G) -> sda4 (111.2G ntfs / ext4)
   ```
2. **Format to ext4 (if brand new drive)**:
   ```bash
   sudo mkfs.ext4 -F /dev/sda1
   ```
3. **Get Filesystem UUID**:
   ```bash
   sudo blkid -s UUID -o value /dev/sda1
   # Example output: a1b2c3d4-e5f6-7890-abcd-ef1234567890
   ```
4. **Create Mount Point**:
   ```bash
   sudo mkdir -p /mnt/storage
   ```
5. **Add to `/etc/fstab` with Resilient Options**:
   ```bash
   # Append to /etc/fstab:
   UUID=<your-uuid>  /mnt/storage  ext4  defaults,noatime,nofail,x-systemd.device-timeout=10  0  2
   ```
6. **Mount and Set Permissions**:
   ```bash
   sudo mount -a
   sudo mkdir -p /mnt/storage/homeprint_os/data
   sudo chown -R $USER:$USER /mnt/storage/homeprint_os
   ```

---

## 4. Step 3: Checkpoint Database & Deploy Repository

### 1. Checkpoint Local SQLite Database on Dev Laptop
Before copying `homeprint.sqlite`, merge all active Write-Ahead Logging transactions:
```sql
PRAGMA wal_checkpoint(TRUNCATE);
```

### 2. Copy Database to SSD on the Pi:
```powershell
# From local workstation:
scp homeprint.sqlite user@homelab:/mnt/storage/homeprint_os/data/homeprint.sqlite
```

### 3. Deploy via Docker Compose (Recommended) or Bare-Metal:
```bash
# In ~/home-print:
# Start via Docker Compose:
docker compose up -d --build
```
*Note: `DATABASE_PATH=/data/homeprint.sqlite` maps directly to `/mnt/storage/homeprint_os/data/homeprint.sqlite` on the external SSD.*

---

## 5. Step 4: Wi-Fi Printer Configuration (HP Smart Tank 670)

Because the HP Smart Tank 670 is connected over Wi-Fi:

1. Run the dynamic network discovery script:
   ```bash
   ./scripts/setup-wifi-printer.sh
   ```
2. The script probes for driverless IPP Everywhere:
   ```bash
   sudo lpadmin -p HP_Smart_Tank_670 -E -v ipp://<printer-ip>/ipp/print -m everywhere
   sudo lpadmin -d HP_Smart_Tank_670
   ```
3. Test physical hardware communication:
   ```bash
   lpstat -p -d
   ```

---

## 6. Step 5: Routine Maintenance & Raspberry Pi Health

To ensure 24/7 reliability, longevity, and optimal performance:

### Automated Maintenance Script:
Run periodically or via weekly cron:
```bash
./scripts/maintain-raspi.sh
```

### What It Performs:
1. **Package Updates**: `sudo apt-get update && sudo apt-get --with-new-pkgs upgrade -y && sudo apt-get autoremove -y`.
2. **SSD TRIM (`fstrim`)**: `sudo fstrim -av` to maintain SSD NAND flash read/write performance.
3. **Log Vacuuming**: `sudo journalctl --vacuum-time=7d` to prevent disk bloat.
4. **SQLite Health Audit**: `sqlite3 /mnt/storage/homeprint_os/data/homeprint.sqlite "PRAGMA integrity_check;"`.
5. **Nightly Automated Database Backups**: Executed every night at 11:00 PM via [`scripts/backup-db.sh`](../scripts/backup-db.sh).

