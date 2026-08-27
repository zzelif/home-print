---
name: hardware-cups-pipeline
description: >-
  Use this skill when developing, calibrating, or troubleshooting the HP Smart Tank 670 hardware driver, CUPS spooling, PPD introspection, or Windows spooler fallback.
---

# Hardware & CUPS Driver Subsystem Protocol

## Overview
HomePrint OS directly orchestrates physical printing to the **HP Smart Tank 670 All-in-One** over USB 2.0 or local Wi-Fi IPP, hosted on a **Raspberry Pi 4 (Raspberry Pi OS 64-bit Lite)** or laptop, bypassing proprietary cloud apps (such as HP Smart).

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

## 2. Realistic Reachability Probing (Zero Mocking)

- **LAN Reachability**: Probes dynamic ARP table and checks raw print port `9100`, IPP `631`, and HTTP `80` sockets.
- **Physical USB Presence**: Checks `lsusb` on Linux / Raspberry Pi and `Win32_PnPEntity` for active USB device bus connection.
- **Single Default Persistence**: Persists chosen default printer into SQLite `system_settings` (`default_printer_name`).

---

## 3. Windows Fallback Mode

When running development or fallback on Windows:
- Query printers via PowerShell CIM instances (`Win32_Printer`, `Win32_TCPIPPrinterPort`).
- Check physical presence via `Win32_PnPEntity` for USB device bus status.
- Dispatch jobs via `Start-Process -FilePath <pdf> -Verb Print` or simulate with explicit telemetry logs.

---

## 4. Physical Hardware Calibration Protocol

1. **Alignment & Swatch Test**:
   - Send `POST /api/operator/printers/test-swatch`.
   - Verify CMYK color density, outer border alignment, and microtext sharpness (4pt to 12pt).
2. **Dimension Verification**:
   - Measure 2x2" and 1x1" prints with a caliper to verify $\pm 0.2\text{mm}$ physical accuracy.
3. **Borderless Bleed Offset**:
   - If overspray expands dimensions beyond $2.00\text{ in}$, apply overspray bleed scaling factor ($0.985$).
