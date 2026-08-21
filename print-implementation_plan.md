# HomePrint OS — Master System Architecture & Production Engineering Plan (v5 Final)

> **Project Code**: `home-print`  
> **Target Architecture**: Local-First, Zero-Cloud, High-Performance Micro-App  
> **Hardware Target**: Legacy Asus Laptop (Intel 64-bit, 4GB DDR3L 1600MHz RAM, External HDMI Display)  
> **Target Printer**: HP Smart Tank 670 All-in-One (USB 2.0 / Local Wi-Fi IPP, Duplex, Borderless 4R Photo)  
> **Primary Operator**: Mother (Non-Technical, Operator-Led, High-Contrast, Touchscreen & Mobile-First)  

---

## 1. System Vision & Architecture Summary

HomePrint OS is a 100% local-first, zero-subscription print shop operating system engineered specifically for neighborhood print shops. It combines **high-precision 300 DPI vector layout editing**, **headless document conversion**, **two-tier costing with dynamic margin matrices**, **real-time bi-directional CUPS spooling**, and a **buttery-smooth checkout & change counter**.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                HOMEPRINT OS RUNTIME ARCHITECTURE                        │
│                                                                                         │
│   [Customer Phone]             [Operator Phone/Tablet]          [Shop Laptop Bar]       │
│   • Cloudflare Tunnel Drop     • Responsive Touchscreen UI      • Main Station          │
│   • Isolated Hotspot Fallback  • Live Queue & Change Counter   • External HDMI Screen  │
│   • Telegram Bot / Messenger   • 1-Tap PRINT NOW                • LibreOffice Impress   │
│             │                               │                              │            │
│             └───────────────────────────────┼──────────────────────────────┘            │
│                                             ▼                                           │
│                         ┌────────────────────────────────────────┐                      │
│                         │   Fastify + TypeScript Local Server    │                      │
│                         │   • Public Route Scope: /drop          │                      │
│                         │   • Operator Scope: PIN Authenticated  │                      │
│                         │   • WebSocket Real-Time Telemetry Hub  │                      │
│                         │   • SQLite Database with WAL Mode      │                      │
│                         └───────────────────┬────────────────────┘                      │
│                                             │                                           │
│                   ┌─────────────────────────┴─────────────────────────┐                 │
│                   ▼                                                   ▼                 │
│   ┌───────────────────────────────┐                   ┌───────────────────────────────┐ │
│   │  Headless LibreOffice Sandbox │                   │  300 DPI Vector PDF Engine    │ │
│   │  • DOCX / PPTX / PDF Converter│                   │  • `pdf-lib` + `sharp` Stream │ │
│   │  • 256MB RAM Cap, 15s Timeout │                   │  • Strict Millimeter Math     │ │
│   └───────────────┬───────────────┘                   └───────────────┬───────────────┘ │
│                   │                                                   │                 │
│                   └─────────────────────────┬─────────────────────────┘                 │
│                                             │ Spool Ticket                              │
│                                             ▼                                           │
│                         ┌────────────────────────────────────────┐                      │
│                         │   CUPS 2.4+ & Native HPLIP Driver Layer│                      │
│                         │   • Dynamic PPD Option Discovery       │                      │
│                         │   • Real-Time Queue Telemetry Loop     │                      │
│                         │   • Gated 1-Hour Purge & Reprint Cache │                      │
│                         └───────────────────┬────────────────────┘                      │
│                                             │ USB 2.0 Direct Cable                      │
│                                             ▼                                           │
│                         ┌────────────────────────────────────────┐                      │
│                         │        HP Smart Tank 670 Printer       │                      │
│                         └────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Customer Upload & Network Security (Two-Model Architecture)

To ensure zero compromise of the home network while offering maximum ease of access for walk-in customers:

### Model 1 (Primary): Cloudflare Tunnel (Static QR Code & Mobile Cellular Data)
* Customers walk into the shop and scan the static acrylic QR code on the counter using their own mobile data (4G/5G).
* The QR points to a static domain (e.g. `https://drop.yourshop.com` via a free, outbound-only Cloudflare Tunnel).
* **Security**: No inbound router ports are opened. Customers never connect to the shop Wi-Fi. The tunnel strictly exposes the public `/drop` portal and rejects all administrative routes.

