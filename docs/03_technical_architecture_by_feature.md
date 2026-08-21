# 03. Technical Architecture & Implementation Plan by Feature

> **Project**: HomePrint OS  
> **Backend**: Node.js (Fastify) + TypeScript + SQLite (WAL Mode)  
> **Frontend**: Vue 3 + Vite + Tailwind CSS + Pinia + Konva.js  
> **Print Subsystem**: CUPS 2.4+ & HPLIP Native Driver Layer  

---

## 1. System Topology & Architectural Layers

HomePrint OS is structured into four distinct runtime layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            LAYER 1: CLIENT FRONTEND                         │
│   • Vue 3 SPA (Vite + Tailwind CSS + Pinia)                                 │
│   • HTML5 Canvas Editor (Konva.js) — Lightweight 72 DPI display viewport    │
│   • Public Mobile PWA (/drop) for Customer QR file uploads                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Port 5000)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                            LAYER 2: FASTIFY BACKEND                         │
│   • Route Controller & PIN Authentication Middleware                        │
│   • Graph Engineering Execution Pipeline (Ingest ➔ Layout ➔ Gate ➔ Print)   │
│   • WebSocket Telemetry Hub (Real-time CUPS & Queue Broadcasts)             │
│   • Dynamic PPD Discovery & Driver Introspection Service                    │
└──────────────────┬──────────────────────────────────────────┬───────────────┘
                   │ Direct CLI / Sandboxed Execution         │ In-Memory Stream
┌──────────────────▼──────────────────┐   ┌───────────────────▼───────────────┐
│   LAYER 3A: DOCUMENT CONVERTER      │   │   LAYER 3B: PDF & IMAGE ENGINE    │
│   • Headless LibreOffice CLI        │   │   • `pdf-lib` Vector Compositor   │
│   • Sandboxed via `systemd-run`     │   │   • `sharp` (libvips C++ Binding) │
│   • 256MB RAM Cap, 15s Timeout      │   │   • Streaming Memory <40MB RAM    │
└──────────────────┬──────────────────┘   └───────────────────┬───────────────┘
                   │ Converted PDF / Spool Path               │
┌──────────────────▼──────────────────────────────────────────▼───────────────┐
│                            LAYER 4: HARDWARE & OS                           │
│   • CUPS Spooler (`lp`, `lpstat`, `cancel`)                                 │
│   • HPLIP Open-Source Driver (`hpmud`/`hp-cups`)                            │
│   • SQLite Database Engine with WAL mode (`better-sqlite3`)                 │
│   • HP Smart Tank 670 All-in-One (USB 2.0 / IPP Socket)                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Blueprint by Feature

### 2.1 Route Isolation & 4-Digit PIN Security

#### Route Separation Matrix:
* **Public Unauthenticated Routes**:
  - `GET  /drop` $\to$ Serves mobile upload UI.
  - `POST /api/public/upload` $\to$ Multipart stream (max 50MB, rate limit 5 req/min).
  - `GET  /api/public/status/:jobId` $\to$ Upload progress and confirmation.
* **Protected Operator Routes (Requires PIN Session)**:
  - `GET  /` $\to$ Operator Dashboard.
  - `GET  /studio` $\to$ Layout Studio.
  - `GET  /costing` $\to$ Product Catalogue & Margin Config.
  - `POST /api/operator/*` $\to$ Job management, print dispatch, settings.
  - `WS   /ws/operator` $\to$ Live queue and CUPS telemetry stream.

#### Fastify Authentication Hook:
```typescript
fastify.addHook('preHandler', async (request, reply) => {
  const publicPaths = ['/drop', '/api/public/upload', '/api/public/status'];
  const isPublic = publicPaths.some(path => request.url.startsWith(path));
  
  if (!isPublic) {
    const sessionToken = request.cookies['hp_session'];
    if (!sessionToken || !verifySessionToken(sessionToken)) {
      if (request.url.startsWith('/api/')) {
        return reply.status(401).send({ error: 'Operator PIN required.' });
      }
      return reply.redirect('/login');
    }
  }
});
```

---

### 2.2 Document Conversion Pipeline (Headless LibreOffice Sandbox)

