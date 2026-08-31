import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type PresetType =
  | 'FULL_PAGE'
  | 'GRID_2X2'
  | 'GRID_2X3'
  | 'SET_1'
  | 'SET_2'
  | 'SET_3'
  | 'SET_4'
  | 'CSC_PASSPORT'
  | 'POLAROID'
  | 'TILE_1'
  | 'TILE_2'
  | 'TILE_3'
  | 'TILE_4'
  | 'TILE_5'
  | 'TILE_6'
  | 'TILE_7'
  | 'TILE_8'
  | 'TILE_9'
  | 'TILE_10'
  | 'TILE_12'
  | 'TILE_16'
  | 'GRID_CUSTOM'
  | 'FREE';

export type LayoutMode = 'PRESET' | 'AUTO_TILE' | 'CUSTOM_GRID';
export type LayoutPaperSize = '4R' | '5R' | 'A4' | 'Letter' | 'Long' | 'Legal';
export type LayoutOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type NameplateStyle = 'CSC_OFFICIAL' | 'WHITE_BAR' | 'SIGNATURE_LINE';
export type FilterPreset = 'ORIGINAL' | 'BRIGHTEN' | 'CONTRAST' | 'BW' | 'VIVID';

export interface BoundingBox {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
  photoIndex?: number;
  isPassport?: boolean;
  nameplate?: {
    enabled: boolean;
    name: string;
    subtext?: string;
    position?: 'BOTTOM' | 'TOP';
    style?: NameplateStyle;
  };
}

export const PAPER_DIMENSIONS_MM: Record<LayoutPaperSize, { width: number; height: number; name: string }> = {
  '4R': { width: 101.6, height: 152.4, name: '4R Photo (4 x 6 in)' },
  '5R': { width: 127.0, height: 177.8, name: '5R Photo (5 x 7 in)' },
  'A4': { width: 210.0, height: 297.0, name: 'A4 Standard (210 x 297 mm)' },
  'Letter': { width: 215.9, height: 279.4, name: 'Short / Letter (8.5 x 11 in)' },
  'Long': { width: 215.9, height: 330.2, name: 'Long / Folio F4 (8.5 x 13 in)' },
  'Legal': { width: 215.9, height: 355.6, name: 'US Legal (8.5 x 14 in)' },
};

