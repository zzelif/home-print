import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { getDatabase } from '../db/database';
import { PhotoBoundingBox, SharedPrintJobState } from '../nodes/types';
import { sanitizeWinAnsi } from './document-converter.service';

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

export interface LayoutResolutionOptions {
  tileCount?: number;
  customGrid?: { cols: number; rows: number };
  tileStrategy?: 'BALANCED' | 'BALANCED_2ROW' | 'HERO_GRID' | 'UNIFORM';
}

export class PdfBuilderService {
  /**
   * Resolves bounding boxes for standard presets, N-up tiling, and custom grids
   * across 4R, 5R, A4, Letter, Long, and Legal formats.
   */
  resolvePresetBoxes(
    preset: string,
    zeroGap: boolean = true,
    paperSize: string = '4R',
    orientation: string = 'PORTRAIT',
    options?: LayoutResolutionOptions
  ): PhotoBoundingBox[] {
    const gap = zeroGap ? 0 : 2;
    const cleanPreset = (preset || 'FULL_PAGE').toUpperCase().replace(/_RUSH/g, '');

    const baseDim = PAPER_DIMENSIONS_MM[paperSize] || PAPER_DIMENSIONS_MM['4R'];
    const isLandscape = orientation === 'LANDSCAPE';
    const sheetW = isLandscape ? Math.max(baseDim.width, baseDim.height) : Math.min(baseDim.width, baseDim.height);
    const sheetH = isLandscape ? Math.min(baseDim.width, baseDim.height) : Math.max(baseDim.width, baseDim.height);

    // 1. FULL PAGE PHOTO
    if (cleanPreset === 'FULL_PAGE' || cleanPreset === 'FULL' || cleanPreset === 'TILE_1') {
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: sheetW, heightMm: sheetH, label: `Full ${paperSize} Photo` }
      ];
    }

    // 2. 2-IN-A-PAGE (HALF SHEET)
    if (cleanPreset === 'TILE_2') {
      if (isLandscape) {
        // 2 columns side by side
        const w = (sheetW - gap) / 2;
        return [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: sheetH, label: 'Photo 1' },
          { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: sheetH, label: 'Photo 2' },
        ];
      } else {
        // 2 rows top and bottom
        const h = (sheetH - gap) / 2;
        return [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: sheetW, heightMm: h, label: 'Photo 1' },
          { id: 'b2', xMm: 0, yMm: h + gap, widthMm: sheetW, heightMm: h, label: 'Photo 2' },
        ];
      }
    }

    // 3. 3-IN-A-PAGE
    if (cleanPreset === 'TILE_3') {
      if (isLandscape) {
        const w = (sheetW - 2 * gap) / 3;
        return [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: sheetH, label: 'Photo 1' },
          { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: sheetH, label: 'Photo 2' },
          { id: 'b3', xMm: 2 * (w + gap), yMm: 0, widthMm: w, heightMm: sheetH, label: 'Photo 3' },
        ];
      } else {
        // 1 Top Hero + 2 Bottom
        const hTop = (sheetH - gap) / 2;
        const hBot = (sheetH - gap) / 2;
        const wBot = (sheetW - gap) / 2;
        return [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: sheetW, heightMm: hTop, label: 'Photo 1' },
          { id: 'b2', xMm: 0, yMm: hTop + gap, widthMm: wBot, heightMm: hBot, label: 'Photo 2' },
          { id: 'b3', xMm: wBot + gap, yMm: hTop + gap, widthMm: wBot, heightMm: hBot, label: 'Photo 3' },
        ];
      }
    }

    // 4. 2x2 QUADRANTS (4 EQUAL PHOTOS)
    if (cleanPreset === 'GRID_2X2' || cleanPreset === 'TILE_4') {
      const w = (sheetW - gap) / 2;
      const h = (sheetH - gap) / 2;
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 1' },
        { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 2' },
        { id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 3' },
        { id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 4' },
      ];
    }

    // 5. 5-IN-A-PAGE (ASYMMETRIC PACKING)
    // 5. 5-IN-A-PAGE (UNIFORM EQUAL DIMENSIONS ACROSS ALL ROWS)
    if (cleanPreset === 'TILE_5') {
      const strategy = options?.tileStrategy || 'BALANCED';
      const boxes: PhotoBoundingBox[] = [];

      if (strategy === 'HERO_GRID') {
        // 1 Hero Top (100% width, 45% height) + 4 Grid Bottom (25% width each, 55% height)
        const hHero = (sheetH - gap) * 0.45;
        const hGrid = (sheetH - gap) * 0.55;
        const wGrid = (sheetW - 3 * gap) / 4;

        boxes.push({ id: 'b1', xMm: 0, yMm: 0, widthMm: sheetW, heightMm: hHero, label: 'Hero Photo' });
        for (let c = 0; c < 4; c++) {
          boxes.push({
            id: `b${c + 2}`,
            xMm: c * (wGrid + gap),
            yMm: hHero + gap,
            widthMm: wGrid,
            heightMm: hGrid,
            label: `Photo ${c + 2}`,
          });
        }
        return boxes;
      }

      if (strategy === 'BALANCED_2ROW') {
        // 2-Row Asymmetric: Row 1 has 3 photos, Row 2 has 2 photos
        const hRow = (sheetH - gap) / 2;
        const wTop = (sheetW - 2 * gap) / 3;
        const wBot = (sheetW - gap) / 2;
        for (let c = 0; c < 3; c++) {
          boxes.push({ id: `b${c + 1}`, xMm: c * (wTop + gap), yMm: 0, widthMm: wTop, heightMm: hRow, label: `Photo ${c + 1}` });
        }
        for (let c = 0; c < 2; c++) {
          boxes.push({ id: `b${c + 4}`, xMm: c * (wBot + gap), yMm: hRow + gap, widthMm: wBot, heightMm: hRow, label: `Photo ${c + 4}` });
        }
        return boxes;
      }

      // DEFAULT: 3-ROW UNIFORM PACKING (All 5 photos have identical dimensions & aspect ratio)
      if (isLandscape) {
        // Landscape: 2 rows of equal height, Row 1 has 3 photos, Row 2 has 2 photos centered with same width/height
        const cols = 3;
        const rows = 2;
        const w = (sheetW - 2 * gap) / cols;
        const h = (sheetH - gap) / rows;
        // Row 1 (3 photos)
        for (let c = 0; c < 3; c++) {
          boxes.push({ id: `b${c + 1}`, xMm: c * (w + gap), yMm: 0, widthMm: w, heightMm: h, label: `Photo ${c + 1}` });
        }
        // Row 2 (2 photos centered)
        const row2StartX = (sheetW - (2 * w + gap)) / 2;
        for (let c = 0; c < 2; c++) {
          boxes.push({ id: `b${c + 4}`, xMm: row2StartX + c * (w + gap), yMm: h + gap, widthMm: w, heightMm: h, label: `Photo ${c + 4}` });
        }
      } else {
        // Portrait: 3 rows of equal height, Row 1 (2 photos), Row 2 (2 photos), Row 3 (1 photo centered)
        const cols = 2;
        const rows = 3;
        const w = (sheetW - gap) / cols;
        const h = (sheetH - 2 * gap) / rows;
        // Row 1 (2 photos)
        boxes.push({ id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Photo 1' });
        boxes.push({ id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Photo 2' });
        // Row 2 (2 photos)
        boxes.push({ id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Photo 3' });
        boxes.push({ id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Photo 4' });
        // Row 3 (1 photo centered)
        const row3StartX = (sheetW - w) / 2;
        boxes.push({ id: 'b5', xMm: row3StartX, yMm: 2 * (h + gap), widthMm: w, heightMm: h, label: 'Photo 5' });
      }
      return boxes;
    }

    // 6. 2x3 WALLET PRINTS (6 EQUAL PHOTOS)
    if (cleanPreset === 'GRID_2X3' || cleanPreset === 'TILE_6') {
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

    // 7. 7-IN-A-PAGE (Row 1: 3 photos + Row 2: 4 photos)
    if (cleanPreset === 'TILE_7') {
      const hRow = (sheetH - gap) / 2;
      const wTop = (sheetW - 2 * gap) / 3;
      const wBot = (sheetW - 3 * gap) / 4;
      const boxes: PhotoBoundingBox[] = [];
      for (let c = 0; c < 3; c++) {
        boxes.push({ id: `b${c + 1}`, xMm: c * (wTop + gap), yMm: 0, widthMm: wTop, heightMm: hRow, label: `Photo ${c + 1}` });
      }
      for (let c = 0; c < 4; c++) {
        boxes.push({ id: `b${c + 4}`, xMm: c * (wBot + gap), yMm: hRow + gap, widthMm: wBot, heightMm: hRow, label: `Photo ${c + 4}` });
      }
      return boxes;
    }

    // 8. 8-IN-A-PAGE
    if (cleanPreset === 'TILE_8') {
      const cols = isLandscape ? 4 : 2;
      const rows = isLandscape ? 2 : 4;
      const w = (sheetW - (cols - 1) * gap) / cols;
      const h = (sheetH - (rows - 1) * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
      return boxes;
    }

    // 9. 9-IN-A-PAGE (3x3 Grid)
    if (cleanPreset === 'TILE_9') {
      const cols = 3;
      const rows = 3;
      const w = (sheetW - 2 * gap) / cols;
      const h = (sheetH - 2 * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
      return boxes;
    }

    // 10. 10-IN-A-PAGE
    if (cleanPreset === 'TILE_10') {
      const cols = isLandscape ? 5 : 2;
      const rows = isLandscape ? 2 : 5;
      const w = (sheetW - (cols - 1) * gap) / cols;
      const h = (sheetH - (rows - 1) * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
      return boxes;
    }

    // 12. 12-IN-A-PAGE
    if (cleanPreset === 'TILE_12') {
      const cols = isLandscape ? 4 : 3;
      const rows = isLandscape ? 3 : 4;
      const w = (sheetW - (cols - 1) * gap) / cols;
      const h = (sheetH - (rows - 1) * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
      return boxes;
    }

    // 16. 16-IN-A-PAGE
    if (cleanPreset === 'TILE_16') {
      const cols = 4;
      const rows = 4;
      const w = (sheetW - 3 * gap) / cols;
      const h = (sheetH - 3 * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
      return boxes;
    }

    // CUSTOM GRID (Cols x Rows)
    if (cleanPreset === 'GRID_CUSTOM' && options?.customGrid) {
      const cols = Math.max(1, Math.min(8, options.customGrid.cols || 2));
      const rows = Math.max(1, Math.min(8, options.customGrid.rows || 2));
      const w = (sheetW - (cols - 1) * gap) / cols;
      const h = (sheetH - (rows - 1) * gap) / rows;
      const boxes: PhotoBoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          boxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
      return boxes;
    }

    // GENERIC TILE_N (e.g. TILE_14, TILE_20)
    const matchTile = cleanPreset.match(/^TILE_(\d+)$/);
    if (matchTile) {
      const n = parseInt(matchTile[1], 10);
      if (n > 0 && n <= 30) {
        const aspect = sheetW / sheetH;
        let cols = Math.round(Math.sqrt(n * aspect));
        cols = Math.max(1, Math.min(n, cols));
        const rows = Math.ceil(n / cols);
        const w = (sheetW - (cols - 1) * gap) / cols;
        const h = (sheetH - (rows - 1) * gap) / rows;
        const boxes: PhotoBoundingBox[] = [];
        let count = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (count >= n) break;
            boxes.push({
              id: `b${count + 1}`,
              xMm: c * (w + gap),
              yMm: r * (h + gap),
              widthMm: w,
              heightMm: h,
              label: `Photo ${count + 1}`,
            });
            count++;
          }
        }
        return boxes;
      }
    }

    // STANDARD ID PRESETS
    if (cleanPreset === 'SET_2' || cleanPreset === 'SET_2_2X2') {
      // 6 pcs 2x2" (50.8mm x 50.8mm)
      const boxes: PhotoBoundingBox[] = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 2; c++) {
          boxes.push({
            id: `b${r * 2 + c + 1}`,
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

    if (cleanPreset === 'SET_3' || cleanPreset === 'SET_3_COMBO') {
      // 6 pcs 1.5x1.5" (38.1mm) + 4 pcs 1x1" (25.4mm)
      return [
        { id: 'b1', xMm: 10, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b2', xMm: 52, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b3', xMm: 10, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b4', xMm: 52, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b5', xMm: 10, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b6', xMm: 52, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b7', xMm: 0, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
        { id: 'b8', xMm: 25.4, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
        { id: 'b9', xMm: 50.8, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
        { id: 'b10', xMm: 76.2, yMm: 130, widthMm: 25.4 - gap, heightMm: 22.0 - gap, label: '1x1 in' },
      ];
    }

    if (cleanPreset === 'SET_4' || cleanPreset === 'SET_4_PASSPORT') {
      // 6 pcs Passport 35x45mm
      return [
        { id: 'b1', xMm: 10, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport', isPassport: true },
        { id: 'b2', xMm: 55, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport', isPassport: true },
        { id: 'b3', xMm: 10, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport', isPassport: true },
        { id: 'b4', xMm: 55, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport', isPassport: true },
        { id: 'b5', xMm: 10, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport', isPassport: true },
        { id: 'b6', xMm: 55, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport', isPassport: true },
      ];
    }

    // 4 PCS CSC PASSPORT PACKAGE (OFFICIAL CIVIL SERVICE 35x45mm SPEC)
    if (cleanPreset === 'CSC_PASSPORT' || cleanPreset === 'CSC' || cleanPreset === 'SET_CSC') {
      // 4 pcs Official Civil Service Passport Size (35mm x 45mm) on 4R Photo Paper (101.6mm x 152.4mm)
      // Centered 2x2 grid with 10.8mm side margins and 8mm gap
      const x1 = 10.8;
      const x2 = 55.8;
      const y1 = 22.2;
      const y2 = 79.2;
      return [
        { id: 'b1', xMm: x1, yMm: y1, widthMm: 35, heightMm: 45, label: 'CSC Passport 1', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
        { id: 'b2', xMm: x2, yMm: y1, widthMm: 35, heightMm: 45, label: 'CSC Passport 2', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
        { id: 'b3', xMm: x1, yMm: y2, widthMm: 35, heightMm: 45, label: 'CSC Passport 3', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
        { id: 'b4', xMm: x2, yMm: y2, widthMm: 35, heightMm: 45, label: 'CSC Passport 4', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
      ];
    }

    if (cleanPreset === 'POLAROID') {
      // 4 pcs Polaroid Mini 2x3" (50.8mm x 76.2mm)
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { id: 'b3', xMm: 0, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { id: 'b4', xMm: 50.8 + gap, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
      ];
    }

    // Default SET 1: 4x 2x2" (top) + 8x 1x1" (bottom)
    return [
      { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      { id: 'b3', xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      { id: 'b4', xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      // 8x 1x1
      { id: 'b5', xMm: 0, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b6', xMm: 25.4 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b7', xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b8', xMm: 76.2 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b9', xMm: 0, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b10', xMm: 25.4 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b11', xMm: 50.8 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      { id: 'b12', xMm: 76.2 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
    ];
  }

  /**
   * Pre-processes an image using Sharp: applies rotation, mirror flip, zoom, pan offset,
   * aspect-ratio cropping, and 1-tap photo enhancements (brightness, contrast, B&W/grayscale).
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
      enhancement?: {
        brightness?: number;
        contrast?: number;
        grayscale?: boolean;
        filterPreset?: string;
      };
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

      // 3. Quick Photo Enhancements & Filters
      const enh = options.enhancement;
      if (enh) {
        if (enh.grayscale || enh.filterPreset === 'BW') {
          pipeline = pipeline.grayscale();
        }

        if (enh.filterPreset === 'BRIGHTEN') {
          pipeline = pipeline.modulate({ brightness: 1.12 });
        } else if (enh.filterPreset === 'CONTRAST') {
          pipeline = pipeline.linear(1.15, -(128 * 0.15));
        } else if (enh.filterPreset === 'VIVID') {
          pipeline = pipeline.modulate({ brightness: 1.05, saturation: 1.25 });
        }

        // Custom Numeric Brightness & Contrast
        if (enh.brightness && enh.brightness !== 0) {
          const b = Math.max(0.5, Math.min(2.0, 1 + enh.brightness / 100));
          pipeline = pipeline.modulate({ brightness: b });
        }
        if (enh.contrast && enh.contrast !== 0) {
          const c = Math.max(0.5, Math.min(2.0, 1 + enh.contrast / 100));
          pipeline = pipeline.linear(c, -(128 * (c - 1)));
        }
      }

      // Read metadata of transformed base image
      const transformedBuffer = await pipeline.toBuffer();
      const metaPipeline = sharp(transformedBuffer, { failOnError: false });
      const metadata = await metaPipeline.metadata();

      const imgWidth = metadata.width || 1200;
      const imgHeight = metadata.height || 1600;

      // 4. Compute slot aspect ratio & crop dimensions
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

      // 5. Apply zoom scale (scale >= 0.5, scale <= 3.0)
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

      // 6. Apply Pan Offset (offsetX & offsetY: percentage [-100, 100])
      const offX = Math.min(100, Math.max(-100, options.offsetX || 0));
      const offY = Math.min(100, Math.max(-100, options.offsetY || 0));

      const maxPanX = Math.max(0, imgWidth - cropWidth);
      const maxPanY = Math.max(0, imgHeight - cropHeight);

      const centerX = (imgWidth - cropWidth) / 2;
      const centerY = (imgHeight - cropHeight) / 2;

      let left = centerX + (offX / 100) * (maxPanX / 2);
      let top = centerY + (offY / 100) * (maxPanY / 2);

      left = Math.max(0, Math.min(imgWidth - cropWidth, left));
      top = Math.max(0, Math.min(imgHeight - cropHeight, top));

      // 7. Extract precision viewport and encode high-DPI JPEG
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
   * Generates a high-precision 300+ DPI vector PDF matching physical layout coordinates,
   * N-up packing, official ID nameplates, and image enhancements.
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

    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Resolve image file path(s)
    const fileBuffers: Buffer[] = [];

    if (state?.inputFiles && state.inputFiles.length > 0) {
      for (const file of state.inputFiles) {
        if (file.filePath) {
          try {
            const buf = await fs.readFile(file.filePath);
            fileBuffers.push(buf);
          } catch (err: any) {
            console.warn(`Could not read input file ${file.filePath}:`, err.message);
          }
        }
      }
    } else if (jobId) {
      const db = getDatabase();
      const files = db.prepare('SELECT stored_path FROM job_files WHERE job_id = ?').all(jobId) as any[];
      for (const file of files) {
        if (file.stored_path) {
          try {
            const buf = await fs.readFile(file.stored_path);
            fileBuffers.push(buf);
          } catch (err: any) {
            console.warn(`Could not read job file ${file.stored_path}:`, err.message);
          }
        }
      }
    }

    const preset = state?.options?.preset || state?.layout?.presetId || 'SET_1';
    const zeroGap = state?.options?.zeroGap ?? state?.layout?.zeroGap ?? true;
    const showCutLines = state?.options?.showCutLines ?? state?.layout?.showCutLines ?? true;
    const mirrorFlip = state?.options?.mirror ?? state?.layout?.mirrorFlip ?? false;
    const cropTransform = state?.layout?.cropTransform || { scale: 1.0, offsetX: 0, offsetY: 0, rotation: 0 };
    const enhancement = state?.layout?.enhancement;
    const nameplateConfig = state?.layout?.nameplateConfig;

    // Determine bounding boxes
    let boxes: PhotoBoundingBox[] = [];
    if (state?.layout?.boxes && Array.isArray(state.layout.boxes) && state.layout.boxes.length > 0) {
      boxes = state.layout.boxes;
    } else {
      boxes = this.resolvePresetBoxes(preset, zeroGap, paperSize, orientation, {
        tileCount: state?.layout?.tileCount,
        customGrid: state?.layout?.customGrid,
        tileStrategy: state?.layout?.tileStrategy,
      });
    }

    // Apply overspray bleed scaling factor if 4R borderless photo
    const scaleFactor = paperSize === '4R' ? OVERSPRAY_BLEED_COMPENSATION : 1.0;

    // Cache processed images by slot aspect ratio and image index
    const slotImageCache = new Map<string, any>();

    // Render boxes onto PDF page
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      const xPt = box.xMm * scaleFactor * MM_TO_POINTS;
      const wPt = box.widthMm * scaleFactor * MM_TO_POINTS;
      const hPt = box.heightMm * scaleFactor * MM_TO_POINTS;
      const yPt = pageHeightPt - ((box.yMm * scaleFactor + box.heightMm * scaleFactor) * MM_TO_POINTS);

      // Select image for slot (supports multi-image order mapping)
      const photoIdx = box.photoIndex !== undefined && box.photoIndex < fileBuffers.length
        ? box.photoIndex
        : (fileBuffers.length > 1 && i < fileBuffers.length ? i : 0);

      const rawBytes = fileBuffers[photoIdx] || fileBuffers[0];
      let embeddedImage: any = null;

      if (rawBytes) {
        const aspectKey = `${photoIdx}_${box.widthMm.toFixed(1)}x${box.heightMm.toFixed(1)}_${JSON.stringify(enhancement || {})}`;
        if (slotImageCache.has(aspectKey)) {
          embeddedImage = slotImageCache.get(aspectKey);
        } else {
          try {
            const processedBytes = await this.processImageForSlot(rawBytes, box.widthMm, box.heightMm, {
              scale: cropTransform.scale,
              offsetX: cropTransform.offsetX,
              offsetY: cropTransform.offsetY,
              rotation: cropTransform.rotation,
              mirrorFlip,
              enhancement,
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

      // Draw Scissor Cut Lines
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

      // Draw Official Government / CSC ID Nameplate Overlay
      const isNameplateActive = box.nameplate?.enabled ?? nameplateConfig?.enabled ?? false;
      const rawName = box.nameplate?.name || nameplateConfig?.name || '';
      const rawSubtext = box.nameplate?.subtext || nameplateConfig?.subtext || '';
      const style = box.nameplate?.style || nameplateConfig?.style || 'CSC_OFFICIAL';

      if (isNameplateActive) {
        const cleanName = rawName.trim().length > 0 ? sanitizeWinAnsi(rawName.toUpperCase().trim()) : '';
        const cleanSub = rawSubtext ? sanitizeWinAnsi(rawSubtext.toUpperCase().trim()) : '';

        // Dynamic Nameplate Bar Geometry: CSC standard 9mm height on 45mm passport (~20% height, 0.3-0.5cm below chin)
        const barHeightMm = Math.min(12.0, Math.max(7.5, box.heightMm * (cleanSub ? 0.24 : 0.20)));
        const barHeightPt = barHeightMm * scaleFactor * MM_TO_POINTS;
        const barWidthPt = wPt;
        const barXPt = xPt;
        const barYPt = yPt; // Docked at the bottom edge in PDF space

        // 1. Draw solid white background with crisp border
        page.drawRectangle({
          x: barXPt,
          y: barYPt,
          width: barWidthPt,
          height: barHeightPt,
          color: rgb(1, 1, 1),
          borderColor: rgb(0.15, 0.15, 0.15),
          borderWidth: 0.75,
        });

        // 2. Handwriting Guidelines / Signature Line
        if (style === 'SIGNATURE_LINE' || style === 'CSC_OFFICIAL' || style === 'CSC_HANDWRITTEN') {
          page.drawLine({
            start: { x: barXPt + 4, y: barYPt + barHeightPt - (cleanName ? 3 : 5) },
            end: { x: barXPt + barWidthPt - 4, y: barYPt + barHeightPt - (cleanName ? 3 : 5) },
            thickness: 0.4,
            color: rgb(0.55, 0.55, 0.55),
            dashArray: [2, 2],
          });
        }

        // 3. Dynamic Auto-Scaling Typography (if applicant name is provided)
        if (cleanName) {
          const maxTextWidth = barWidthPt - 6; // 3pt padding on each side
          let nameFontSize = cleanSub ? 8.0 : 9.5;
          let nameWidth = boldFont.widthOfTextAtSize(cleanName, nameFontSize);

          if (nameWidth > maxTextWidth) {
            nameFontSize = Math.max(5.5, (maxTextWidth / nameWidth) * nameFontSize);
            nameWidth = boldFont.widthOfTextAtSize(cleanName, nameFontSize);
          }

          const nameX = barXPt + (barWidthPt - nameWidth) / 2;
          const nameY = cleanSub
            ? barYPt + (barHeightPt * 0.45)
            : barYPt + (barHeightPt - nameFontSize) / 2 + 1;

          page.drawText(cleanName, {
            x: nameX,
            y: nameY,
            size: nameFontSize,
            font: boldFont,
            color: rgb(0, 0, 0),
          });
        } else {
          // Blank manual handwriting label watermark/hint for applicant
          const hintText = 'NAME & SIGNATURE';
          const hintWidth = regularFont.widthOfTextAtSize(hintText, 5.0);
          const hintX = barXPt + (barWidthPt - hintWidth) / 2;
          page.drawText(hintText, {
            x: hintX,
            y: barYPt + 2,
            size: 5.0,
            font: regularFont,
            color: rgb(0.65, 0.65, 0.65),
          });
        }

        // 4. Optional Subtext (e.g. Civil Service Exam / PRC / School)
        if (cleanSub) {
          const maxTextWidth = barWidthPt - 6;
          let subFontSize = Math.min(6.5, (cleanName ? 8.0 : 7.0) * 0.8);
          let subWidth = regularFont.widthOfTextAtSize(cleanSub, subFontSize);

          if (subWidth > maxTextWidth) {
            subFontSize = Math.max(4.5, (maxTextWidth / subWidth) * subFontSize);
            subWidth = regularFont.widthOfTextAtSize(cleanSub, subFontSize);
          }

          const subX = barXPt + (barWidthPt - subWidth) / 2;
          const subY = barYPt + 2.5;

          page.drawText(cleanSub, {
            x: subX,
            y: subY,
            size: subFontSize,
            font: regularFont,
            color: rgb(0.25, 0.25, 0.25),
          });
        }
      }
    }

    const targetDir = path.dirname(outputPath);
    await fs.mkdir(targetDir, { recursive: true });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }
}
