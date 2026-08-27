# 02. Features & Functional Specifications

> **Project**: HomePrint OS  
> **Target Environment**: Local Print Shop Web OS (Asus 4GB RAM + HP Smart Tank 670)  
> **Target Audience**: Neighborhood Customers (Students, Job Applicants, Residents) & Operator (Mother)  

---

## 1. Feature Architecture Overview

HomePrint OS achieves complete parity with commercial SaaS systems (such as PrintBoss) while adding local hardware direct-printing, zero-subscription cost, offline resilience, and non-technical operator safeguards.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               HOMEPRINT OS FEATURE MATRIX                              │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Operational Modules      │ Layout & Composition Engine │ Financial & POS Engine        │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ • Operator Dashboard     │ • 4R Rush ID Layout Studio  │ • Advanced Product Costing    │
│ • Live Job Queue Orders  │ • Passport Preset Engine    │ • 5-Tier Margin Matrix        │
│ • Customer QR Drop Portal│ • Polaroid Mini Layout      │ • Target Margin Price Slider  │
│ • Sandboxed USB Ingestion│ • Scissor Cut Lines & Zero-Gap│ • Bulk Discount Calculator  │
│ • Document Conversion CLI│ • Sublimation Mirror Flip   │ • Cash POS & Change Drawer    │
│ • CUPS Bi-Directional Poll│ • Vector 300 DPI PDF Engine │ • Daily Financial Analytics   │
│ • Gated 1-Hour Purge     │ • DPI Quality Traffic Light │ • Product Catalogue Admin     │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 2. Core Operational Modules

### 2.1 Operator Dashboard (`/`)
* **Role**: Primary command center for the mother, presenting a clean, high-contrast, at-a-glance summary.
* **Key Components**:
  1. **Printer Health Banner**:
     - **Printer Ready**: Large green banner showing ink levels (Black, Cyan, Magenta, Yellow) and paper status.
     - **Add Paper / Ink Low**: Warning banner with audio chime when paper tray is empty or ink is below 15%.
     - **Printer Offline**: Red alert indicating disconnected USB cable or power off.
  2. **Fast Action Tiles** (Large $200\times 180\text{px}$ touch targets):
     - `[ New Rush ID ]` $\to$ Opens Layout Studio.
     - `[ Print Document ]` $\to$ Opens Document Ingestion & Page Range Selector.
     - `[ Customer Inbox (Live Count) ]` $\to$ Shows pending QR uploads.
     - `[ Cash Register ]` $\to$ Opens POS change drawer.
  3. **Live Job Queue**:
     - Real-time list of active jobs with color-coded status badges: `[Ingested]`, `[In Studio]`, `[Spooling]`, `[Printing]`, `[Completed]`, `[Paid]`.
  4. **Daily Sales Tally**:
     - Today's Gross Revenue (₱), Estimated Net Profit (₱), and Jobs Completed count.

---

### 2.2 Customer QR Drop Portal (`/drop`)
* **Role**: Eliminates the need for customers to hand over infected USB flash drives or struggle with Bluetooth pairing.
* **Customer Workflow**:
  1. Customer scans a printed QR code on the shop counter with their smartphone.
  2. Mobile web page opens in their phone browser (`http://192.168.x.x:5000/drop`).
  3. Customer inputs their name (e.g. "Maria") and selects service ("Rush ID" or "Document Print").
  4. Customer drags or selects photos/PDFs and taps **"Send to Print Shop"**.
  5. Upload completes with a success screen: *"Files sent! Please tell the operator your name."*
* **Operator Notification**:
  - The mother's screen plays a cheerful sound (`chime.mp3`) and shows a floating notification: *"New photo received from Maria"*.
  - 1-tap **"Load into Studio"** loads Maria's photo onto the canvas instantly.

---

### 2.3 Sandboxed USB Hot Folder Ingestion
* **Role**: Safely accepts USB flash drives from customers who do not have smartphones.
* **Security & Isolation**:
  - Linux `udev` rule auto-mounts connected USB drives with strict flags: `noexec,nosuid,nodev,ro`.
  - The HomePrint UI displays an isolated web file picker showing only whitelisted extensions (`.pdf`, `.docx`, `.doc`, `.pptx`, `.jpg`, `.png`).
  - System binaries, scripts (`.exe`, `.bat`, `.vbs`, `.sh`), and hidden autorun files are completely filtered out and never executed natively.

---

### 2.4 Document Conversion & Analysis Engine (DOCX, PPTX, PDF)
* **Role**: Processes student homework, thesis papers, resumes, and government forms.
* **Capabilities**:
  - **Headless LibreOffice Sandbox**: Automatically converts `.docx`, `.pptx`, `.doc`, `.xls` to standardized PDFs within an ephemeral sandbox (capped at 256MB RAM and 15s timeout).
  - **Page Inspection**: Extracts total page count and detects paper size (A4, Letter, Legal).
  - **Color vs. Monochrome Channel Detection**: Scans pages to identify pure black & white pages (Tier 0 Monochrome @ ₱3.00, Tier 1 Spot Accent @ ₱8.00) vs rich color pages (Tier 2 Graphics @ ₱15.00, Tier 3 Full Photo @ ₱20.00).
  - **Page Range Selector**: Operator can specify custom page ranges (e.g. `1-5`, `even`, `odd`, `1,3,7`).
  - **Duplex Toggle**: 1-click double-sided printing toggle passed to CUPS (`-o sides=two-sided-long-edge`).

