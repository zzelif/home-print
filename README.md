# HomePrint OS — Edge-First Local Print Shop Operating System

> **Zero-Cloud, High-Precision Local Print Shop OS** designed for edge hardware (Raspberry Pi 4 / Linux / Windows) and non-technical counter operators, featuring 300 DPI vector layout compositing, ITU-R BT.601 pixel-chromaticity classification, and native CUPS / Windows hardware spooling.

---

## 1. System Architecture Overview

HomePrint OS operates as a self-contained, offline-first print shop management system. It pairs an ultra-intuitive, mother-centric operator frontend with a stateful graph-driven backend pipeline that orchestrates document conversion, layout rendering, pricing calculation, hardware dispatch, and auto-purge lifecycles.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LAYER 1: CLIENT FRONTEND                         │
│   • Vue 3 SPA (Vite + Tailwind CSS + Pinia)                                 │
│   • HTML5 Canvas & Sharp Slot Preview (Physical Millimeter Coordinates)      │
│   • Mother-Centric UX: 56px+ Touch Targets, 48pt Change POS, Zero Jargon    │
│   • Public Mobile PWA (/drop) for Zero-Friction Customer Uploads            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Port 5000)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            LAYER 2: FASTIFY BACKEND                         │
│   • Route Controller & 4-Digit Operator PIN Security Session Middleware     │
│   • Stateful Graph Execution Pipeline (Ingest ➔ Layout ➔ Gate ➔ Spool)     │
│   • Real-Time WebSocket Telemetry Hub (Hardware & Queue Broadcasts)         │
│   • Dynamic PPD Discovery & Driver Introspection Service                    │
└──────────────────┬──────────────────────────────────────────┬───────────────┘
                   │ Sandboxed Execution                      │ In-Memory Stream
┌──────────────────▼──────────────────┐   ┌───────────────────▼───────────────┐
│   LAYER 3A: DOCUMENT CONVERTER      │   │   LAYER 3B: PDF & IMAGE ENGINE    │
│   • Headless LibreOffice CLI        │   │   • `pdf-lib` Vector Compositor   │
│   • Sandboxed Execution             │   │   • `sharp` Slot-Aware Transforms │
│   • ITU-R BT.601 Chromaticity Calc  │   │   • Streaming Memory <40MB RAM    │
└──────────────────┬──────────────────┘   └───────────────────┬───────────────┘
                   │ Converted PDF / Spool Path               │
┌──────────────────▼──────────────────────────────────────────▼───────────────┐
│                            LAYER 4: HARDWARE & OS                           │
│   • CUPS Spooler (`lp`, `lpstat`, `cancel`) & Windows Spooler Fallback      │
│   • HPLIP Open-Source Driver (`hpmud`/`hp-cups`)                            │
│   • SQLite Database Engine with WAL Mode (`better-sqlite3`)                 │
│   • HP Smart Tank 670 All-in-One (USB 2.0 / IPP Socket)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Capabilities & Technical Innovations

### 2.1 Academic Pixel & Pigment Color Classification Standard
- **ITU-R BT.601 Cylindrical Chromaticity**: Converts raster pixel buffers to ITU-R BT.601 $Y, C_b, C_r$ space. Achromatic distance $\text{ChromaDist}^2 = (C_b - 128)^2 + (C_r - 128)^2$ is evaluated strictly on non-paper printed ink pixels ($Y < 246$) with cylindrical threshold $T = 10$ ($\text{ChromaDist}^2 > 100$).
- **Grayscale-in-RGB Immunity**: Detects black-and-white photos or documents encoded inside 3-channel RGB containers by validating channel spread $|R-G| \le 10 \land |G-B| \le 10$ across $\ge 98\%$ of pixels, preventing false-color overcharging.
- **Calibrated Multi-Tier Pricing**:
  - **Tier 0 (Monochrome B&W)**: $\rho_{chroma} < 1.5\% \implies$ **₱3.00**
  - **Tier 1 (Spot / Logo Accent)**: $1.5\% \le \rho_{chroma} < 12\% \implies$ **₱8.00**
  - **Tier 2 (Medium Color / Slides)**: $12\% \le \rho_{chroma} < 50\% \implies$ **₱15.00**
  - **Tier 3 (Heavy / Full Photo Color)**: $\rho_{chroma} \ge 50\% \implies$ **₱20.00**

### 2.2 Multi-File Batch Collation & Dynamic Orientation
- Ingests multi-image and multi-document uploads into a single collated multi-page print job order with unified per-page pricing and 1-click batch hardware spooling.
- Scales full-page photo prints dynamically without artificial 1.0 downscaling caps across paper sizes (4R, 5R, A4, Letter, Long, Legal) and Portrait $\leftrightarrow$ Landscape orientations with auto-orientation detection.

### 2.3 High-Precision Slot-Aware Sharp Image Transformations
- Precision cropping, zoom scale ($S$), pan offsets ($O_x, O_y$), 90° rotations, and mirror flips executed with Sharp matching physical slot geometry ($W_{mm} \times H_{mm}$) prior to vector PDF embedding.
- Exact PostScript millimeter-to-point math ($\text{pt} = \text{mm} \times 72 / 25.4$) with $0.985$ borderless 4R bleed overspray compensation.

