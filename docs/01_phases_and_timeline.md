# 01. Phases & Implementation Timeline

> **Project**: HomePrint OS  
> **Target Environment**: Asus Laptop (4GB RAM DDR3L, Linux Mint 21.3 XFCE) + HP Smart Tank 670  
> **Target Operator**: Mother (Non-technical, operator-led print shop)  

---

## 1. Overview & Timeline Philosophy

HomePrint OS is structured into a **5-Phase, 15-Day Implementation Roadmap**. Each phase delivers an end-to-end verifiable increment, ensuring hardware compatibility, memory safety on 4GB RAM, and zero-friction usability for the mother before moving to the next layer.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 15-DAY MASTER TIMELINE                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Days 1–3   │ Phase 1: Foundation, PIN Security & CUPS Dynamic Driver Engine            │
│ Days 4–7   │ Phase 2: Document Converter Sandbox & 300 DPI Layout Studio               │
│ Days 8–10  │ Phase 3: Reactive Costing Matrix, Product Catalogue & Cash POS           │
│ Days 11–13 │ Phase 4: Multi-Channel Ingestion (QR Drop & Sandboxed USB Hot Folder)     │
│ Days 14–15 │ Phase 5: Hardware Tuning, 4R Margin Calibration & Mother Usability Trials │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Milestone Breakdown

### Phase 1: Foundation, PIN Security & CUPS Driver Layer (Days 1–3)

* **Objective**: Establish the core runtime, local database, route security, and dynamic printer communication.
* **Prerequisites**: Asus laptop with Linux Mint 21 XFCE, HP Smart Tank 670 connected via USB.

#### Day 1: Runtime Setup & SQLite Database Engine
- Install Node.js LTS (v20+), CUPS, HPLIP, and build utilities using `scripts/setup-linux-cups.sh`.
- Initialize Fastify backend with `@fastify/cors`, `@fastify/multipart`, and `@fastify/websocket`.
- Execute SQLite schema initialization (`backend/src/db/schema.sql`) with `PRAGMA journal_mode = WAL` and `PRAGMA synchronous = NORMAL`.
- Verify database read/write throughput and power-failure resilience.

#### Day 2: Route-Level Authentication & LAN Isolation
- Implement 4-Digit Operator PIN authentication service (`operator-auth.routes.ts`).
- Configure Fastify route decorators to enforce PIN sessions on `/`, `/studio`, `/costing`, `/api/operator/*`.
- Establish unauthenticated, rate-limited public scope for `/drop` and `/api/public/upload`.
- Implement persistent cookie sessions for the mother's tablet with auto-lock on 15 minutes of inactivity.

#### Day 3: Dynamic CUPS PPD Discovery & Bi-Directional Health Polling
- Implement `ppd-discovery.service.ts` to introspect `/etc/cups/ppd/HP_Smart_Tank_670.ppd`.
- Dynamically parse and map exact driver attributes for:
  - Monochrome vs Color (`ColorModel` / `OutputMode` / `print-color-mode`).
  - Glossy vs Plain Paper (`MediaType=PhotographicGlossy` vs `MediaType=Plain`).
  - Borderless 4R dimensions (`Custom.4x6in.Borderless`).
- Implement `cups-driver.service.ts` and verify real-time status polling via `lpstat -p` and IPP.

---

### Phase 2: Document Conversion Sandbox & 300 DPI Layout Studio (Days 4–7)

* **Objective**: Build the visual editing canvas for ID photos and the automated conversion pipeline for student documents (DOCX/PPTX/PDF).

#### Day 4: Headless LibreOffice Conversion Sandbox
- Implement `document-converter.service.ts` invoking `soffice --headless --convert-to pdf`.
- Wrap execution in `systemd-run --scope -p MemoryMax=256M -p CPUQuota=60%` with an unprivileged system user.
- Implement page-count and page-size analyzer using `pdf-lib` and `pdftoppm`.
- Verify conversion of typical student files: 20-page DOCX thesis, 30-slide PPTX lecture notes, scanned PDF forms.

#### Day 5: High-DPI Vector PDF Compositing Engine
- Implement `pdf-builder.service.ts` with strict physical millimeter coordinate math ($1\text{ in} = 25.4\text{ mm} = 72\text{ PostScript pt}$).
- Build vector bounding box renderers with dashed scissor cut lines ($0.5\text{pt}$ gray dash) and zero-gap toggle.
- Implement image streaming pipelines via `sharp` to resize and embed high-resolution photos without in-memory buffering.

#### Day 6: Frontend Canvas Layout Studio (Konva.js / Vue 3)
- Create `CanvasStudio.vue` with drag-and-drop photo positioning, pan, and zoom controls.
- Implement 4R photo presets:
  - **Set 1**: $4\times 2\times 2" + 8\times 1\times 1"$ (Standard Rush ID).
  - **Set 2**: $6\times 2\times 2"$ (Visa / PRC).
  - **Set 3**: $6\times 1.5\times 1.5" + 4\times 1\times 1"$ (Combo Package).
  - **Set 4**: $6\times 35\times 45\text{ mm}$ (Passport Specification).
  - **Polaroid Mini**: $2\times 3"$ with customizable text footer.
- Build the **DPI Traffic Light component** (🟢 Crisp $\ge 250\text{ DPI}$, 🟡 Soft $150–250\text{ DPI}$, 🔴 Blurry $<150\text{ DPI}$).