---

## 3. Layout Studio (Photo & ID Customization)

The **Layout Studio** is the most visually rich tool in HomePrint OS, replicating and exceeding PrintBoss's capabilities with a 60fps HTML5/Konva canvas.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  HomePrint Layout Studio — RUSH ID MODE                          [Export PDF] [PRINT]  │
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ ┌───────────────┐ │  ┌───────────────────────────────────────────────────────────────┐  │
│ │   [UPLOAD]    │ │  │                                                               │  │
│ │ Drag & Drop   │ │  │   ┌───────────────┐  ┌───────────────┐                        │  │
│ │ Customer Pic  │ │  │   │  2x2 in       │  │  2x2 in       │                        │  │
│ └───────────────┘ │  │   │  (Photo 1)    │  │  (Photo 2)    │                        │  │
│                   │  │   └───────────────┘  └───────────────┘                        │  │
│ STANDARD PRESETS  │  │   ┌───────────────┐  ┌───────────────┐                        │  │
│ ┌─────┐   ┌─────┐ │  │   │  2x2 in       │  │  2x2 in       │                        │  │
│ │SET 1│   │SET 2│ │  │   │  (Photo 3)    │  │  (Photo 4)    │                        │  │
│ └─────┘   └─────┘ │  │   └───────────────┘  └───────────────┘                        │  │
│ ┌─────┐   ┌─────┐ │  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐                                 │  │
│ │SET 3│   │SET 4│ │  │   │1x1 │ │1x1 │ │1x1 │ │1x1 │ (1x1 ID Photos)                │  │
│ └─────┘   └─────┘ │  │   └────┘ └────┘ └────┘ └────┘                                 │  │
│                   │  │   ┌────┐ ┌────┐ ┌────┐ ┌────┐                                 │  │
│ PAPER: 4R (4x6")  │  │   │1x1 │ │1x1 │ │1x1 │ │1x1 │                                 │  │
│                   │  │   └────┘ └────┘ └────┘ └────┘                                 │  │
│ [x] Scissor Lines │  │   ----------------------------------------------------------  │  │
│ [x] Zero Gap      │  │                                                               │  │
│ [ ] Mirror Flip   │  │   [ 4R Photo Paper Canvas — 100% Real-Time Preview ]          │  │
│                   │  └───────────────────────────────────────────────────────────────┘  │
│ [Auto-Arrange]    │   [🔍 Zoom - + ]  [↺ Reset]  [⤢ Fit Screen]                         │
└───────────────────┴────────────────────────────────────────────────────────────────────┘
```

### 3.1 Standard Preset Library (4R Photo Paper: $101.6 \times 152.4\text{ mm}$)
1. **Set 1 (Standard Rush ID Package)**:
   - Contains $4\times (2\times 2\text{ in})$ and $8\times (1\times 1\text{ in})$ ID photos.
   - Ideal for general school and government employment submissions.
2. **Set 2 (PRC / Visa Package)**:
   - Contains $6\times (2\times 2\text{ in})$ ID photos with white backgrounds.
3. **Set 3 (Combo Package)**:
   - Contains $6\times (1.5\times 1.5\text{ in})$ and $4\times (1\times 1\text{ in})$ photos.
4. **Set 4 (International / Philippine Passport Specification)**:
   - Contains $6\times (35\times 45\text{ mm})$ photos with official passport proportions.
5. **Polaroid Mini Mode**:
   - Arranges multiple $2\times 3\text{ in}$ Polaroid-style cards with white frames and optional bottom text caption/date stamp.
6. **Free Layout Mode**:
   - Allows operator to place multiple different customer photos freely on 4R or A4 canvas with snap-to-grid alignment.

### 3.2 Visual Studio Controls
* **Face Zoom & Pan**: Operator drags the photo inside any box to center the face; all duplicate boxes update instantly.
* **Scissor Cut Lines Toggle**: Renders thin $0.5\text{pt}$ dashed grey cutting guidelines around each photo.
* **Zero-Gap Mode Toggle**: Collapses all spacing between photos so the operator can slice them with a guillotine paper cutter in single continuous cuts.
* **Sublimation Mirror Flip**: 1-click horizontal reflection for heat transfer printing (mugs, t-shirts, caps).
* **DPI Quality Traffic Light**:
  - **Crisp** ($\ge 250\text{ DPI}$): Ready for official IDs.
  - **WhatsApp Compressed** ($150–250\text{ DPI}$): Soft warning.
  - **Too Blurry** ($<150\text{ DPI}$): Prompt asking for original photo.

---

## 4. Advanced Costing & Margin Matrix Engine

Replicating and extending PrintBoss's Advanced Costing module to ensure complete financial control:

```
+----------------------------------------------------------------------------------------+
| PRODUCT COSTING & PROFIT ENGINE                                Product: 4R Rush ID Set |
+-------------------------+--------------------------+-----------------------------------+
| MATERIAL COST           | OPERATION COST           | LABOR COST                        |
| • Glossy Paper 230g: ₱2.50| • Electricity:     ₱1.00 | • Rate/Hour: ₱90.00               |
| • Ink Cost (est):   ₱3.50| • Maintenance:     ₱2.00 | • Time:      5 Minutes            |
| • Plastic Sleeve:   ₱1.00| • Tools/Deprec:    ₱1.00 |                                   |
| Total Material:    ₱7.00| Total Operation:   ₱4.00 | Labor Total: ₱7.50                |
+-------------------------+--------------------------+-----------------------------------+
| BASE COST SUMMARY: Material (₱7.00) + Operation (₱4.00) + Labor (₱7.50) = ₱18.50       |
+----------------------------------------------------------------------------------------+
| MARGIN MATRIX                                                                          |
|  Base Cost     Margin (%)     Profit (₱)     Selling Price                             |
|  ₱18.50         25%            +₱4.63         ₱23.13                                   |
|  ₱18.50         50%            +₱9.25         ₱27.75                                   |
|  ₱18.50         75%            +₱13.88        ₱32.38                                   |
|  ₱18.50         100%           +₱18.50        ₱37.00                                   |
|  ₱18.50         150%           +₱27.75        ₱46.25                                   |
+----------------------------------------------------------------------------------------+
| TARGET SELLING PRICE: [=== Slider: 120% ===] -> Recommended Price: ₱40.00              |
| BULK DISCOUNT: Qty: [ 5 ]  Discount: [ ₱10.00 ] -> Final Total: ₱190.00                |
+----------------------------------------------------------------------------------------+
```

### 4.1 Costing Mathematical Formulas
$$\text{Material Cost} = \sum (\text{Qty}_i \times \text{Unit Price}_i)$$
$$\text{Operation Cost} = \text{Electricity} + \text{Ink Consumption} + \text{Maintenance Reserve}$$
$$\text{Labor Cost} = \frac{\text{Hourly Rate}}{60} \times \text{Labor Minutes}$$
$$\text{Base Cost} = \text{Material Cost} + \text{Operation Cost} + \text{Labor Cost}$$
$$\text{Selling Price}(\text{Margin \%}) = \text{Base Cost} \times \left(1 + \frac{\text{Margin \%}}{100}\right)$$
$$\text{Bulk Total} = (\text{Target Selling Price} \times \text{Quantity}) - \text{Discount}$$

---

## 5. Cash POS & Daily Revenue Analytics

### 5.1 Foolproof Cash POS Drawer
* **Big Bill Display**: Total due shown in 32pt bold font (e.g. `₱40.00`).
* **Quick Tender Buttons**: Large touch targets for standard Philippine bank notes: `[₱50]`, `[₱100]`, `[₱500]`, `[₱1000]`, `[Exact]`.
* **Giant Change Display**: Computes cash change instantly and displays it in **48pt high-contrast bold green font** (e.g. **Change: ₱60.00**), preventing mental math errors during busy counter rushes.
* **Payment Methods**: Toggle between `Cash` and `GCash` (stores reference number).

### 5.2 Daily Analytics & Consumable Tracking
* Daily Total Gross Revenue (₱).
* Estimated Daily Net Profit (Gross $-$ Base Costs).
* Consumable Tally: 4R photo sheets consumed, A4 plain sheets consumed, ink milliliter estimations.

---

## 6. Hardware Spooling, Status Feedback & Gated Purge

### 6.1 Direct CUPS/HPLIP Spooling
* Bypasses the HP Smart App entirely.
* Spools generated 300 DPI vector PDFs directly to the HP Smart Tank 670 via CUPS CLI (`lp`) or IPP.
* Uses dynamic PPD options discovered at startup (`MediaType=PhotographicGlossy`, `print-quality=5`, `media=Custom.4x6in.Borderless`).

### 6.2 Real-Time CUPS Queue Telemetry
* Dedicated monitor loop queries CUPS every 2 seconds.
* Relays live events via WebSockets to the UI:
  - `JOB_QUEUED` $\to$ `JOB_PRINTING (Page X of Y)` $\to$ `JOB_COMPLETED` (plays chime).
  - On paper jam or out-of-paper: Flashes an attention banner with audio tone: *"Please add 4R photo paper."*

### 6.3 Gated 1-Hour Purge & 1-Click Reprint Resilience
* Raw customer files and generated PDFs are cached in `/var/homeprint/cache/` for a **1-hour grace period** after CUPS completion.
* If a customer drops their photo or requests another copy, the mother taps **"1-Click Reprint"** $\to$ immediately prints without re-uploading or re-editing.
* Files are automatically purged after 1 hour to protect customer privacy and prevent disk bloat.