#### Conversion Service Architecture:
To prevent heavy DOCX files from exhausting the laptop's 4GB RAM, LibreOffice is invoked ephemerally under strict cgroup memory caps:

```typescript
export class DocumentConverterService {
  private outputDir = '/tmp/homeprint_converted';

  async convertToPdf(inputFilePath: string): Promise<string> {
    await fs.mkdir(this.outputDir, { recursive: true });
    const ext = path.extname(inputFilePath).toLowerCase();
    if (ext === '.pdf') return inputFilePath;

    // Execute within an isolated cgroup scope with 256MB RAM cap
    const command = `systemd-run --scope -p MemoryMax=256M -p CPUQuota=60% \
      soffice --headless --convert-to pdf --outdir "${this.outputDir}" \
      --norestore --nofirststartwizard --nologo "${inputFilePath}"`;

    await execAsync(command, { timeout: 15000 });
    const baseName = path.basename(inputFilePath, ext);
    const convertedPath = path.join(this.outputDir, `${baseName}.pdf`);
    return convertedPath;
  }
}
```

---

### 2.3 Layout Studio & Coordinate Mathematics (300 DPI Vector PDF)

#### Mathematical Coordinate Model:
The frontend HTML5 canvas operates in screen pixels, while the backend PDF engine operates in PostScript points ($1\text{ inch} = 25.4\text{ mm} = 72\text{ pt}$).

$$\text{PostScript Points (pt)} = \text{Dimension in Millimeters (mm)} \times \frac{72}{25.4}$$

#### Viewport-to-Physical Crop Transformation:
Let $(W_{img}, H_{img})$ be the original source photo resolution, $(W_{canvas}, H_{canvas})$ be the on-screen container, and $(S, O_x, O_y)$ be zoom scale and pan offsets:

$$x_{src} = \frac{-O_x}{S} \cdot \left(\frac{W_{img}}{W_{canvas}}\right), \quad y_{src} = \frac{-O_y}{S} \cdot \left(\frac{H_{img}}{H_{canvas}}\right)$$
$$w_{src} = \frac{W_{box\_canvas}}{S} \cdot \left(\frac{W_{img}}{W_{canvas}}\right), \quad h_{src} = \frac{H_{box\_canvas}}{S} \cdot \left(\frac{H_{img}}{H_{canvas}}\right)$$

#### PDF Vector Embedding (`pdf-lib` Implementation):
```typescript
export class PdfBuilderService {
  async buildLayoutPdf(state: SharedPrintJobState, outputPath: string): Promise<string> {
    const paperDim = PAPER_DIMENSIONS_MM[state.product.paperSize] || PAPER_DIMENSIONS_MM['4R'];
    const pageWidthPt = paperDim.width * (72 / 25.4);
    const pageHeightPt = paperDim.height * (72 / 25.4);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    const imageBytes = await fs.readFile(state.inputFiles[0].filePath);
    const embeddedImage = await pdfDoc.embedJpg(imageBytes);

    for (const box of state.layout.boxes) {
      const xPt = box.xMm * (72 / 25.4);
      // PostScript coordinate origin is bottom-left
      const yPt = pageHeightPt - ((box.yMm + box.heightMm) * (72 / 25.4));
      const wPt = box.widthMm * (72 / 25.4);
      const hPt = box.heightMm * (72 / 25.4);

      page.drawImage(embeddedImage, { x: xPt, y: yPt, width: wPt, height: hPt });

      if (state.layout.showCutLines) {
        this.drawDashedCutLines(page, xPt, yPt, wPt, hPt);
      }
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }
}
```

---

### 2.4 Dynamic PPD Discovery & Direct CUPS Spooling

