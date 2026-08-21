# 07. Gaps, Risks & Adversarial Edge Case Analysis

> **Project**: HomePrint OS  
> **Target Environment**: Legacy Hardware (4GB RAM) + HP Smart Tank 670  
> **Analysis Type**: Adversarial Edge Case Deep Dive  

---

## 1. Edge Case & Risk Classification Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ADVERSARIAL RISK PROFILE                              │
│                                                                                 │
│   Impact ▲                                                                      │
│          │  [iPhone HEIC Upload]  [Password PDF]           [Hardware Feed Jam]  │
│   HIGH   │                                                                      │
│          │  [Font Substitution]   [Client Wi-Fi Drop]      [4R Bleed Offset]    │
│          │                                                                      │
│   MEDIUM │  [Heavy 100-page DOCX] [USB File Lock]          [Browser Zoom Drift] │
│          │                                                                      │
│   LOW    │  [Temp File Accumulation]                                            │
│          └────────────────────────────────────────────────────────────────────► │
│             LOW                   MEDIUM                   HIGH      Likelihood │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. In-Depth Edge Case Analysis & Engineering Mitigations

### 2.1 Customer File Anomalies

#### Gap 1: iPhone HEIC / HEIF Photo Uploads
* **The Problem**: Modern iPhones default to taking photos in Apple's proprietary `.heic` / `.heif` format. Browsers and `pdf-lib` cannot natively decode HEIC images, causing upload failures at the QR Drop portal.
* **Adversarial Impact**: Customer uploads photo, gets an error or blank canvas; mother does not know how to convert it.
* **Engineering Mitigation**:
  - Integrate `libheif` / `sharp` with HEIC support in the ingestion pipeline.
  - The `File_Ingestion_Node` automatically converts incoming `.heic` buffers to high-quality `.jpg` streams before passing state to the Layout Studio.

#### Gap 2: Password-Protected or Encrypted Customer PDFs
* **The Problem**: Students downloading official school grades or government forms often submit password-locked PDFs.
* **Adversarial Impact**: `pdf-lib` and LibreOffice fail with an unhandled decryption exception.
* **Engineering Mitigation**:
  - The `File_Validation_Node` checks PDF encryption flags (`pdfDoc.isEncrypted`).
  - If locked, the UI immediately prompts the operator: *"This PDF is password-protected. Please ask customer for the password to unlock."*

#### Gap 3: Missing Fonts in DOCX Documents (Font Substitution Shifts)
* **The Problem**: A student creates a resume in Microsoft Word using proprietary Windows fonts (e.g. `Calibri`, `Aptos`, `Century Gothic`). When converted on Linux via LibreOffice, Linux substitutes them with `Liberation Sans` or `DejaVu Sans`, potentially pushing text onto an unwanted second page.
* **Adversarial Impact**: Customer complains that their 1-page resume printed across 2 pages.
* **Engineering Mitigation**:
  - The setup script installs Microsoft TrueType Core Fonts (`ttf-mscorefonts-installer`) and Microsoft ClearType fonts.
  - The operator document view displays an exact thumbnail preview of the converted PDF so the mother can visually verify page count before printing.

---

### 2.2 Hardware & Physical Printing Edge Cases

#### Gap 4: HP Smart Tank 670 4R Borderless Bleed Expansion
* **The Problem**: Inkjet borderless printing physically expands the image by $1\text{–}2\%$ beyond the paper edges (overspray/bleed) to avoid white borders. This expansion can slightly distort strict $2\times 2\text{ in}$ photo dimensions if not compensated.
* **Adversarial Impact**: Passport photo printed in borderless mode comes out slightly oversized ($2.04\text{ in}$ instead of $2.00\text{ in}$).
* **Engineering Mitigation**:
  - Implement a configurable **Hardware Overspray Compensation Factor** in Settings (`oversprayBleedCompensation = 0.985`).
  - When borderless 4R mode is selected, the vector engine scales the bounding grid by $0.985$ so that the physical expansion lands on exact $50.8\text{ mm}$ dimensions.

#### Gap 5: Thick Photo Paper Feed Slip on Older HP Rollers
* **The Problem**: 230gsm glossy photo paper is thick and stiff. If the printer rollers are dusty, the sheet may experience a slight feed delay, causing a $1\text{mm}$ top margin shift.
* **Engineering Mitigation**:
  - Add a **Top Margin Nudge Tool** in Settings ($\pm 3\text{mm}$ offset adjustments) so the operator can calibrate the physical feed alignment.

---

### 2.3 Operating System & Network Edge Cases

#### Gap 6: Wi-Fi Router Client Isolation on Counter Drop
* **The Problem**: Some residential Wi-Fi routers have "AP Isolation" or "Guest Mode" enabled, preventing customer phones from communicating with the laptop's LAN IP.
* **Engineering Mitigation**:
  - The setup script includes an optional script `scripts/enable-hotspot.sh` that turns the laptop's Wi-Fi card into a standalone shop hotspot (`SSID: HomePrint-Customer-Drop`, no password), creating a dedicated, air-gapped network for file drops.

#### Gap 7: Sudden Power Disconnect on Legacy Laptop Battery
* **The Problem**: If the power cable is knocked loose and the old battery fails instantly, in-flight jobs could be lost.
* **Engineering Mitigation**:
  - SQLite Write-Ahead Logging (WAL) guarantees zero database corruption on sudden power loss.
  - On system reboot, the server automatically recovers the last active order state from SQLite.