#### Day 7: Preflight Quality Gate & Layout Integration
- Connect frontend canvas crop coordinates to backend PDF builder.
- Implement `PreflightVerifierNode` to check page bounds, file size integrity, and color profiles.
- Run test export and verify millimeter accuracy of generated PDFs in vector viewers.

---

### Phase 3: Reactive Costing Engine, Product Catalogue & Cash POS (Days 8–10)

* **Objective**: Replicate and enhance PrintBoss's Advanced Costing module and create a foolproof cash register for the mother.

#### Day 8: Reactive Costing & Margin Matrix Engine
- Implement `costing-calculator.service.ts` computing:
  - Material Cost (Glossy paper ₱2.50, Plain A4 ₱0.50, Laminating sheet ₱3.00).
  - Operation Cost (Electricity ₱1.00, Ink ₱3.50 color / ₱0.50 B&W, Maintenance reserve ₱2.00).
  - Labor Cost: $(\text{Hourly Rate} / 60) \times \text{Labor Minutes}$.
  - Margin Matrix (25%, 50%, 75%, 100%, 150%) and dynamic target margin slider.
  - Bulk discount calculator.
- Integrate Pinia reactive state updates so price changes automatically when layout copies or paper types change.

#### Day 9: Product & Service Catalogue Management
- Build `ProductsView.vue` allowing the shop owner to configure standard product prices, material unit costs, and labor rates.
- Seed database with standard Philippine print shop defaults (4R Rush ID packages, A4 B&W document, A4 Color document, Polaroid mini, Lamination).

#### Day 10: Cash POS Drawer & Daily Analytics
- Build `CashCalculator.vue` featuring large quick-tender buttons (`₱50`, `₱100`, `₱500`, `₱1000`, `Exact`).
- Render giant, high-contrast change display (e.g. **Change: ₱60.00** in 48pt bold green).
- Implement daily sales tally logging gross revenue, estimated net profit, and product volume breakdown in SQLite.

---

### Phase 4: Multi-Channel Ingestion & Counter QR Drop (Days 11–13)

* **Objective**: Eliminate USB malware risks and Bluetooth pairing friction through an instant local Wi-Fi upload portal.

#### Day 11: Counter QR Drop Mobile Web App
- Build customer-facing upload portal at `/drop` optimized for mobile screens.
- Form fields: Customer Name, Service Selection (Rush ID vs Document), File Drag & Drop / Photo Picker.
- Generate dynamic shop Wi-Fi Counter QR Code graphic for physical counter display.

#### Day 12: Real-Time Ingestion & WebSocket Notification
- Implement WebSocket broadcast: when a customer uploads a file at `/drop`, the mother's screen instantly rings a pleasant chime (`chime.mp3`) and flashes a new job card in the Inbox.
- Add 1-tap "Load into Studio" action that auto-populates the customer's photo onto the canvas.

#### Day 13: Sandboxed USB Hot Folder & Ingestion Fallback
- Configure Linux udev rules to mount USB flash drives `noexec,nosuid,nodev,ro`.
- Build sandboxed web file picker displaying only verified document/photo extensions (`.pdf`, `.docx`, `.doc`, `.pptx`, `.jpg`, `.png`).
- Implement automatic customer file privacy purge scheduler (1-hour grace period after CUPS completion).

---

### Phase 5: Hardware Tuning, Calibration & Mother Usability Trials (Days 14–15)

* **Objective**: Calibrate physical printer margins on the HP Smart Tank 670 and optimize the user interface based on real operator feedback.

#### Day 14: Hardware Margin & Color Calibration
- Run the 1-Click Driver Calibration Test on the HP Smart Tank 670.
- Print 4R glossy photo sheets and measure 2x2 and 1x1 photos with a digital caliper to verify $<0.2\text{mm}$ error.
- Verify that B&W document printing uses 100% black pigment ink without consuming cyan/magenta/yellow dye ink.
- Calibrate borderless bleed margins for 4R ($4\times 6\text{ in}$) photo paper.

#### Day 15: Mother-Operator Usability Trials & System Hardening
- Conduct timed operational tests with the mother:
  - Scenario A: Customer drops photo via QR code $\to$ Print 4R Rush ID (Set 1) $\to$ Calculate ₱100 cash change.
  - Scenario B: Student prints 15-page DOCX thesis (Pages 1–5 in color, rest B&W).
  - Scenario C: Simulated paper jam $\to$ Clear jam $\to$ Tap 1-Click Reprint.
- Eliminate any confusing buttons, increase font sizes where necessary, and verify audio cues.
- Configure systemd auto-start service and standard non-intrusive desktop launcher.

---

## 3. Dependency & Risk Buffer Matrix

| Milestone | Critical Dependency | Potential Blocker | Buffer Strategy |
| :--- | :--- | :--- | :--- |
| **PPD Discovery** | HPLIP driver package installed | Driver names differ from standard HP PPDs | Built-in fallback to standard IPP Everywhere PPD + manual option overrides in Settings. |
| **Doc Conversion** | Headless LibreOffice | High memory usage on complex 50MB files | Sandboxed execution with `systemd-run MemoryMax=256M` and 15s hard timeout. |
| **Hardware Display** | External HDMI output | Asus laptop broken internal screen | Linux Mint XFCE `xfce4-display-settings` script auto-disables LVDS-1 on boot. |
| **LAN Drop Portal** | Shop Wi-Fi router | Router isolation blocking client-to-client LAN traffic | Provide optional hostapd Wi-Fi hotspot directly from laptop Wi-Fi card. |
