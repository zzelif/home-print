# HomePrint OS — Engineering & Development Directives

You are operating on the **HomePrint OS** codebase — a local-first, zero-cloud print shop operating system designed for non-technical counter operators (specifically the shop owner's mother) running on lightweight edge hardware:
1. **Raspberry Pi 4 Model B (Primary Headless Host)**: Raspberry Pi OS 64-bit Lite, 8GB RAM (~5GB free memory), headless server hosting the web application accessible over local Wi-Fi / LAN across mobile phones, tablets, and counter laptops.
2. **Legacy Asus Laptop (Standalone Option)**: Intel 64-bit, 4GB RAM, Linux Mint XFCE or Windows fallback with external display.
3. **Target Printer**: HP Smart Tank 670 All-in-One (USB 2.0 / Local Wi-Fi IPP, Duplex, Borderless 4R Photo).

---

## 1. Non-Negotiable Development Directives

### 1.1 Iterative Loop Enforcement & Anti-Stubbing Invariant
* **Never terminate a task on first-pass file scaffolding**: Creating a file or stub is NOT completing a feature. Every feature MUST follow the full cycle:
  $$\text{Scaffold} \longrightarrow \text{Wiring/Integration} \longrightarrow \text{Adversarial Testing} \longrightarrow \text{Verification} \longrightarrow \text{State Preservation}$$
* **No Actionable UI Stubs**: No placeholder `alert()` calls or mocked buttons for key actions (e.g. Export PDF, Print Now, Change Calculation, Presets). Every action must execute real backend APIs or frontend state mutations.
* **Verify Integration Paths**: When a service, node, or utility is created, verify that it is actively imported, called, and tested along real user execution paths (e.g. API routes, WebSocket broadcasts, UI stores). Orphaned code is considered an incomplete task.
* **Truth in Completion**: Never claim 100% completion in documentation or reviews if code is stubbed, disconnected, unhandled, or untested. Document remaining gaps explicitly.

---

## 2. Graph Engineering & Node Pipeline Standard

All document ingestion, layout processing, costing lock, preflight verification, vector PDF generation, CUPS hardware dispatch, and auto-purge operations MUST be executed via the **Stateful Graph Pipeline** (`backend/src/nodes/`).

### Mandatory Graph Node Principles:
1. **Strongly-Typed Shared State**: Nodes must strictly read and mutate `SharedPrintJobState`.
2. **Explicit Decision Edges & Gates**: Transition between nodes must be deterministic and gated by validation passes (e.g., `PreflightVerifierNode` must gate `CupsDispatchNode`).
3. **Fault Tolerance & Node Compensation**: If a node fails (e.g., PDF generation corruption), the graph must rollback state, clean up intermediate files, emit a structured WebSocket failure event, and never leave hardware in an unmanaged state.
4. **Telemetry & Real-Time Broadcast**: State transitions across nodes must emit WebSocket updates to ensure the operator screen reflects live status.
5. **No Direct Route Bypass**: Route controllers (`operator-print.routes.ts`, `public-drop.routes.ts`, etc.) must invoke the Graph Runner rather than bypassing nodes with direct service calls.
6. **Frontend-Backend Preset Parity**: All presets defined in `PdfBuilderService` (`SET_1`, `SET_2`, `SET_3`, `SET_4`, `POLAROID`) must have exact 1:1 visual coordinate grids in `LayoutStudioView.vue`.

---

## 3. Mother-Centric UX & Ergonomic Guardrails (Multi-Device Responsive)

The primary operator of this system is non-technical, accessing the web OS from a mobile phone, tablet, or laptop trackpad/touchscreen over LAN:

1. **Zero Technical Jargon**: NEVER display technical terms like `"DPI"`, `"PPD"`, `"CUPS"`, `"PostScript"`, `"Spooler"`, `"Baud Rate"`, or `"MIME Type"` on operator views. Use descriptive plain language:
   - Instead of *"300 DPI High Resolution"*, show: *"Crisp & Clear"*
   - Instead of *"PPD Option Parsed"*, show: *"Printer Ready"*
   - Instead of *"CUPS Spool Error"*, show: *"Paper Jam or Disconnected Cable"*
2. **Giant Touch Targets (56px+)**: All actionable buttons must be at least **56px high** with clear high-contrast coloring for effortless tapping on phones and tablets.
3. **High-Contrast Currency Display**:
   - Total due must be in 32pt+ bold font.
   - Customer change due must be in **48pt bold high-contrast green font** (e.g., **Change: ₱60.00**).
4. **Preset Recognition over Recall**: Show visual miniature graphic cards representing photo layouts rather than mathematical text descriptions.
5. **Multi-Sensory Feedback & Status**: Essential events (new customer drop, print spooling, print complete, paper jam) must trigger clear visual state banners and toasts.

---

## 4. Hardware & Resource Constraints (Raspberry Pi 4 & 4GB/8GB RAM)

1. **Memory Budget**: Fastify server + Node process must remain $< 150\text{MB}$ idle, $< 400\text{MB}$ peak.
2. **Headless Local-First Hosting**: The application must run completely offline without cloud dependencies, serving both the public `/drop` portal and operator interfaces over local Wi-Fi / Ethernet.
3. **LibreOffice Sandboxing**: Document conversion must be executed ephemerally with strict CPU and memory limits, with automated cleanup of temporary converted files.
4. **Vector PDF Math**: All layout dimensions and bounding boxes must maintain exact physical millimeter math:
   $$\text{Points (pt)} = \text{Dimension (mm)} \times \frac{72}{25.4}$$
5. **SQLite WAL Mode**: Maintain `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL` for crash resilience against sudden power loss.
6. **Gated Privacy Purge**: Customer uploads and generated print files must be purged after the 1-hour reprint grace period.

---

## 5. UI Routing & High-Precision Image Transformation Standards

1. **Component Route & Store Dependency Invariant**: Vue `<script setup>` components invoking routing navigation (`router.push`, `useRoute`) or Pinia state mutations (`jobStore.cancelJob`, `useJobStore`) must explicitly import and instantiate those composables within the local component setup context to prevent runtime `ReferenceError` during user actions.
2. **Precision Sharp Slot-Aware Image Transformations**: All image cropping, zooming, panning, rotation, and mirror flips must be transformed using Sharp with exact aspect-ratio bounds matching the target slot geometry ($W_{mm} \times H_{mm}$) prior to vector PDF embedding, ensuring zero image stretching, optimal 300+ DPI resolution, and instant client-side preview synchronization.

---

## 6. Document Conversion, Typography & SQL Standards

1. **WinAnsi & Typographic Ligature Sanitization Invariant**: All vector PDF rendering using standard Helvetica/Times fonts must pass raw text through `sanitizeWinAnsi` to decompose ligatures (`ﬃ`, `ﬀ`, `ﬁ`, `ﬂ`, `ﬄ`), curly quotes, em-dashes, and currency symbols (`₱`) before font metric calculations or text drawing, preventing `WinAnsi cannot encode` runtime crashes.
2. **Explicit SQL Table Qualification in Joins**: Every SQL query joining multiple tables (`job_orders`, `products`, `job_files`) must explicitly qualify filter columns (`job_orders.created_at`, `j.created_at`) to prevent ambiguous column runtime errors across dynamic date ranges.
3. **Office OpenXML Central Directory Standard**: Word and Office archives (`.docx`, `.pptx`) must be decompressed using ZIP Central Directory headers (`0x02014b50`) to guarantee reliable text extraction even when local header sizes are zeroed by streaming bit flags.

---

## 7. Academic Pixel & Pigment Color Classification Standard

1. **ITU-R BT.601 Cylindrical Chromaticity Math**: Document color classification must convert pixel buffers to ITU-R BT.601 $Y, C_b, C_r$ space. Achromatic distance $\text{ChromaDist}^2 = (C_b - 128)^2 + (C_r - 128)^2$ must be evaluated strictly on non-paper printed ink pixels ($Y < 246$) with cylindrical threshold $T = 10$ ($\text{ChromaDist}^2 > 100$).
2. **Grayscale-in-RGB Immunity**: Detect grayscale photos or black-and-white documents encoded inside 3-channel RGB containers by checking channel spread $|R-G| \le 10 \land |G-B| \le 10$ across $\ge 98\%$ of pixels, preventing false-color overcharging.
3. **Calibrated Multi-Tier Pricing Model (ISO/IEC 24712 Standards)**:
   - **Tier 0 (Monochrome B&W)**: $\rho_{chroma} < 1.0\% \implies$ **₱3.00**
   - **Tier 1 (Spot / Logo Accent)**: $1.0\% \le \rho_{chroma} < 8.5\% \implies$ **₱8.00**
   - **Tier 2 (Medium Color Graphics / Slides / Charts)**: $8.5\% \le \rho_{chroma} < 35.0\% \implies$ **₱15.00**
   - **Tier 3 (Heavy / Full Photo Color)**: $\rho_{chroma} \ge 35.0\% \implies$ **₱20.00**

---

## 8. Multi-File Batch Collation & Dimension Invariant

1. **Unified Multi-File Collation**: When multiple images or documents are uploaded simultaneously (e.g. 15 customer photos in a single order), the system must collate all files into a single multi-page job order with per-page analysis rather than fragmenting into individual job orders, providing unified previews and 1-click batch hardware spooling.
2. **Dynamic Paper & Orientation Scaling**: Full-page photo rendering must eliminate artificial downscaling caps, dynamically adapting coordinates to physical paper dimensions (4R, 5R, A4, Letter, Long, Legal) and Portrait $\leftrightarrow$ Landscape orientations with auto-orientation detection.

---

## 9. Core Project Scaffolding & Context Invariants

1. **Living Architectural State**: Always maintain synchronicity between `implementation_plan.md`, `walkthrough.md`, and system architecture documentation in `docs/`.
2. **Deterministic Graph Dispatch**: Critical business logic and asset transformations must be encapsulated into pure, testable `GraphNode` modules operating on typed shared state.
3. **5-Stage Verification Rigor**: Every major feature or refactor must pass compilation, unit mathematics, graph pipeline integration, adversarial edge case probing, and memory envelope validation before completion.

---

## 10. Hardware-Host Separation & Driverless Raster Directives

1. **Host-Managed Peripheral Daemons**: In edge containerized environments (Raspberry Pi 4), hardware-interfacing daemons (CUPS `cupsd`, HPLIP, SANE) must execute natively on the host OS. Containers must interface as lightweight clients via mounted read-write domain sockets (`/run/cups:/run/cups`) or IPP network endpoints.
2. **Zero-Raw Inkjet Spooling**: Consumer inkjet printers without onboard PostScript/PDF ASIC decoders (such as the HP Smart Tank 670) must NEVER receive raw PDF streams (`-m raw`). Spool queues must mandate IPP Everywhere driverless raster filtering (`-m everywhere`) or vendor raster pipelines (`hpcups`/`pdftoraster`).
3. **Multi-Tier Hardware Telemetry & Graceful Fallback**: Hardware status, ink tank sensors, and queue states must implement multi-tier fallback chains (HPLIP $\to$ IPP Everywhere $\to$ SNMP $\to$ Persistent SQLite Cache) to ensure zero UI freezing during intermittent network or power-save events.


