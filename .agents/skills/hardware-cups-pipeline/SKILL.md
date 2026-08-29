---
name: hardware-cups-pipeline
description: >-
  Use this skill when developing, calibrating, or troubleshooting the HP Smart Tank 670 hardware driver, CUPS spooling, PPD introspection, or Windows spooler fallback.
---

# Hardware & CUPS Driver Subsystem Protocol

## Overview
HomePrint OS directly orchestrates physical printing to the **HP Smart Tank 670 All-in-One** over USB 2.0 or local Wi-Fi IPP, hosted on a **Raspberry Pi 4 (Raspberry Pi OS 64-bit Lite)** or laptop, bypassing proprietary cloud apps (such as HP Smart).

---

## 0. Host-Managed CUPS Architecture (PRIMARY — MANDATORY)

> **Non-Negotiable**: CUPS must be installed on the Raspberry Pi host OS **before** the Docker container is deployed. The Docker container submits jobs to the host CUPS socket — it does not run its own internal cupsd.

### Why Host-Managed?
- The HP Smart Tank 670 has no onboard PDF/PostScript interpreter — it requires CUPS to process jobs through IPP Everywhere
- A container-internal cupsd crashed silently when `/var/run/cups` was mounted read-only (`:ro`) from a host with no CUPS installed
- Host CUPS provides CUPS Web UI (`http://192.168.1.55:631`), HPLIP ink levels, nozzle checks, and persistent queue state across container restarts

### Setup on Raspberry Pi Host
```bash
sudo bash scripts/setup-host-cups.sh --printer-ip 192.168.1.60
```

### docker-compose.yml Socket Mount (READ-WRITE, no :ro)
```yaml
volumes:
  - ${DATA_PATH:-/mnt/storage/homeprint_os/data}:/data
  - ${CUPS_SOCKET_DIR:-/run/cups}:/run/cups
```

### Dockerfile — CUPS Client Config (no internal cupsd)
```dockerfile
RUN echo "ServerName /run/cups/cups.sock" > /etc/cups/client.conf
CMD ["node", "dist/server.js"]   # No "service cups start &&"
```

---

## 1. Dynamic PPD Driver Mapping (Linux / CUPS / Raspberry Pi 4)

To avoid wasting expensive color ink on black & white jobs:
- Inspect `/etc/cups/ppd/HP_Smart_Tank_670.ppd` dynamically via `PpdDiscoveryService`.
- Map detected vendor options:
  - **Monochrome Mode**: `ColorModel=Gray` or `OutputMode=BlackOnlyGrayscale` or `print-color-mode=monochrome`.
  - **Color Mode**: `ColorModel=RGB` or `ColorModel=Color`.
  - **4R Glossy Photo**: `MediaType=PhotographicGlossy` and `media=Custom.4x6in.Borderless`.
  - **High-Quality Vector Print**: `print-quality=5`.

---

## 2. Ink Level Monitoring (InkLevelService)

Priority order for reading ink levels from HP Smart Tank 670:

1. **HPLIP `hp-levels -d <ip>`** — most accurate, reads actual tank sensor data
2. **HPLIP `hp-info -d <ip>`** — broader info including ink section
3. **IPP `Get-Printer-Attributes`** — standard IPP Everywhere marker levels
4. **SQLite cache** — returns cached reading if live read fails (5-minute TTL)

### HPLIP Commands
```bash
hp-levels -d 192.168.1.60          # Ink percentages per color
hp-info -d 192.168.1.60            # Full printer info including ink
hp-check -d 192.168.1.60 --nozzle  # Nozzle check print
hp-testpage -d 192.168.1.60        # HP test page
```

### API Routes
- `GET /api/operator/printers/ink-levels?ip=<optional>` — live ink levels
- `POST /api/operator/printers/nozzle-check` — triggers HP nozzle check print
- `GET /api/operator/printers/queue?queue=<optional>` — live CUPS queue state
- `DELETE /api/operator/printers/queue/jobs/:jobId` — cancel a job

---

## 3. Queue Inspection & Job Control

```bash
lpstat -v                           # List all registered queues and device URIs
lpstat -p HP_Smart_Tank_670         # Queue state (idle/printing/stopped)
lpstat -o HP_Smart_Tank_670         # Active jobs in queue
lpstat -l -o HP_Smart_Tank_670      # Detailed active jobs with titles
cupsaccept HP_Smart_Tank_670        # Enable job acceptance
cupsenable HP_Smart_Tank_670        # Enable printing
cancel HP_Smart_Tank_670-42         # Cancel job #42
```

---

## 4. Realistic Reachability Probing (Zero Mocking)

- **LAN Reachability**: Probes dynamic ARP table and checks raw print port `9100`, IPP `631`, and HTTP `80` sockets.
- **Physical USB Presence**: Checks `lsusb` on Linux / Raspberry Pi and `Win32_PnPEntity` for active USB device bus connection.
- **Single Default Persistence**: Persists chosen default printer into SQLite `system_settings` (`default_printer_name`).

---

## 5. Queue Registration — IPP Everywhere (Driverless)

**CRITICAL**: The HP Smart Tank 670 has no PDF interpreter ASIC. **NEVER use `-m raw`**.

```bash
# Remove stale queue
lpadmin -x HP_Smart_Tank_670

# Register IPP Everywhere driverless queue
lpadmin -p HP_Smart_Tank_670 -E -v "ipp://192.168.1.60:631/ipp/print" -m everywhere

# Enable and accept jobs
cupsenable HP_Smart_Tank_670
cupsaccept HP_Smart_Tank_670

# Set as default
lpoptions -d HP_Smart_Tank_670
```

---

## 6. Windows Fallback Mode

When running development or fallback on Windows:
- Query printers via PowerShell CIM instances (`Win32_Printer`, `Win32_TCPIPPrinterPort`).
- Check physical presence via `Win32_PnPEntity` for USB device bus status.
- Dispatch jobs via `Start-Process -FilePath <pdf> -Verb Print` or simulate with explicit telemetry logs.

---

## 7. Physical Hardware Calibration Protocol

1. **Alignment & Swatch Test**:
   - Send `POST /api/operator/printers/test-swatch`.
   - Verify CMYK color density, outer border alignment, and microtext sharpness (4pt to 12pt).
2. **Dimension Verification**:
   - Measure 2x2" and 1x1" prints with a caliper to verify $\pm 0.2\text{mm}$ physical accuracy.
3. **Borderless Bleed Offset**:
   - If overspray expands dimensions beyond $2.00\text{ in}$, apply overspray bleed scaling factor ($0.985$).

---

## 8. Common Failure Modes & Fixes

| Error | Root Cause | Fix |
| :---- | :--------- | :-- |
| "printer or class does not exist" | No CUPS installed on host or wrong queue name | Run `setup-host-cups.sh`, verify `lpstat -v` |
| Prints literal `%PDF-1.6` text | Queue registered with `-m raw` | Re-register with `-m everywhere` |
| Status always "Offline" | Wake latency >400ms from Wi-Fi DTIM power-save | Probe timeout raised to 1500ms with 1 retry |
| `cups.sock` not found | Host CUPS not running or wrong mount path | `systemctl start cups`, check `/run/cups` vs `/var/run/cups` |
| Ink levels show "Unknown" | HPLIP not set up for network mode | `hp-setup -i -a 192.168.1.60` |

