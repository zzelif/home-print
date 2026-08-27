# 04. Design System & Operator UX Blueprint (Tailored for Mother)

> **Design Goal**: Ultra-intuitive, visual, tactile, and stress-free print shop interface  
> **Primary Operator**: Mother (Non-technical operator managing customer rushes)  
> **Interaction Mode**: Laptop Trackpad/Mouse or Mobile/Tablet Touchscreen over Wi-Fi  

---

## 1. UX Design Philosophy & Core Tenets

The design of HomePrint OS follows four uncompromising principles:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OPERATOR UX PILLARS                                │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ 1. Zero Jargon                    │ No mentions of "DPI", "PPD", "Spooler", │
│                                   │ "PostScript", or "CUPS".                │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 2. Visual Recognition over Recall │ Preset buttons show miniature pictures  │
│                                   │ of the layout, not abstract dimensions. │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 3. Giant Touch Targets            │ Action buttons are at least 56px high   │
│                                   │ with high-contrast color coding.        │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ 4. Multi-Sensory Feedback         │ Visual banners + cheerful audio chimes  │
│                                   │ confirm actions and alert to errors.    │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 2. Color System & Semantic Affordances

Color is used strictly to communicate system state and guide the operator's eye:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              COLOR PALETTE                                  │
├──────────────┬───────────┬──────────────────────────────────────────────────┤
│ Semantic Role│ Hex Code  │ UI Usage                                         │
├──────────────┼───────────┼──────────────────────────────────────────────────┤
│ Action Go    │ `#16A34A` │ Big Green **PRINT** Button, POS Change Display,  │
│              │           │ Printer Ready Status, High DPI Crisp Badge       │
├──────────────┼───────────┼──────────────────────────────────────────────────┤
│ Workflow     │ `#2563EB` │ Photo Upload Dropzone, Active Tab, Load Customer │
├──────────────┼───────────┼──────────────────────────────────────────────────┤
│ Review       │ `#D97706` │ Moderate DPI Warning (WhatsApp soft photo),      │
│              │           │ Pending Approval, Paper Low Alert                │
├──────────────┼───────────┼──────────────────────────────────────────────────┤
│ Attention    │ `#DC2626` │ Paper Jam Alert, Blurry Photo Modal, Disconnected│
├──────────────┼───────────┼──────────────────────────────────────────────────┤
│ Neutral      │ `#F8FAFC` │ Background Slate, Crisp Card Containers          │
└──────────────┴───────────┴──────────────────────────────────────────────────┘
```

---

## 3. Typography & Giant Numbers

* **Font Family**: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto.
* **Size Hierarchy**:
  - **POS Change Output**: `text-5xl font-black text-green-600` (48px bold green — visible from 3 feet away).
  - **Primary Action Buttons**: `text-xl font-bold` (20px bold).
  - **Card Headers**: `text-lg font-semibold` (18px semibold).
  - **Body / Explanations**: `text-base font-medium text-slate-700` (16px readable font; zero tiny 10px/12px text).

---

## 4. Visual Component Specifications

### 4.1 Preset Selection Cards (Miniature Graphic Previews)
Instead of dropdown menus with text like `"Set 1: 4 copies 2x2, 8 copies 1x1"`, the UI presents large visual cards with miniature illustrated layout grids:

```
┌───────────────────────────┐    ┌───────────────────────────┐
│ ┌─────┐ ┌─────┐           │    │ ┌─────┐ ┌─────┐           │
│ │ 2x2 │ │ 2x2 │           │    │ │ 2x2 │ │ 2x2 │           │
│ ├─────┤ ├─────┤           │    │ ├─────┤ ├─────┤           │
│ │ 2x2 │ │ 2x2 │           │    │ │ 2x2 │ │ 2x2 │           │
│ ├──┬──┤ ├──┬──┤           │    │ ├─────┤ ├─────┤           │
│ │1x1│1x1│1x1│1x1│         │    │ │ 2x2 │ │ 2x2 │           │
│ └──┴──┴──┴──┴─┘           │    │ └─────┴─┴─────┘           │
│ SET 1: Standard Rush ID   │    │ SET 2: 2x2 Package (6pcs) │
└───────────────────────────┘    └───────────────────────────┘
```

---

### 4.2 Photo Dropzone & Face Centering Helper
* **Drop Target**: Large dashed blue container (`border-4 border-dashed border-blue-400 rounded-3xl p-8`).
* **Visual Icon**: Large camera/upload icon with text: *"Drag Photo Here or Tap to Pick"*.
* **Face Centering Helper**: When a photo is loaded, the canvas shows a subtle circular guide indicating the optimal eye/chin level for passport and rush ID photos.
* **1-Drag Sync**: Moving or zooming the photo in one box automatically updates all duplicate copies in real time.

---

### 4.3 Operator-Friendly DPI Traffic Light
Replaces technical resolution numbers with a clear 3-tier traffic light:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [CRISP & CLEAR] (Ready to Print)                                            │
│ "Great quality photo! Perfect for passport and official IDs."               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ [SLIGHTLY SOFT] (WhatsApp Photo)                                            │
│ "Photo was sent via Messenger/WhatsApp. OK for student ID, but slightly soft"│
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ [TOO BLURRY] (Action Required)                                              │
│ "Photo is too small or blurry. Please ask customer to upload original file" │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Cash POS Drawer & Big Change Calculator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TOTAL BILL: ₱40.00                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ QUICK CASH TENDER:                                                          │
│ [ ₱50 ]   [ ₱100 ]   [ ₱200 ]   [ ₱500 ]   [ ₱1000 ]   [ Exact: ₱40 ]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                  CUSTOMER CHANGE DUE:                                       │
│                      ₱ 60.00                                                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ COMPLETE & PRINT RECEIPT ]                         [ CANCEL ]              │
└─────────────────────────────────────────────────────────────────────────────┘

```