### 2.4 Stateful Graph Engineering Pipeline
- Execution organized into discrete, testable `GraphNode` modules operating on typed `SharedPrintJobState`:
  1. `FileValidationNode` — Integrity, zero-byte, and extension checks.
  2. `DocumentConversionNode` — LibreOffice headless sandbox and image normalization.
  3. `OrderFreezeGateNode` — Freezes reactive pricing and locks order amount.
  4. `PdfCompositorNode` — 300 DPI vector PDF compilation with crop transforms.
  5. `PreflightVerifierNode` — Quality verification gate and bounds inspection.
  6. `CupsDispatchNode` — Direct CUPS `lp` invocation / Windows spooler dispatch.
  7. `GatedPurgeNode` — Ephemeral file cleanup respecting the 1-hour privacy grace period.

### 2.5 Mother-Centric Ergonomics & Accessibility
- **Zero Jargon**: Plain language status banners (🟢 *Printer Ready*, 🟢 *Crisp & Clear*, 🔴 *Paper Jam or Disconnected Cable*).
- **Giant Touch Targets (56px+)**: Effortless tapping on touchscreens, tablets, and phones over local Wi-Fi.
- **48pt Bold High-Contrast POS Display**: Real-time change calculation with instant quick-tender buttons.
- **Visual Photo Layout Cards**: Instant recognition of Rush ID presets (`Set 1`, `Set 2`, `Set 3`, `Set 4`, `Polaroid`).

---

## 3. Directory Layout

```
home-print/
├── .agents/                      # Agent workflow definitions and custom skills
│   └── skills/                   # Engineering directives (graph, cups, qa, local-first, ux)
├── .github/                      # CI/CD workflows (GitHub Actions)
│   └── workflows/ci.yml          # Automated typecheck, Vitest test suite, and Vite build
├── docs/                         # Comprehensive architectural and operational documentation
│   ├── 01_phases_and_timeline.md
│   ├── 02_features_specification.md
│   ├── 03_technical_architecture_by_feature.md
│   ├── 04_design_system_and_ux_for_mother.md
│   ├── 05_testing_and_qa_plan.md
│   ├── 06_implementation_review.md
│   ├── 07_gaps_and_risks.md
│   └── 08_steps_thereafter_roadmap.md
├── backend/                      # Fastify + TypeScript Backend
│   ├── src/
│   │   ├── config/               # Pricing tier and threshold configs
│   │   ├── db/                   # SQLite schema and WAL database connection
│   │   ├── nodes/                # Stateful graph pipeline nodes and runner
│   │   ├── routes/               # Operator and public API routes
│   │   ├── services/             # Core engines (PDF, CUPS, Costing, Auto-Purge)
│   │   └── server.ts             # Application entry point & session security
│   └── tests/                    # 17 Vitest test suites (65 tests)
├── frontend/                     # Vue 3 + Vite + Tailwind CSS Frontend
│   ├── e2e/                      # Playwright E2E mobile-responsiveness specs
│   ├── src/
│   │   ├── components/           # UI components (Sidebar, QR Drop, PIN Lock, POS)
│   │   ├── config/               # Client-side configuration constants
│   │   ├── stores/               # Pinia reactive stores (jobStore, layoutStore)
│   │   ├── utils/                # Date and coordinate formatting helpers
│   │   ├── views/                # Views (Dashboard, DocumentPrint, LayoutStudio, Costing, Analytics, Settings)
│   │   └── App.vue               # Main shell
│   └── vite.config.ts            # Vite build configuration
├── scripts/                      # Deployment and maintenance scripts
│   ├── setup-linux-cups.sh       # 1-click Linux/Raspberry Pi deployment script
│   └── backup-db.sh              # Automated SQLite backup script
├── AGENTS.md                     # Engineering directives and constraints
├── GEMINI.md                     # Operating instructions for AI pair programmers
└── README.md                     # Root system documentation
```

---

## 4. Getting Started & Local Development

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **CUPS & Poppler Utilities** (Linux / macOS / Raspberry Pi) or Windows Print Spooler (Windows fallback)
- **LibreOffice** (for document conversion)

### 1. Clone the Repository
```bash
git clone https://github.com/danle/home-print.git
cd home-print
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```
The backend will launch at `http://localhost:5000` with SQLite Write-Ahead Logging active.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend development server will launch at `http://localhost:5173`.

---

## 5. Automated Verification & Testing

HomePrint OS includes exhaustive test suites across both unit mathematics, graph pipeline execution, and E2E responsiveness.

### Run Backend Vitest Test Suite (17 Suites / 65 Tests)
```bash
npm --prefix backend test
```

### Run Backend TypeScript Typecheck
```bash
npm --prefix backend run build
```

### Run Frontend Production Build
```bash
npm --prefix frontend run build
```

---

## 6. Target Deployment Environments

1. **Raspberry Pi 4 Model B (Primary Headless Host)**:
   - Raspberry Pi OS 64-bit Lite, 8GB RAM.
   - Headless local server hosting web interface accessible across Wi-Fi / Ethernet LAN.
2. **Asus Laptop (Standalone Station)**:
   - Intel 64-bit, 4GB RAM DDR3L, Linux Mint 21.3 XFCE or Windows fallback.
3. **Target Printer**:
   - HP Smart Tank 670 All-in-One (USB 2.0 / Local Wi-Fi IPP, Duplex, Borderless 4R Photo).

---

## 7. License & Attribution

Internal proprietary operating system developed for local-first print shop operations.
