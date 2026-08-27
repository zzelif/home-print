---
name: mother-operator-ux-audit
description: >-
  Use this skill to inspect, audit, and refactor frontend components and UI views for accessibility, clarity, and zero-friction usability for the non-technical shop operator.
---

# Mother-Operator UX & Ergonomics Audit Protocol

## Overview
HomePrint OS is designed specifically for non-technical counter operators (the shop owner's mother) managing high-stress customer rushes. Any cognitive friction, technical jargon, or tiny buttons will cause counter delays.

---

## 1. Compliance Audit Criteria

Evaluate every frontend view and component against these four non-negotiable rules:

### Rule 1: Zero Technical Jargon
- **Prohibited**: `DPI`, `PPD`, `CUPS`, `PostScript`, `Spooler`, `Baud Rate`, `MIME Type`, `Hex`, `Socket 9100`.
- **Required**: Plain language descriptive badges:
  - **Crisp & Clear** (Ready for official ID)
  - **Slightly Soft** (WhatsApp/Messenger photo)
  - **Too Blurry** (Ask customer for original)
  - **Printer Ready** / **Printer Offline (Plug in USB cable)**

### Rule 2: Giant Touch Targets
- All primary buttons (e.g. `[ PRINT NOW ]`, `[ Checkout ]`, `[ New Rush ID ]`) must have at least **56px touch target height** (`py-3.5` or `h-14`) with bold text.
- Banknote quick-tender buttons (`₱50`, `₱100`, `₱200`, `₱500`, `₱1000`, `Exact`) must be easily tappable on tablet screens.

### Rule 3: High-Contrast Giant Currency Counter
- Total Bill: 32pt+ bold font (`text-4xl font-black`).
- Change Due: **48pt+ bold green font** (`text-5xl font-black text-green-600`) with high-contrast background banner (`bg-green-50 border-2 border-green-500`).

### Rule 4: Visual Preset Recognition & Live Canvas Parity
- Show miniature visual layout diagrams for presets (`Set 1`, `Set 2`, `Set 3`, `Passport`) rather than abstract dimensional descriptions.
- The 4R canvas preview must render the exact layout coordinates for all presets (`SET_1`, `SET_2`, `SET_3`, `SET_4`, and `POLAROID`).
- Prominently display the DPI Traffic Light badge (*Crisp & Clear* / *Slightly Soft* / *Too Blurry*) next to the customer photo dropzone.

### Rule 5: Multi-Device Responsive Viewports (Mobile & Tablet)
- Viewport must be locked against accidental double-tap zoom: `user-scalable=no`.
- Sticky bottom actions on mobile screens (`h-14` / `56px+` minimum height).
- Layouts must be cleanly scrollable and usable on standard Android/iOS phones and tablets accessing the Raspberry Pi 4 host over LAN.

---

## 2. Audit Runbook for Views

1. **DashboardView.vue**:
   - Check printer health banner visibility and status color.
   - Verify job order cards have clear status tags and 1-tap action buttons.
2. **LayoutStudioView.vue**:
   - Verify preset selector displays layout thumbnails.
   - Verify all 4 presets and Polaroid mode render their distinctive slot grids on canvas.
   - Verify DPI quality indicator shows plain English traffic lights.
   - Verify print button is prominent and green.
3. **CheckoutModal.vue**:
   - Verify banknote buttons calculate change instantly.
   - Verify change amount is visible from 3 feet away in 48pt bold green.
