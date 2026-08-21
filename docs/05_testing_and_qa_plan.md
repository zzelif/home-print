# 05. Testing & Quality Assurance Plan

> **Project**: HomePrint OS  
> **Test Scope**: Automated Unit/Integration Tests, Hardware Calibration, Memory Safety on 4GB RAM, and Operator Usability Trials  

---

## 1. Quality Assurance Strategy & Test Pyramid

```
                ┌───────────────────────────────────┐
                │   Mother Usability Trials (Manual)│
                ├───────────────────────────────────┤
                │   Physical Hardware & Margin Tests│
                ├───────────────────────────────────┤
                │   Integration & API Tests (Vitest)│
                ├───────────────────────────────────┤
                │   Unit & Mathematical Tests (Math)│
                └───────────────────────────────────┘
```

---

## 2. Automated Unit Tests

### 2.1 Costing Engine & Margin Matrix Tests
* **Test Case 1: Base Cost Calculation**:
  - Input: Materials (₱7.00), Operation (₱4.00), Labor (₱90/hr $\times$ 5 min = ₱7.50).
  - Expected Base Cost: `₱18.50`.
* **Test Case 2: Margin Matrix Multipliers**:
  - Verify that 25% margin yields selling price `₱23.13` (profit `₱4.63`).
  - Verify that 50% margin yields selling price `₱27.75` (profit `₱9.25`).
  - Verify that 100% margin yields selling price `₱37.00` (profit `₱18.50`).
* **Test Case 3: Bulk Order Discounts**:
  - Input: Unit price ₱40.00, Qty 5, Discount ₱10.00.
  - Expected Final Total: `₱190.00`.

### 2.2 Coordinate Transformation & PDF Math Tests
* **Test Case 4: Millimeter to PostScript Point Conversion**:
  - $101.6\text{ mm}$ (4 inches) $\to$ `288.0 pt` ($\pm 0.01$).
  - $152.4\text{ mm}$ (6 inches) $\to$ `432.0 pt` ($\pm 0.01$).
* **Test Case 5: Screen-to-Physical Crop Origin Mapping**:
  - Verify that applying viewport offsets $\{scale: 1.5, offsetX: -50, offsetY: -30\}$ maps accurately to original image pixel coordinates without overflow or negative indexing.

---

## 3. Integration & System Pipeline Tests

### 3.1 Document Conversion Sandbox Tests
* **Test Case 6: DOCX to PDF Conversion**:
  - Feed a 15-page DOCX document containing tables and images into `DocumentConverterService`.
  - Verify output PDF exists in `/tmp/homeprint_converted/` and page count matches 15.
  - Verify conversion completes in $< 4.0\text{ seconds}$ with memory usage staying $< 180\text{MB}$.
* **Test Case 7: Timeout and Malformed File Handling**:
  - Feed a corrupted file renamed to `.docx`.
  - Verify process is cleanly aborted within 15 seconds without crashing the Fastify server.

### 3.2 Route Authentication & Security Tests
* **Test Case 8: Public Scope Isolation**:
  - Send unauthenticated `POST /api/public/upload` $\to$ Returns `200 OK` with uploaded file ID.
  - Send unauthenticated `GET /api/operator/jobs` $\to$ Returns `401 Unauthorized`.
  - Send valid 4-digit PIN $\to$ Receives session cookie $\to$ Subsequent request returns `200 OK`.

---

## 4. Hardware Verification & Print Calibration (HP Smart Tank 670)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          HARDWARE CALIBRATION PROTOCOL                      │
├────────────────────────────┬────────────────────────────────────────────────┤
│ 1. Physical Dimension Test │ Measure printed 4R photo sheet with a digital  │
│                            │ caliper. Pass criteria:                        │
│                            │ • 2x2" photo: 50.8mm (tolerance ±0.2mm)        │
│                            │ • 1x1" photo: 25.4mm (tolerance ±0.2mm)        │
│                            │ • Passport photo: 35x45mm (tolerance ±0.2mm)   │
├────────────────────────────┼────────────────────────────────────────────────┤
│ 2. Grayscale vs Color Ink  │ Print a 5-page B&W text document. Pass criteria│
│    Separation Test         │ • Visually confirm black pigment ink only.     │
│                            │ • No cyan/magenta/yellow dye ink consumed.     │
├────────────────────────────┼────────────────────────────────────────────────┤
│ 3. Borderless 4R Bleed Test│ Print full 4R borderless photo. Pass criteria: │
│                            │ • Zero white borders on all 4 edges.           │
│                            │ • Cut lines align accurately with paper edges. │
└────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 5. Performance & 4GB RAM Memory Profiling

Run `htop` and Node.js process monitors during high-load stress testing on the Asus laptop:

| Test Scenario | Max Allowed RAM | Observed RAM Target | Pass / Fail Criteria |
| :--- | :--- | :--- | :--- |
| **System Idle (Mint XFCE + Fastify)** | $< 500\text{MB}$ | ~420MB | Must not exceed 500MB |
| **10MP Photo Layout in Studio** | $< 700\text{MB}$ | ~520MB | Canvas must maintain 60fps |
| **Simultaneous DOCX Conversion** | $< 950\text{MB}$ | ~750MB | Process must terminate after conversion |
| **Direct CUPS Spooling** | $< 600\text{MB}$ | ~480MB | Memory immediately reclaimed post-spool |

---

## 6. Non-Technical Operator Usability Trials (Mother's Test)

We conduct structured operational trials with the mother to evaluate friction points:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MOTHER-OPERATOR USABILITY SCORECARD                     │
├─────────────────────────┬───────────────────┬──────────────┬────────────────┤
│ Task Description        │ Target Time       │ Max Errors   │ Pass Criteria  │
├─────────────────────────┼───────────────────┼──────────────┼────────────────┤
│ 1. QR Drop to Print     │ $< 45\text{ sec}$ │ 0 Errors     │ Customer photo │
│    (4R Rush ID Set 1)   │                   │              │ printed safely │
├─────────────────────────┼───────────────────┼──────────────┼────────────────┤
│ 2. Document Page Range  │ $< 30\text{ sec}$ │ 0 Errors     │ Selected pages │
│    (Print pages 1-3 B&W)│                   │              │ printed duplex │
├─────────────────────────┼───────────────────┼──────────────┼────────────────┤
│ 3. Cash Change Count    │ $< 10\text{ sec}$ │ 0 Errors     │ Correct change │
│    (Bill ₱40, Cash ₱100)│                   │              │ handed out     │
├─────────────────────────┼───────────────────┼──────────────┼────────────────┤
│ 4. Paper Jam Recovery   │ $< 60\text{ sec}$ │ 0 Tech Calls │ Jam cleared &  │
│    (Simulated empty tray│                   │              │ 1-tap reprint  │
└─────────────────────────┴───────────────────┴──────────────┴────────────────┘
```