---

## 5. Audio Cues & Sound Design

To keep the mother informed without requiring her to constantly stare at the screen:

| Event | Audio Asset | Sound Characteristic | Operator Meaning |
| :--- | :--- | :--- | :--- |
| **New Customer Drop** | `chime.mp3` | Cheerful 2-tone chime | *"A customer just uploaded a photo via QR code."* |
| **Print Spool Success**| `success.mp3`| Crisp pleasant ding | *"Print job sent to HP printer."* |
| **Print Completed** | `complete.mp3`| Harmonic double chime | *"Paper has finished coming out of the printer."* |
| **Paper Empty / Jam**| `warning.mp3`| Gentle 3-pulse alert tone | *"Printer needs paper or has a jam."* |

---

## 6. Fail-Safe Guardrails & Error Prevention

1. **Persistent Undo Button**: Floating in the Layout Studio at all times (`[ Undo ]`).
2. **Hold-to-Delete Protection**: Destructive actions (like canceling an active order or clearing the queue) require a **1-second hold** rather than an instant single click.
3. **Automatic Print Confirmation**: Before physical printing begins, a large modal displays the final 4R sheet thumbnail with a giant green **`[ CONFIRM PRINT ]`** button.
4. **1-Click Jam Recovery**: If a paper jam occurs, the UI displays a simple guide: *"1. Open printer cover and remove paper. 2. Tap [Resume Print]"*.

---

## 7. Mobile & Tablet Responsive Layout (Counter Operation)

When accessed from an iPad, Android tablet, or smartphone over the shop's Wi-Fi:
* **Sticky Bottom Action Bar**: The primary action button (e.g. `[ PRINT NOW ]`) is anchored to the bottom of the screen with a 64px height.
* **Touch-Optimized Sliders**: Sliders have large $32\text{px}$ grab thumbs for easy finger adjustment.
* **Zero Accidental Pinch-Zoom**: Meta viewport locks the web interface:
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  ```
