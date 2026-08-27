import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getDatabase } from '../db/database';
import { PhotoBoundingBox, SharedPrintJobState } from '../nodes/types';

export const MM_TO_POINTS = 72 / 25.4;

export const PAPER_DIMENSIONS_MM: Record<string, { width: number; height: number }> = {
  '4R': { width: 101.6, height: 152.4 }, // 4 x 6 inches (101.6mm x 152.4mm)
  '5R': { width: 127.0, height: 177.8 }, // 5 x 7 inches (127.0mm x 177.8mm)
  'A4': { width: 210.0, height: 297.0 },
  'Letter': { width: 215.9, height: 279.4 },
  'Legal': { width: 215.9, height: 355.6 },
  'Long': { width: 215.9, height: 330.2 },
};

// Inkjet borderless expansion compensation (HP Smart Tank 670 overspray factor)
export const OVERSPRAY_BLEED_COMPENSATION = 0.985;

export class PdfBuilderService {
  /**
   * Resolves bounding boxes for standard presets across 4R, 5R, A4, Letter, Long, and Legal formats.
   */
  resolvePresetBoxes(
    preset: string,
    zeroGap: boolean = true,
    paperSize: string = '4R',
    orientation: string = 'PORTRAIT'
  ): PhotoBoundingBox[] {
    const gap = zeroGap ? 0 : 2;
    const cleanPreset = preset.toUpperCase().replace(/_RUSH/g, '');

    const baseDim = PAPER_DIMENSIONS_MM[paperSize] || PAPER_DIMENSIONS_MM['4R'];
    const isLandscape = orientation === 'LANDSCAPE';
    const sheetW = isLandscape ? Math.max(baseDim.width, baseDim.height) : Math.min(baseDim.width, baseDim.height);
    const sheetH = isLandscape ? Math.min(baseDim.width, baseDim.height) : Math.max(baseDim.width, baseDim.height);

    if (cleanPreset === 'FULL_PAGE' || cleanPreset === 'FULL') {
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: sheetW, heightMm: sheetH, label: `Full ${paperSize} Photo` }
      ];
    }

    if (cleanPreset === 'GRID_2X2') {
      const w = (sheetW - gap) / 2;
      const h = (sheetH - gap) / 2;
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 1' },
        { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 2' },
        { id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 3' },
        { id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 4' },
      ];
    }

    if (cleanPreset === 'GRID_2X3') {
      const cols = isLandscape ? 3 : 2;
      const rows = isLandscape ? 2 : 3;
      const w = (sheetW - (cols - 1) * gap) / cols;
      const h = (sheetH - (rows - 1) * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({
            id: `b${idx}`,
            xMm: c * (w + gap),
            yMm: r * (h + gap),
            widthMm: w,
            heightMm: h,
            label: `Photo ${idx++}`,
          });
        }
      }
      return boxes;
    }

    if (cleanPreset === 'SET_2') {
      // 6 pcs 2x2" (50.8mm x 50.8mm)
      const boxes: PhotoBoundingBox[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          boxes.push({
            xMm: c * 50.8 + (c > 0 ? gap : 0),
            yMm: r * 50.8 + (r > 0 ? gap : 0),
            widthMm: 50.8 - gap,
            heightMm: 50.8 - gap,
            label: '2x2 in',
          });
        }
      }
      return boxes;
    }

    if (cleanPreset === 'SET_3') {
      // 6 pcs 1.5x1.5" (38.1mm) + 4 pcs 1x1" (25.4mm)
      return [
        { xMm: 10, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { xMm: 52, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { xMm: 10, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { xMm: 52, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { xMm: 10, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { xMm: 52, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { xMm: 0, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
        { xMm: 25.4, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
        { xMm: 50.8, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
        { xMm: 76.2, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
      ];
    }

    if (cleanPreset === 'SET_4') {
      // 6 pcs Passport 35x45mm
      return [
        { xMm: 10, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport' },
        { xMm: 55, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport' },
        { xMm: 10, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport' },
        { xMm: 55, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport' },
        { xMm: 10, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport' },
        { xMm: 55, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport' },
      ];
    }

    if (cleanPreset === 'POLAROID') {
      // 4 pcs Polaroid Mini 2x3" (50.8mm x 76.2mm)
      return [
        { xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { xMm: 0, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { xMm: 50.8 + gap, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
      ];
    }

    // Default SET 1: 4x 2x2" (top) + 8x 1x1" (bottom)
    return [
      { xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      { xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      { xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      { xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      // 8x 1x1
      { xMm: 0, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 25.4 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 76.2 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 0, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 25.4 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 50.8 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { xMm: 76.2 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
    ];
  }

  /**
   * Pre-processes an image using Sharp: applies rotation, mirror flip, zoom, pan offset,
   * and aspect-ratio cropping tailored to the physical target slot dimensions.
   */
  async processImageForSlot(
    imageBuffer: Buffer,
    slotWidthMm: number,
    slotHeightMm: number,
    options: {
      scale?: number;
      offsetX?: number;
      offsetY?: number;
      rotation?: number;
      mirrorFlip?: boolean;
    }
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(imageBuffer, { failOnError: false });

      // 1. Rotation (90, 180, 270)
      if (options.rotation) {
        pipeline = pipeline.rotate(options.rotation);
      }

      // 2. Mirror Flip (Horizontal)
      if (options.mirrorFlip) {
        pipeline = pipeline.flop();
      }

      // Read metadata of rotated/flipped base image
      const transformedBuffer = await pipeline.toBuffer();
      const metaPipeline = sharp(transformedBuffer, { failOnError: false });
      const metadata = await metaPipeline.metadata();

      const imgWidth = metadata.width || 1200;
      const imgHeight = metadata.height || 1600;

      // 3. Compute slot aspect ratio & crop dimensions
      const slotAspect = slotWidthMm / slotHeightMm;
      const imgAspect = imgWidth / imgHeight;

      let baseCropWidth = imgWidth;
      let baseCropHeight = imgHeight;

      if (imgAspect > slotAspect) {
        // Image is wider than slot -> fit height, crop width
        baseCropHeight = imgHeight;
        baseCropWidth = imgHeight * slotAspect;
      } else {
        // Image is taller than slot -> fit width, crop height
        baseCropWidth = imgWidth;
        baseCropHeight = imgWidth / slotAspect;
      }

      // 4. Apply zoom scale (scale >= 0.5, scale <= 3.0)
      const scale = Math.min(3.0, Math.max(0.5, options.scale || 1.0));
      let cropWidth = baseCropWidth / scale;
      let cropHeight = baseCropHeight / scale;

      // Ensure crop box fits inside image boundaries
      if (cropWidth > imgWidth) {
        cropWidth = imgWidth;
        cropHeight = imgWidth / slotAspect;
      }
      if (cropHeight > imgHeight) {
        cropHeight = imgHeight;
        cropWidth = imgHeight * slotAspect;
      }

      // 5. Apply Pan Offset (offsetX & offsetY: percentage [-100, 100])
      const offX = Math.min(100, Math.max(-100, options.offsetX || 0));
      const offY = Math.min(100, Math.max(-100, options.offsetY || 0));

      const maxPanX = Math.max(0, imgWidth - cropWidth);
      const maxPanY = Math.max(0, imgHeight - cropHeight);

      // Pan offset normalized: 0 is center, -100 is left/top edge, +100 is right/bottom edge
      const centerX = (imgWidth - cropWidth) / 2;
      const centerY = (imgHeight - cropHeight) / 2;

      let left = centerX + (offX / 100) * (maxPanX / 2);
      let top = centerY + (offY / 100) * (maxPanY / 2);

      left = Math.max(0, Math.min(imgWidth - cropWidth, left));
      top = Math.max(0, Math.min(imgHeight - cropHeight, top));

      // 6. Extract precision viewport and encode high-DPI JPEG
      const cropRegion = {
        left: Math.round(left),
        top: Math.round(top),
        width: Math.max(1, Math.round(cropWidth)),
        height: Math.max(1, Math.round(cropHeight)),
      };

      return await sharp(transformedBuffer, { failOnError: false })
        .extract(cropRegion)
        .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
        .toBuffer();
    } catch (err: any) {
      console.warn('Sharp slot image crop fallback:', err.message);
      return imageBuffer;
    }
  }

  /**
   * Backward-compatible image preprocessor.
   */
  async processImageBuffer(
    imageBuffer: Buffer,
    options: {
      scale?: number;
      offsetX?: number;
      offsetY?: number;
      rotation?: number;
      mirrorFlip?: boolean;
    }
  ): Promise<Buffer> {
    return this.processImageForSlot(imageBuffer, 50.8, 50.8, options);
  }

  /**
   * Generates a high-precision 300+ DPI vector PDF matching physical layout coordinates.
   */
  async buildLayoutPdf(state: any, outputPath: string, jobId?: string): Promise<string> {
    const paperSize = state?.product?.paperSize || state?.layout?.paperSize || '4R';
    const orientation = state?.layout?.orientation || 'PORTRAIT';
    const isLandscape = orientation === 'LANDSCAPE';
    const baseDim = PAPER_DIMENSIONS_MM[paperSize] || PAPER_DIMENSIONS_MM['4R'];
    const sheetWMm = isLandscape ? Math.max(baseDim.width, baseDim.height) : Math.min(baseDim.width, baseDim.height);
    const sheetHMm = isLandscape ? Math.min(baseDim.width, baseDim.height) : Math.max(baseDim.width, baseDim.height);

    const pageWidthPt = sheetWMm * MM_TO_POINTS;
    const pageHeightPt = sheetHMm * MM_TO_POINTS;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // Resolve image file path
    let filePath: string | null = null;
    let mimeType: string = 'image/jpeg';

    if (state?.inputFiles && state.inputFiles.length > 0) {
      filePath = state.inputFiles[0].filePath;
      mimeType = state.inputFiles[0].mimeType || 'image/jpeg';
    } else if (jobId) {
      const db = getDatabase();
      const file = db.prepare('SELECT stored_path, mime_type FROM job_files WHERE job_id = ?').get(jobId) as any;
      if (file) {
        filePath = file.stored_path;
        mimeType = file.mime_type;
      }
    }

    const preset = state?.options?.preset || state?.layout?.presetId || 'SET_1';
    const zeroGap = state?.options?.zeroGap ?? state?.layout?.zeroGap ?? true;
    const showCutLines = state?.options?.showCutLines ?? state?.layout?.showCutLines ?? true;
    const mirrorFlip = state?.options?.mirror ?? state?.layout?.mirrorFlip ?? false;
    const cropTransform = state?.layout?.cropTransform || { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };

    // Determine bounding boxes
    let boxes: PhotoBoundingBox[] = [];
    if (state?.layout?.boxes && Array.isArray(state.layout.boxes) && state.layout.boxes.length > 0) {
      boxes = state.layout.boxes;
    } else {
      boxes = this.resolvePresetBoxes(preset, zeroGap, paperSize, orientation);
    }

    // Apply overspray bleed scaling factor if 4R borderless photo
    const scaleFactor = paperSize === '4R' ? OVERSPRAY_BLEED_COMPENSATION : 1.0;

    // Cache processed images by slot aspect ratio to minimize redundant Sharp executions
    const slotImageCache = new Map<string, any>();

    let rawImageBytes: Buffer | null = null;
    if (filePath) {
      try {
        rawImageBytes = await fs.readFile(filePath);
      } catch (err: any) {
        console.warn(`Could not read image file from ${filePath}:`, err.message);
      }
    }

    // Render boxes onto PDF page
    for (const box of boxes) {
      const xPt = box.xMm * scaleFactor * MM_TO_POINTS;
      const wPt = box.widthMm * scaleFactor * MM_TO_POINTS;
      const hPt = box.heightMm * scaleFactor * MM_TO_POINTS;
      const yPt = pageHeightPt - ((box.yMm * scaleFactor + box.heightMm * scaleFactor) * MM_TO_POINTS);

      let embeddedImage: any = null;

      if (rawImageBytes) {
        const aspectKey = `${box.widthMm.toFixed(1)}x${box.heightMm.toFixed(1)}`;
        if (slotImageCache.has(aspectKey)) {
          embeddedImage = slotImageCache.get(aspectKey);
        } else {
          try {
            const processedBytes = await this.processImageForSlot(rawImageBytes, box.widthMm, box.heightMm, {
              scale: cropTransform.scale,
              offsetX: cropTransform.offsetX,
              offsetY: cropTransform.offsetY,
              rotation: cropTransform.rotation,
              mirrorFlip,
            });

            embeddedImage = await pdfDoc.embedJpg(processedBytes);
            slotImageCache.set(aspectKey, embeddedImage);
          } catch (err: any) {
            console.warn(`Could not process/embed image for slot ${aspectKey}:`, err.message);
          }
        }
      }

      if (embeddedImage) {
        page.drawImage(embeddedImage, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
        });
      } else {
        // Fallback placeholder
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
        });
      }

      // Draw scissor cut lines if enabled
      if (showCutLines) {
        page.drawLine({
          start: { x: xPt - 2, y: yPt },
          end: { x: xPt + wPt + 2, y: yPt },
          thickness: 0.5,
          color: rgb(0.6, 0.6, 0.6),
          dashArray: [2, 2],
        });
        page.drawLine({
          start: { x: xPt - 2, y: yPt + hPt },
          end: { x: xPt + wPt + 2, y: yPt + hPt },
          thickness: 0.5,
          color: rgb(0.6, 0.6, 0.6),
          dashArray: [2, 2],
        });
        page.drawLine({
          start: { x: xPt, y: yPt - 2 },
          end: { x: xPt, y: yPt + hPt + 2 },
          thickness: 0.5,
          color: rgb(0.6, 0.6, 0.6),
          dashArray: [2, 2],
        });
        page.drawLine({
          start: { x: xPt + wPt, y: yPt - 2 },
          end: { x: xPt + wPt, y: yPt + hPt + 2 },
          thickness: 0.5,
          color: rgb(0.6, 0.6, 0.6),
          dashArray: [2, 2],
        });
      }
    }

    const targetDir = path.dirname(outputPath);
    await fs.mkdir(targetDir, { recursive: true });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }
}
