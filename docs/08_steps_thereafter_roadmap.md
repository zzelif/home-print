# 08. Steps Thereafter & Execution Roadmap

> **Project**: HomePrint OS  
> **Purpose**: Step-by-step developer guide and operational roadmap to bring HomePrint OS from scaffolded architecture to live counter operation.  

---

## 1. Concrete Execution Stages

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DEVELOPER ACTION ROADMAP                           │
├───────────────────────────────────┬─────────────────────────────────────────┤
│ Step 1: Backend Assembly          │ Wire Fastify routes, auth middleware,   │
│                                   │ and Graph Engineering pipeline.         │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Step 2: Frontend SPA Construction │ Build Vue 3 views: Dashboard, Studio,   │
│                                   │ Costing Matrix, and POS Drawer.         │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Step 3: Linux Hardware Bootstrap  │ Run setup script on the Asus laptop.    │
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Step 4: Printer Calibration       │ Calibrate 4R borderless bleed & B&W ink.│
├───────────────────────────────────┼─────────────────────────────────────────┤
│ Step 5: Mother Usability Run      │ Conduct counter trials with mother.     │
└───────────────────────────────────┴─────────────────────────────────────────┘
```

---

## 2. Step 1: Complete Backend Server Wiring

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```
2. **Wire REST & WebSocket Endpoints**:
   - `src/routes/operator-auth.routes.ts` (PIN login, session cookies).
   - `src/routes/public-drop.routes.ts` (Customer upload stream at `/drop`).
   - `src/routes/operator-jobs.routes.ts` (Order queue management).
   - `src/routes/operator-print.routes.ts` (Dispatches jobs to `CupsDispatchNode`).
3. **Run Backend in Development Mode**:
   ```bash
   npm run dev
   ```

---

## 3. Step 2: Build Frontend Views & Canvas Studio

1. **Initialize Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```
2. **Implement Core Views**:
   - `src/views/DashboardView.vue`: Printer health banner, live job cards, quick actions.
   - `src/views/LayoutStudioView.vue`: Konva.js canvas, preset cards (Set 1 to Set 4), DPI traffic light, scissor cut line overlays.
   - `src/views/CostingView.vue`: Dynamic sliders, Material/Operation/Labor inputs, 5-tier margin matrix table.
   - `src/views/InactiveUploadView.vue`: Customer-facing mobile upload page at `/drop`.
3. **Build Static Assets**:
   ```bash
   npm run build
   ```
   - Configure Fastify to serve the built frontend from `backend/dist/public` via `@fastify/static`.

---

## 4. Step 3: Linux Laptop Deployment (Asus 4GB RAM)

1. **Install Linux Mint 21.3 XFCE** on the Asus laptop.
2. **Clone / Copy Project Repository** to `/home/user/home-print`.
3. **Execute Automated Setup Script**:
   ```bash
   cd /home/user/home-print
   chmod +x scripts/setup-linux-cups.sh
   ./scripts/setup-linux-cups.sh
   ```
4. **Configure External HDMI Monitor**:
   - Open XFCE Settings $\to$ Display.
   - Set HDMI-1 as Primary / Only display.
   - Turn OFF internal broken display (`eDP-1` or `LVDS-1`).

---

## 5. Step 4: Physical Hardware Calibration (HP Smart Tank 670)

1. **USB Direct Connection**:
   - Connect the HP Smart Tank 670 to the Asus laptop via a high-quality USB 2.0 cable.
2. **Driver Calibration**:
   - Navigate to `http://localhost:5000/settings`.
   - Click **"1-Click Driver Swatch Test"**.
   - Verify that B&W text prints using black pigment ink only.
3. **4R Borderless Margin Calibration**:
   - Load 4R ($4\times 6\text{ in}$) glossy photo paper into the rear feed tray.
   - Print a Set 1 Rush ID test sheet.
   - Measure 2x2 and 1x1 photo boxes with a physical ruler to verify exact millimeter dimensions ($50.8\text{ mm}$ and $25.4\text{ mm}$).
   - Adjust the **Top Margin Nudge** setting if any physical feed offset is observed.

---

## 6. Step 5: Counter Setup & Operator Onboarding (Mother's First Shift)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COUNTER READINESS CHECKLIST                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ [ ] Print Counter QR Code graphic and place in an acrylic stand on counter. │
│ [ ] Bookmark `http://<laptop-ip>:5000` on mother's tablet/phone.            │
│ [ ] Conduct 3 simulated customer orders:                                    │
│     1. Rush ID Photo (Customer uploads via QR ➔ Pick Set 1 ➔ Print).        │
│     2. School Document (Student uploads DOCX ➔ Print Pages 1-3 B&W).        │
│     3. Cash Change Transaction (Bill ₱40 ➔ Tender ₱100 ➔ Give ₱60).         │
│ [ ] Confirm mother is comfortable with big green PRINT button and audio cues│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Step 6: Ongoing Maintenance & Daily Backup

1. **Automated Nightly Database Backup**:
   - Set up a cron job running `scripts/backup-db.sh` every night at 11:00 PM:
   ```bash
   0 23 * * * /home/user/home-print/scripts/backup-db.sh >> /var/log/homeprint-backup.log 2>&1
   ```
2. **Weekly Ink Tank Inspection**:
   - Visually check physical ink tank levels on the HP Smart Tank 670 window.
   - Refill with original HP GT53 (Black) and GT52 (Cyan/Magenta/Yellow) ink bottles when tanks reach the lower fill line.