#### Dynamic PPD Discovery Parser:
```typescript
export class PpdDiscoveryService {
  async discoverOptions(printerName: string = 'HP_Smart_Tank_670'): Promise<DiscoveredDriverOptions> {
    const { stdout } = await execAsync(`lpoptions -p ${printerName} -l`);
    const optionsMap = this.parseLpoptions(stdout);

    // Introspect monochrome option string
    let colorModeFlag = 'OutputMode';
    let monochromeValue = 'BlackOnlyGrayscale';
    if (optionsMap['ColorModel']) {
      colorModeFlag = 'ColorModel';
      monochromeValue = optionsMap['ColorModel'].find(v => /gray|mono/i.test(v)) || 'Gray';
    } else if (optionsMap['print-color-mode']) {
      colorModeFlag = 'print-color-mode';
      monochromeValue = 'monochrome';
    }

    return {
      printerName,
      colorModeFlag,
      monochromeValue,
      colorValue: 'Color',
      glossyMediaValue: 'PhotographicGlossy',
      plainMediaValue: 'Plain',
      borderless4RValue: 'Custom.4x6in.Borderless',
    };
  }
}
```

#### CUPS Job Dispatch Command:
```bash
lp -d HP_Smart_Tank_670 \
   -n 1 \
   -o media=Custom.4x6in.Borderless \
   -o MediaType=PhotographicGlossy \
   -o print-quality=5 \
   -o fit-to-page=false \
   "/tmp/homeprint_job_10492.pdf"
```

---

### 2.5 Real-Time CUPS Queue Telemetry Loop

The backend runs a background timer loop (`setInterval` every 2000ms) whenever active print jobs exist:

```typescript
export class CupsMonitorService {
  async pollQueue(): Promise<void> {
    try {
      const { stdout } = await execAsync('lpstat -o');
      // Parse active jobs
      const activeCupsJobs = this.parseActiveJobs(stdout);
      
      // Query printer state reasons (jams, out of paper)
      const { stdout: statOut } = await execAsync('lpstat -p HP_Smart_Tank_670');
      const hasJam = statOut.includes('jam') || statOut.includes('media-empty');

      this.websocketHub.broadcast({
        type: 'CUPS_TELEMETRY_UPDATE',
        activeCupsJobs,
        printerStatus: hasJam ? 'PAPER_JAM_OR_EMPTY' : 'NORMAL',
      });
    } catch (err) {
      // Handle printer offline
    }
  }
}
```

---

### 2.6 Reactive Costing & Margin Matrix Engine

The costing calculations are reactive derived functions in Pinia and validated on the backend:

$$\text{Base Cost} = \text{Material} + \text{Operation} + \left(\frac{\text{Labor Rate}}{60} \times \text{Labor Minutes}\right)$$
$$\text{Selling Price} = \text{Base Cost} \times \left(1 + \frac{\text{Margin \%}}{100}\right)$$

```typescript
export function calculateReactiveCosting(
  materials: MaterialItem[],
  operations: OperationItem[],
  labor: LaborParameters,
  targetMargin: number,
  copies: number,
  discount: number
): CostingResult {
  const totalMat = materials.reduce((acc, m) => acc + (m.qty * m.unitPrice), 0);
  const totalOp = operations.reduce((acc, op) => acc + op.amount, 0);
  const totalLabor = (labor.ratePerHour / 60) * ((labor.hours * 60) + labor.minutes);
  const totalBase = totalMat + totalOp + totalLabor;

  const marginMatrix = [25, 50, 75, 100, 150].map(margin => ({
    marginPercent: margin,
    baseCost: Number(totalBase.toFixed(2)),
    profit: Number((totalBase * (margin / 100)).toFixed(2)),
    sellingPrice: Number((totalBase * (1 + margin / 100)).toFixed(2)),
  }));

  const targetPrice = Number((totalBase * (1 + targetMargin / 100)).toFixed(2));
  const finalTotal = Number(((targetPrice * copies) - discount).toFixed(2));

  return { totalBase, marginMatrix, targetPrice, finalTotal };
}
```

---

### 2.7 Gated 1-Hour Purge & Re-Print Resilience

```
[Job Spooled to CUPS]
         │
         ▼
[CUPS_Monitor_Loop polls queue until COMPLETED]
         │
         ▼
[Job marked COMPLETED in SQLite] ──► [Record cached in /var/homeprint/cache/]
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         │ (If Customer Requests Reprint)                  │ (After 1 Hour Grace Period)
                         ▼                                                 ▼
             [1-Click Reprint Action]                            [Auto_Purge_Node]
             (Re-dispatches cached PDF)                          (Deletes temp files)
```