### Model 2 (Fallback): Isolated Wi-Fi Hotspot on Laptop / Raspberry Pi
* If cellular reception is weak, the laptop Wi-Fi card (or Raspberry Pi) broadcasts an air-gapped hotspot (`SSID: Free Print Drop - No Password`).
* Connects directly to `http://192.168.4.1:5000/drop` with no routing to the home network.

---

## 3. Multi-Channel Ingestion Strategy

Print shop workflows depend heavily on social messaging channels:
* **Facebook Messenger & Gmail**: Customers send files to the shop's Facebook page or email. The operator downloads the attachment and drops it directly into HomePrint's incoming queue (zero native execution).
* **Counter QR Drop**: Instant browser upload directly into the live inbox.
* **Telegram Bot (`@YourShopPrintBot`)**: Optional automated polling channel for uncompressed high-resolution photos and documents.
* **Sandboxed USB Hot Folder**: Flash drives mounted `noexec,nosuid,nodev,ro` with a clean web file picker.

---

## 4. Two-Tier Costing & Margin Matrix Model

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             TWO-TIER PRICING ARCHITECTURE                               │
├───────────────────────────────────────────┬─────────────────────────────────────────────┤
│ Tier 1: Commodity Document Printing       │ Tier 2: Specialized Rush ID & Photo Studio  │
├───────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Fixed rate per page (No labor markup)   │ • Base Cost = Material + Operation + Labor  │
│ • B&W Text: ₱2.00 – ₱5.00 / page          │ • 5-Tier Margin Matrix (25%, 50%, 75%,      │
│ • Color Text / Accent: ₱5.00 – ₱8.00/page │   100%, 150%)                               │
│ • Full Color / Image: ₱10.00 – ₱15.00/page│ • Target Margin Slider (10% to 200%)        │
│ • Duplex discount toggle                  │ • Opt-in Add-ons (e.g. Plastic ID Sleeve)   │
└───────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 5. Design System & Operator Ergonomics (Tailored for Mother)

1. **Clean Professional Vector Icons Only**: Strict policy banning emojis and emoticons. Uses clean, crisp SVG vector icons (Lucide / Heroicons).
2. **Buttery-Smooth Checkout & Change Counter**:
   - Total Bill shown in 32pt bold font.
   - Quick tender Philippine banknote buttons (`₱50`, `₱100`, `₱200`, `₱500`, `₱1000`, `Exact`).
   - Giant **48pt bold green change counter** (**Change: ₱60.00**).
   - Single clean `[ Mark Complete & Paid ]` button. No physical POS drawer or receipt printer complexity.
3. **Mobile-First & Touchscreen Optimized**: Fully responsive layout with 56px+ touch targets for counter tablets and phones.
4. **Audio Cues Postponed**: Silent, visual-only UI for initial deployment.

---

## 6. Document Conversion & Unix Microsoft Font Package

To eliminate font substitution shifts (e.g. 1-page student resumes pushing onto 2 pages), the automated setup script installs:
* `ttf-mscorefonts-installer` (Arial, Times New Roman, Verdana, Courier New, Georgia).
* Microsoft ClearType & Office Font Collection (`Calibri`, `Cambria`, `Consolas`, `Candara`, `Aptos`).
* Linux font cache regeneration (`fc-cache -fv`).
* Headless LibreOffice CLI (`soffice`) executed within a `systemd-run` sandbox (256MB RAM cap, 15s timeout).

---

## 7. Direct Printing & Real-Time Hardware Telemetry

* **Dynamic PPD Option Discovery**: Backend introspects `/etc/cups/ppd/HP_Smart_Tank_670.ppd` on boot to detect exact vendor strings for grayscale and glossy photo paper, preventing accidental color ink waste on B&W jobs.
* **Real-Time CUPS Queue Loop**: Polls `lpstat` every 2 seconds and relays live printing progress via WebSockets.
* **Gated 1-Hour Purge & 1-Click Reprint**: Generated PDFs and source files are cached for 1 hour after CUPS completion, enabling instant 1-tap reprints if a customer requests extra copies or drops their photo.

---

## 8. Continuous Adversarial Graph-Based Audit Framework

HomePrint OS maintains a continuous verification loop where every code increment is tested against real-world constraints:
* Unit tests for costing mathematics and margin matrices.
* Coordinate transformation tests verifying millimeter precision ($1\text{ in} = 25.4\text{ mm} = 72\text{ pt}$).
* PIN authentication and LAN route isolation verification.
* Automated CI/CD pipeline enforcing tests on every git commit.
