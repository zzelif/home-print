---
name: local-first-resilience
description: >-
  Use this skill to optimize, configure, or audit HomePrint OS for lightweight edge hosting on Raspberry Pi 4 (64-bit Lite) or legacy hardware, managing SQLite WAL resilience, 4GB/8GB RAM limits, and gated auto-purge lifecycles.
---

# Local-First Resilience & Edge Hosting Protocol

## Overview
HomePrint OS is engineered to run locally and offline on lightweight edge hardware (primarily a **Raspberry Pi 4 Model B running Raspberry Pi OS 64-bit Lite with 8GB RAM** or a legacy 4GB laptop). The system serves responsive web interfaces across local Wi-Fi / Ethernet so operators can manage prints from phones, tablets, or counter stations.

---

## 1. Resource & Memory Budget

```
┌────────────────────────────────────────────────────────────────────────┐
│                      EDGE HOST RESOURCE BUDGET                         │
├────────────────────────────────────────────────────────────────────────┤
│ Host Idle (OS + Fastify + SQLite WAL)      │ < 150MB RAM               │
│ Photo Layout & Canvas Studio View          │ < 250MB RAM               │
│ Headless LibreOffice Conversion (Sandboxed)│ < 256MB RAM (Cgroup Cap)  │
│ Peak Hardware Spooling & Vector Embedding  │ < 400MB RAM               │
│ Available Host Headroom (on 8GB RasPi 4)   │ > 5,000MB Free RAM        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SQLite WAL Mode & Power Loss Resilience

Neighborhood print shops and edge micro-servers face sudden power disconnects. HomePrint OS guarantees database integrity:

- **Journal Mode**: `PRAGMA journal_mode = WAL;` (Write-Ahead Logging ensures non-blocking concurrent reads and atomic writes).
- **Synchronous Flag**: `PRAGMA synchronous = NORMAL;` (Protects against database corruption while maintaining high performance).
- **Foreign Keys**: `PRAGMA foreign_keys = ON;`.
- **Atomic Recovery**: On reboot, SQLite automatically replays the WAL file, restoring consistent state without data loss.

---

## 3. Sandboxed Document Conversion

To prevent large DOCX/PPTX documents from causing memory spikes on edge hardware:
- Headless LibreOffice is invoked with ephemeral sandbox flags:
  ```bash
  systemd-run --scope -p MemoryMax=256M -p CPUQuota=60% \
    soffice --headless --convert-to pdf --outdir /cache/converted \
    --norestore --nofirststartwizard --nologo "$INPUT_FILE"
  ```
- Strict 15-second process timeout kills rogue conversion tasks.
- Encrypted/password-locked PDFs are trapped early and return friendly error messages.

---

## 4. Multi-Device Local Network Workflows

The server binds to `0.0.0.0:5000`:
- **Public Customer Portal**: `http://<host-ip>:5000/drop` (mobile-optimized photo and document upload).
- **Operator Command Center**: `http://<host-ip>:5000` (PIN-authenticated dashboard, Layout Studio, and Cash POS).
- **Touchscreen Friendly**: All touch targets are $\ge 56\text{px}$ high, viewport is locked against accidental zoom, and cashier change counters are in 48pt bold green.

---

## 5. Gated 1-Hour Privacy Purge Lifecycle

1. When a job completes printing, files enter the 1-hour reprint grace window.
2. If a customer requests extra copies, the operator can tap **1-Click Reprint** without re-uploading.
3. After 1 hour (or when the operator taps "Purge Completed"), temporary uploaded files and generated PDFs are cleanly unlinked to preserve customer privacy and free up storage.