export const useLayoutStore = defineStore('layoutStore', () => {
  const layoutMode = ref<LayoutMode>('PRESET');
  const activePreset = ref<PresetType>('FULL_PAGE');
  const paperSize = ref<LayoutPaperSize>('A4');
  const orientation = ref<LayoutOrientation>('PORTRAIT');
  const showCutLines = ref(true);
  const zeroGap = ref(true);
  const mirrorFlip = ref(false);
  const photoUrl = ref<string | null>(null);
  const photoDimensions = ref<{ width: number; height: number }>({ width: 1200, height: 1600 });
  const zoomScale = ref(1.0);
  const panOffset = ref({ x: 0, y: 0 });
  const rotation = ref<0 | 90 | 180 | 270>(0);

  // Auto-Tiling & Dynamic N-Up State
  const tileCount = ref<number>(4);
  const customCols = ref<number>(2);
  const customRows = ref<number>(2);
  const tileStrategy = ref<'BALANCED' | 'HERO_GRID'>('BALANCED');

  // Official ID Nameplate Overlay State
  const nameplate = ref<{
    enabled: boolean;
    name: string;
    subtext: string;
    style: NameplateStyle;
    position: 'BOTTOM' | 'TOP';
  }>({
    enabled: false,
    name: '',
    subtext: '',
    style: 'CSC_OFFICIAL',
    position: 'BOTTOM',
  });

  // 1-Tap Photo Enhancements & Filters State
  const enhancement = ref<{
    brightness: number;
    contrast: number;
    grayscale: boolean;
    filterPreset: FilterPreset;
  }>({
    brightness: 0,
    contrast: 0,
    grayscale: false,
    filterPreset: 'ORIGINAL',
  });

  // Multi-Photo Slot Assignment Mapping (slotId -> photoIndex)
  const slotPhotoMapping = ref<Record<string, number>>({});

  // Dynamic sheet dimensions based on Paper Size & Orientation
  const sheetWidthMm = computed(() => {
    const base = PAPER_DIMENSIONS_MM[paperSize.value] || PAPER_DIMENSIONS_MM['A4'];
    return orientation.value === 'LANDSCAPE' ? Math.max(base.width, base.height) : Math.min(base.width, base.height);
  });

  const sheetHeightMm = computed(() => {
    const base = PAPER_DIMENSIONS_MM[paperSize.value] || PAPER_DIMENSIONS_MM['A4'];
    return orientation.value === 'LANDSCAPE' ? Math.min(base.width, base.height) : Math.max(base.width, base.height);
  });

  const boxes = computed<BoundingBox[]>(() => {
    const gap = zeroGap.value ? 0 : 2;
    const wSheet = sheetWidthMm.value;
    const hSheet = sheetHeightMm.value;
    const isLandscape = orientation.value === 'LANDSCAPE';

    let rawBoxes: BoundingBox[] = [];

    // 1. AUTO-TILE MODE (TILE_N)
    if (layoutMode.value === 'AUTO_TILE' || activePreset.value.startsWith('TILE_')) {
      const count = activePreset.value.startsWith('TILE_')
        ? parseInt(activePreset.value.replace('TILE_', ''), 10) || tileCount.value
        : tileCount.value;

      if (count === 1) {
        rawBoxes = [{ id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hSheet, label: `Full ${paperSize.value} Photo` }];
      } else if (count === 2) {
        if (isLandscape) {
          const w = (wSheet - gap) / 2;
          rawBoxes = [
            { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: hSheet, label: 'Photo 1' },
            { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: hSheet, label: 'Photo 2' },
          ];
        } else {
          const h = (hSheet - gap) / 2;
          rawBoxes = [
            { id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: h, label: 'Photo 1' },
            { id: 'b2', xMm: 0, yMm: h + gap, widthMm: wSheet, heightMm: h, label: 'Photo 2' },
          ];
        }
      } else if (count === 3) {
        if (isLandscape) {
          const w = (wSheet - 2 * gap) / 3;
          rawBoxes = [
            { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: hSheet, label: 'Photo 1' },
            { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: hSheet, label: 'Photo 2' },
            { id: 'b3', xMm: 2 * (w + gap), yMm: 0, widthMm: w, heightMm: hSheet, label: 'Photo 3' },
          ];
        } else {
          const hRow = (hSheet - gap) / 2;
          const wBot = (wSheet - gap) / 2;
          rawBoxes = [
            { id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hRow, label: 'Photo 1' },
            { id: 'b2', xMm: 0, yMm: hRow + gap, widthMm: wBot, heightMm: hRow, label: 'Photo 2' },
            { id: 'b3', xMm: wBot + gap, yMm: hRow + gap, widthMm: wBot, heightMm: hRow, label: 'Photo 3' },
          ];
        }
      } else if (count === 4) {
        const w = (wSheet - gap) / 2;
        const h = (hSheet - gap) / 2;
        rawBoxes = [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 1' },
          { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 2' },
          { id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 3' },
          { id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 4' },
        ];
      } else if (count === 5) {
        // 5-in-a-page uniform packing (Equal photo dimensions across all rows)
        if (tileStrategy.value === 'HERO_GRID') {
          const hHero = (hSheet - gap) * 0.45;
          const hGrid = (hSheet - gap) * 0.55;
          const wGrid = (wSheet - 3 * gap) / 4;
          rawBoxes.push({ id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hHero, label: 'Hero Photo' });
          for (let c = 0; c < 4; c++) {
            rawBoxes.push({
              id: `b${c + 2}`,
              xMm: c * (wGrid + gap),
              yMm: hHero + gap,
              widthMm: wGrid,
              heightMm: hGrid,
              label: `Photo ${c + 2}`,
            });
          }
        } else if (tileStrategy.value === 'BALANCED_2ROW') {
          // 2-Row Asymmetric
          const hRow = (hSheet - gap) / 2;
          const wTop = (wSheet - 2 * gap) / 3;
          const wBot = (wSheet - gap) / 2;
          for (let c = 0; c < 3; c++) {
            rawBoxes.push({ id: `b${c + 1}`, xMm: c * (wTop + gap), yMm: 0, widthMm: wTop, heightMm: hRow, label: `Photo ${c + 1}` });
          }
          for (let c = 0; c < 2; c++) {
            rawBoxes.push({ id: `b${c + 4}`, xMm: c * (wBot + gap), yMm: hRow + gap, widthMm: wBot, heightMm: hRow, label: `Photo ${c + 4}` });
          }
        } else if (isLandscape) {
          // Landscape: 2 rows of equal height, Row 1 (3 photos), Row 2 (2 photos centered)
          const cols = 3;
          const rows = 2;
          const w = (wSheet - 2 * gap) / cols;
          const h = (hSheet - gap) / rows;
          for (let c = 0; c < 3; c++) {
            rawBoxes.push({ id: `b${c + 1}`, xMm: c * (w + gap), yMm: 0, widthMm: w, heightMm: h, label: `Photo ${c + 1}` });
          }
          const row2StartX = (wSheet - (2 * w + gap)) / 2;
          for (let c = 0; c < 2; c++) {
            rawBoxes.push({ id: `b${c + 4}`, xMm: row2StartX + c * (w + gap), yMm: h + gap, widthMm: w, heightMm: h, label: `Photo ${c + 4}` });
          }
        } else {
          // Portrait Default: 3 rows of equal height, Row 1 (2 photos), Row 2 (2 photos), Row 3 (1 photo centered)
          const cols = 2;
          const rows = 3;
          const w = (wSheet - gap) / cols;
          const h = (hSheet - 2 * gap) / rows;
          rawBoxes.push({ id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Photo 1' });
          rawBoxes.push({ id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Photo 2' });
          rawBoxes.push({ id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Photo 3' });
          rawBoxes.push({ id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Photo 4' });
          const row3StartX = (wSheet - w) / 2;
          rawBoxes.push({ id: 'b5', xMm: row3StartX, yMm: 2 * (h + gap), widthMm: w, heightMm: h, label: 'Photo 5' });
        }
      } else if (count === 6) {
        const cols = isLandscape ? 3 : 2;
        const rows = isLandscape ? 2 : 3;
        const w = (wSheet - (cols - 1) * gap) / cols;
        const h = (hSheet - (rows - 1) * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else if (count === 7) {
        const hRow = (hSheet - gap) / 2;
        const wTop = (wSheet - 2 * gap) / 3;
        const wBot = (wSheet - 3 * gap) / 4;
        for (let c = 0; c < 3; c++) {
          rawBoxes.push({ id: `b${c + 1}`, xMm: c * (wTop + gap), yMm: 0, widthMm: wTop, heightMm: hRow, label: `Photo ${c + 1}` });
        }
        for (let c = 0; c < 4; c++) {
          rawBoxes.push({ id: `b${c + 4}`, xMm: c * (wBot + gap), yMm: hRow + gap, widthMm: wBot, heightMm: hRow, label: `Photo ${c + 4}` });
        }
      } else if (count === 8) {
        const cols = isLandscape ? 4 : 2;
        const rows = isLandscape ? 2 : 4;
        const w = (wSheet - (cols - 1) * gap) / cols;
        const h = (hSheet - (rows - 1) * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else if (count === 9) {
        const cols = 3;
        const rows = 3;
        const w = (wSheet - 2 * gap) / cols;
        const h = (hSheet - 2 * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else if (count === 10) {
        const cols = isLandscape ? 5 : 2;
        const rows = isLandscape ? 2 : 5;
        const w = (wSheet - (cols - 1) * gap) / cols;
        const h = (hSheet - (rows - 1) * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else if (count === 12) {
        const cols = isLandscape ? 4 : 3;
        const rows = isLandscape ? 3 : 4;
        const w = (wSheet - (cols - 1) * gap) / cols;
        const h = (hSheet - (rows - 1) * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else if (count === 16) {
        const cols = 4;
        const rows = 4;
        const w = (wSheet - 3 * gap) / cols;
        const h = (hSheet - 3 * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else {
        // Generic N auto-fit
        const aspect = wSheet / hSheet;
        let cols = Math.round(Math.sqrt(count * aspect));
        cols = Math.max(1, Math.min(count, cols));
        const rows = Math.ceil(count / cols);
        const w = (wSheet - (cols - 1) * gap) / cols;
        const h = (hSheet - (rows - 1) * gap) / rows;
        let cIdx = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (cIdx >= count) break;
            rawBoxes.push({
              id: `b${cIdx + 1}`,
              xMm: c * (w + gap),
              yMm: r * (h + gap),
              widthMm: w,
              heightMm: h,
              label: `Photo ${cIdx + 1}`,
            });
            cIdx++;
          }
        }
      }
    } else if (layoutMode.value === 'CUSTOM_GRID' || activePreset.value === 'GRID_CUSTOM') {
      // 2. CUSTOM GRID (Cols x Rows)
      const cols = Math.max(1, Math.min(8, customCols.value || 2));
      const rows = Math.max(1, Math.min(8, customRows.value || 2));
      const w = (wSheet - (cols - 1) * gap) / cols;
      const h = (hSheet - (rows - 1) * gap) / rows;
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
        }
      }
    } else {
      // 3. STANDARD PHOTO PRESETS
      if (activePreset.value === 'FULL_PAGE') {
        rawBoxes = [{ id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hSheet, label: `Full ${paperSize.value} Photo` }];
      } else if (activePreset.value === 'GRID_2X2') {
        const w = (wSheet - gap) / 2;
        const h = (hSheet - gap) / 2;
        rawBoxes = [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 1' },
          { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 2' },
          { id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 3' },
          { id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 4' },
        ];
      } else if (activePreset.value === 'GRID_2X3') {
        const cols = isLandscape ? 3 : 2;
        const rows = isLandscape ? 2 : 3;
        const w = (wSheet - (cols - 1) * gap) / cols;
        const h = (hSheet - (rows - 1) * gap) / rows;
        let idx = 1;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            rawBoxes.push({ id: `b${idx}`, xMm: c * (w + gap), yMm: r * (h + gap), widthMm: w, heightMm: h, label: `Photo ${idx++}` });
          }
        }
      } else if (activePreset.value === 'SET_1') {
        rawBoxes = [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b3', xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b4', xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b5', xMm: 0, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b6', xMm: 25.4 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b7', xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b8', xMm: 76.2 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b9', xMm: 0, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b10', xMm: 25.4 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b11', xMm: 50.8 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
          { id: 'b12', xMm: 76.2 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        ];
      } else if (activePreset.value === 'SET_2') {
        rawBoxes = [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b3', xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b4', xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b5', xMm: 0, yMm: 101.6 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
          { id: 'b6', xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        ];
      } else if (activePreset.value === 'SET_3') {
        rawBoxes = [
          { id: 'b1', xMm: 10, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
          { id: 'b2', xMm: 52, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
          { id: 'b3', xMm: 10, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
          { id: 'b4', xMm: 52, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
          { id: 'b5', xMm: 10, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
          { id: 'b6', xMm: 52, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
          { id: 'b7', xMm: 0, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
          { id: 'b8', xMm: 25.4, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
          { id: 'b9', xMm: 50.8, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
          { id: 'b10', xMm: 76.2, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
        ];
      } else if (activePreset.value === 'SET_4') {
        rawBoxes = [
          { id: 'b1', xMm: 10, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
          { id: 'b2', xMm: 55, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
          { id: 'b3', xMm: 10, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
          { id: 'b4', xMm: 55, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
          { id: 'b5', xMm: 10, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
          { id: 'b6', xMm: 55, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
        ];
      } else if (activePreset.value === 'CSC_PASSPORT') {
        // 4 PCS OFFICIAL CSC PASSPORT PACKAGE (35x45mm with CSC Nametag on 4R sheet)
        const x1 = 10.8;
        const x2 = 55.8;
        const y1 = 22.2;
        const y2 = 79.2;
        rawBoxes = [
          { id: 'b1', xMm: x1, yMm: y1, widthMm: 35, heightMm: 45, label: 'CSC Passport 1', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
          { id: 'b2', xMm: x2, yMm: y1, widthMm: 35, heightMm: 45, label: 'CSC Passport 2', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
          { id: 'b3', xMm: x1, yMm: y2, widthMm: 35, heightMm: 45, label: 'CSC Passport 3', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
          { id: 'b4', xMm: x2, yMm: y2, widthMm: 35, heightMm: 45, label: 'CSC Passport 4', isPassport: true, nameplate: { enabled: true, style: 'CSC_OFFICIAL' } },
        ];
      } else if (activePreset.value === 'POLAROID') {
        rawBoxes = [
          { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
          { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
          { id: 'b3', xMm: 0, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
          { id: 'b4', xMm: 50.8 + gap, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        ];
      } else {
        rawBoxes = [{ id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hSheet, label: `Full ${paperSize.value} Photo` }];
      }
    }

    // Attach Nameplate & Slot Photo Assignment to each bounding box
    return rawBoxes.map((b, idx) => {
      const isNameplateActive = b.nameplate?.enabled || nameplate.value.enabled;
      return {
        ...b,
        photoIndex: slotPhotoMapping.value[b.id] ?? (idx < 20 ? idx : 0),
        nameplate: isNameplateActive
          ? {
              enabled: true,
              name: nameplate.value.name,
              subtext: nameplate.value.subtext,
              style: nameplate.value.style || b.nameplate?.style || 'CSC_OFFICIAL',
            }
          : undefined,
      };
    });
  });

  // Actions
  function setZoom(scale: number) {
    zoomScale.value = Math.min(3.0, Math.max(0.5, Number(scale.toFixed(2))));
  }

  function setPan(x: number, y: number) {
    panOffset.value = {
      x: Math.min(100, Math.max(-100, Number(x.toFixed(1)))),
      y: Math.min(100, Math.max(-100, Number(y.toFixed(1)))),
    };
  }

  function nudgePan(dx: number, dy: number) {
    setPan(panOffset.value.x + dx, panOffset.value.y + dy);
  }

  function rotateClockwise() {
    const next: Record<number, 0 | 90 | 180 | 270> = {
      0: 90,
      90: 180,
      180: 270,
      270: 0,
    };
    rotation.value = next[rotation.value] || 0;
  }

  function toggleOrientation() {
    orientation.value = orientation.value === 'PORTRAIT' ? 'LANDSCAPE' : 'PORTRAIT';
  }

  function autoOrient(imgWidth: number, imgHeight: number) {
    if (imgWidth > imgHeight) {
      orientation.value = 'LANDSCAPE';
    } else {
      orientation.value = 'PORTRAIT';
    }
  }

  function resetTransform() {
    zoomScale.value = 1.0;
    panOffset.value = { x: 0, y: 0 };
    rotation.value = 0;
    mirrorFlip.value = false;
  }

  function setTileCount(count: number) {
    tileCount.value = count;
    layoutMode.value = 'AUTO_TILE';
    activePreset.value = `TILE_${count}` as PresetType;
  }

  function setCustomGrid(cols: number, rows: number) {
    customCols.value = Math.max(1, Math.min(8, cols));
    customRows.value = Math.max(1, Math.min(8, rows));
    layoutMode.value = 'CUSTOM_GRID';
    activePreset.value = 'GRID_CUSTOM';
  }

  function formatNameUpperCase() {
    nameplate.value.name = nameplate.value.name.toUpperCase();
    nameplate.value.subtext = nameplate.value.subtext.toUpperCase();
  }

  function applyFilterPreset(preset: FilterPreset) {
    enhancement.value.filterPreset = preset;
    if (preset === 'BW') {
      enhancement.value.grayscale = true;
      enhancement.value.brightness = 0;
      enhancement.value.contrast = 10;
    } else if (preset === 'BRIGHTEN') {
      enhancement.value.grayscale = false;
      enhancement.value.brightness = 15;
      enhancement.value.contrast = 5;
    } else if (preset === 'CONTRAST') {
      enhancement.value.grayscale = false;
      enhancement.value.brightness = 0;
      enhancement.value.contrast = 20;
    } else if (preset === 'VIVID') {
      enhancement.value.grayscale = false;
      enhancement.value.brightness = 5;
      enhancement.value.contrast = 10;
    } else {
      enhancement.value.grayscale = false;
      enhancement.value.brightness = 0;
      enhancement.value.contrast = 0;
    }
  }

  function resetEnhancements() {
    enhancement.value = {
      brightness: 0,
      contrast: 0,
      grayscale: false,
      filterPreset: 'ORIGINAL',
    };
  }

  function assignSlotPhoto(slotId: string, photoIdx: number) {
    slotPhotoMapping.value[slotId] = photoIdx;
  }

  // Effective DPI Calculation
  const effectiveDpi = computed(() => {
    if (!photoDimensions.value.width || !photoDimensions.value.height) return 300;
    const targetInches = sheetWidthMm.value / 25.4;
    const baseDpi = photoDimensions.value.width / Math.max(1, targetInches);
    const actualDpi = baseDpi / Math.max(0.5, zoomScale.value);
    return Math.round(actualDpi);
  });

  const dpiQuality = computed<'CRISP' | 'ACCEPTABLE' | 'BLURRY'>(() => {
    if (effectiveDpi.value >= 250) return 'CRISP';
    if (effectiveDpi.value >= 150) return 'ACCEPTABLE';
    return 'BLURRY';
  });

  // CSS Filter string for instant live canvas preview
  const canvasCssFilter = computed(() => {
    const filters: string[] = [];
    if (enhancement.value.grayscale || enhancement.value.filterPreset === 'BW') {
      filters.push('grayscale(100%)');
    }
    if (enhancement.value.brightness !== 0) {
      filters.push(`brightness(${100 + enhancement.value.brightness}%)`);
    }
    if (enhancement.value.contrast !== 0) {
      filters.push(`contrast(${100 + enhancement.value.contrast}%)`);
    }
    if (enhancement.value.filterPreset === 'VIVID') {
      filters.push('saturate(130%)');
    }
    return filters.length > 0 ? filters.join(' ') : 'none';
  });

  return {
    layoutMode,
    activePreset,
    paperSize,
    orientation,
    showCutLines,
    zeroGap,
    mirrorFlip,
    photoUrl,
    photoDimensions,
    zoomScale,
    panOffset,
    rotation,
    tileCount,
    customCols,
    customRows,
    tileStrategy,
    nameplate,
    enhancement,
    slotPhotoMapping,
    sheetWidthMm,
    sheetHeightMm,
    boxes,
    setZoom,
    setPan,
    nudgePan,
    rotateClockwise,
    toggleOrientation,
    autoOrient,
    resetTransform,
    setTileCount,
    setCustomGrid,
    formatNameUpperCase,
    applyFilterPreset,
    resetEnhancements,
    assignSlotPhoto,
    effectiveDpi,
    dpiQuality,
    canvasCssFilter,
  };
});
