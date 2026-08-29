# HomePrint OS — Host CUPS Setup Guide

## Why Host-Managed CUPS?

The HP Smart Tank 670 is a consumer inkjet printer with an IPP Everywhere (driverless) Wi-Fi stack. It requires the **host operating system** (Raspberry Pi OS) to:
1. Run a CUPS daemon (`cupsd`) that manages print queues
2. Install HPLIP for ink level queries and nozzle checks
3. Translate PDF → PWG-Raster → send via IPP to the printer

The Docker container only **submits jobs** to the host's CUPS socket. This gives you:
- Browser-based queue inspection at `http://192.168.1.55:631`
- Real ink level monitoring via HPLIP
- Nozzle check and print head alignment utilities
- Persistent queues that survive container restarts

---

## Prerequisites

| Requirement | Notes |
| :---------- | :---- |
| Raspberry Pi OS 64-bit Lite | Debian Bookworm (12) |
| HP Smart Tank 670 | Connected to same Wi-Fi as the Pi |
| SSH access to Pi | `ssh pi@192.168.1.55` |

---

## Step 1: Run the Setup Script

```bash
# SSH into the Raspberry Pi
ssh pi@192.168.1.55

# Navigate to the project directory
cd ~/home-print

# Make the script executable
chmod +x scripts/setup-host-cups.sh

# Run — auto-discovers printer, or specify IP explicitly
sudo bash scripts/setup-host-cups.sh --printer-ip 192.168.1.60
```

This script:
1. Installs `cups`, `hplip`, `cups-ipp-utils`, `ippfind`, `avahi-daemon`
2. Configures CUPS for LAN remote access (`Listen 0.0.0.0:631`)
3. Registers `HP_Smart_Tank_670` queue using IPP Everywhere driverless driver
4. Sets it as the system default printer
5. Enables remote CUPS Web UI

---

## Step 2: Verify CUPS is Working

```bash
# Check CUPS is running
systemctl status cups

# List registered printers and their device URIs
lpstat -v

# Check default printer
lpstat -d

# Send a test print
lp -d HP_Smart_Tank_670 /usr/share/cups/data/testprint
```

---

## Step 3: Access CUPS Web UI

Open in your browser (from any device on the same Wi-Fi):
```
http://192.168.1.55:631
```

You can:
- View live print queue and job history
- Cancel stuck jobs
- View printer capabilities and driver information
- Add additional printers

---

## Step 4: Check Ink Levels via HPLIP

```bash
# Show all ink tank levels
hp-levels -d 192.168.1.60

# Full printer info including ink and status
hp-info -d 192.168.1.60

# Run nozzle check print
hp-check -d 192.168.1.60
```

---

## Step 5: Deploy the Docker Container

After the host CUPS is running, update the `docker-compose.yml` to mount the **host CUPS socket** (read-write, not read-only):

```yaml
volumes:
  - /run/cups:/run/cups
  - ${DATA_PATH:-/mnt/storage/homeprint_os/data}:/data
```

The container's Node.js app submits jobs via the host socket. No internal `cupsd` runs in the container.

```bash
# Pull latest test branch and redeploy
git fetch origin
git checkout test/printer-decode-fix
git pull

# Deploy (no full rebuild needed — only app code changed, not system packages)
docker compose up -d
```

---

## Troubleshooting

### "Printer or class does not exist"
```bash
# Verify queue name matches what's in SQLite
lpstat -v
# If the queue is named differently, update the default:
lpoptions -d <actual-queue-name>
# Or set it in HomePrint OS Settings → Printer Discovery
```

### Printer shows Offline in HomePrint but is ON
```bash
# Check CUPS can reach it
ipptool -t -v "ipp://192.168.1.60:631/ipp/print" get-printer-attributes.test
```

### Still printing `%PDF-1.6` raw text
The CUPS queue was registered as `-m raw`. Remove and re-register:
```bash
lpadmin -x HP_Smart_Tank_670
lpadmin -p HP_Smart_Tank_670 -E -v "ipp://192.168.1.60:631/ipp/print" -m everywhere
```

### Ink level shows "Unknown"
HPLIP may need network mode enabled:
```bash
hp-setup -i -a 192.168.1.60
```

---

## CUPS Socket Path Notes

| OS | CUPS Socket Path |
| :- | :--------------- |
| Raspberry Pi OS (Debian 12) | `/run/cups/cups.sock` |
| Ubuntu 22.04+ | `/run/cups/cups.sock` |
| Debian 11 and older | `/var/run/cups/cups.sock` |

The `docker-compose.yml` mounts `/run/cups` (Bookworm path). If your Pi uses the older path, update accordingly.
