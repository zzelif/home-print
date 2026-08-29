# HomePrint OS — System Directives & Operating Instructions

## Core Principles

1. **Edge Hosting & Low Resource Envelope**:
   - Primary host target: **Raspberry Pi 4 Model B (Raspberry Pi OS 64-bit Lite, 8GB RAM)** or legacy Asus laptop (4GB RAM).
   - Server process idle memory budget $< 150\text{MB}$, peak $< 400\text{MB}$.
   - Headless local server hosting fully responsive web views over LAN for phones, tablets, and counter laptops.

2. **Iterative Development & Rigorous Verification**:
   - Never consider a feature complete upon writing boilerplate, stubs, or disconnected classes.
   - **Anti-Stubbing Invariant**: No placeholder `alert()` functions or mocked buttons for actionable user flows.
   - **Truth in Completion**: Every feature must be wired into routes, verified against integration flows, and tested against edge cases.

3. **Graph Engineering Standard**:
   - All print pipeline execution (Ingestion $\to$ Validation $\to$ Layout $\to$ Freeze $\to$ Compositing $\to$ Preflight $\to$ CUPS Dispatch $\to$ Purge) must be orchestrated through the stateful graph engine.
   - Do not bypass graph nodes in route controllers.

4. **Ergonomics & Design for Mother (Multi-Device Responsive)**:
   - Strict ban on technical jargon (`DPI`, `PPD`, `CUPS`, `PostScript`, `Spooler`).
   - 56px+ touch targets, 48pt green change counter, visual layout thumbnails, clean vector icons.

5. **UI Store Dependencies & Precision Image Transformations**:
   - Explicitly import `useRouter` and `useJobStore` in all actionable Vue views to avoid runtime crashes.
   - Execute slot-aware Sharp cropping, scaling, panning, and rotation with exact physical millimeter geometry prior to vector PDF embedding.

6. **Typography Sanitization & SQL Join Standards**:
   - Sanitize all text drawn onto PDFs with `sanitizeWinAnsi` to decompose ligatures (`ﬃ`, `ﬀ`, `ﬁ`, `ﬂ`), curly quotes, and currency symbols (`₱`) before PDF generation.
   - Always qualify table prefixes in SQL joins (`job_orders.created_at`, `j.created_at`) to prevent ambiguous column errors under dynamic filters.

7. **Academic Pixel & Pigment Color Classification Standard**:
   - Convert raster image and page buffers to ITU-R BT.601 $Y, C_b, C_r$ space.
   - Evaluate cylindrical chromaticity distance $\text{ChromaDist}^2 = (C_b - 128)^2 + (C_r - 128)^2 > 100$ strictly on non-paper printed ink pixels ($Y < 246$).
   - Check RGB channel spread ($|R-G| \le 10 \land |G-B| \le 10$ across $\ge 98\%$ pixels) to guarantee false-color immunity for grayscale-in-RGB photos.
   - Enforce graduated pricing tiers: Tier 0 (B&W $\rho < 1.0\%$) @ ₱3.00, Tier 1 (Spot $1.0\% \le \rho < 8.5\%$) @ ₱8.00, Tier 2 (Medium $8.5\% \le \rho < 35.0\%$) @ ₱15.00, Tier 3 (Heavy/Photo $\rho \ge 35.0\%$) @ ₱20.00.

8. **Multi-File Batch Collation & Dynamic Orientation Standards**:
   - Ingest multi-image and multi-document uploads into a single collated multi-page print job order with unified per-page pricing and 1-click batch hardware spooling.
   - Scale full-page photo prints dynamically without arbitrary 1.0 downscaling caps across paper sizes (4R, 5R, A4, Letter, Long, Legal) and Portrait $\leftrightarrow$ Landscape orientations.

9. **Core Project Scaffolding & Context Invariants**:
   - Maintain strict synchronicity between `implementation_plan.md`, `walkthrough.md`, and system architecture documentation in `docs/`.
   - Critical business logic and asset transformations must execute via state-gated `GraphNode` pipelines operating on strongly-typed shared state.
   - Enforce the 5-Stage Verification cycle: Compilation $\to$ Unit Math $\to$ Graph Integration $\to$ Adversarial Probing $\to$ Memory Profiling.

10. **Hardware-Host Separation & Driverless Raster Directives**:
    - Hardware-interfacing daemons (CUPS `cupsd`, HPLIP, SANE) must execute natively on the host OS; Docker containers interface as lightweight clients via mounted read-write sockets (`/run/cups:/run/cups`).
    - Consumer inkjet printers without onboard PostScript/PDF ASIC decoders (such as HP Smart Tank 670) must never receive raw PDF streams (`-m raw`). Always mandate IPP Everywhere driverless raster filtering (`-m everywhere`) or vendor raster pipelines.
    - Implement multi-tier fallback chains (HPLIP $\to$ IPP Everywhere $\to$ SNMP $\to$ Persistent SQLite Cache) for hardware telemetry and queue states.


