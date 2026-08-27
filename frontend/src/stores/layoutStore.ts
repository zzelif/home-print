import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type PresetType = 'FULL_PAGE' | 'GRID_2X2' | 'GRID_2X3' | 'SET_1' | 'SET_2' | 'SET_3' | 'SET_4' | 'POLAROID' | 'FREE';
export type LayoutPaperSize = '4R' | '5R' | 'A4' | 'Letter' | 'Long' | 'Legal';
export type LayoutOrientation = 'PORTRAIT' | 'LANDSCAPE';

export interface BoundingBox {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
  isPassport?: boolean;
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

    if (activePreset.value === 'FULL_PAGE') {
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hSheet, label: `Full ${paperSize.value} Photo` }
      ];
    }

    if (activePreset.value === 'GRID_2X2') {
      const w = (wSheet - gap) / 2;
      const h = (hSheet - gap) / 2;
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 1' },
        { id: 'b2', xMm: w + gap, yMm: 0, widthMm: w, heightMm: h, label: 'Quadrant 2' },
        { id: 'b3', xMm: 0, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 3' },
        { id: 'b4', xMm: w + gap, yMm: h + gap, widthMm: w, heightMm: h, label: 'Quadrant 4' },
      ];
    }

    if (activePreset.value === 'GRID_2X3') {
      const cols = orientation.value === 'LANDSCAPE' ? 3 : 2;
      const rows = orientation.value === 'LANDSCAPE' ? 2 : 3;
      const w = (wSheet - (cols - 1) * gap) / cols;
      const h = (hSheet - (rows - 1) * gap) / rows;
      const result: BoundingBox[] = [];
      let idx = 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          result.push({
            id: `b${idx}`,
            xMm: c * (w + gap),
            yMm: r * (h + gap),
            widthMm: w,
            heightMm: h,
            label: `Photo ${idx++}`,
          });
        }
      }
      return result;
    }

    if (activePreset.value === 'SET_1') {
      // 4 pcs 2x2" (50.8mm) + 8 pcs 1x1" (25.4mm)
      return [
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
    }

    if (activePreset.value === 'SET_2') {
      // 6 pcs 2x2" (50.8mm)
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b3', xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b4', xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b5', xMm: 0, yMm: 101.6 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b6', xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      ];
    }

    if (activePreset.value === 'SET_3') {
      // 6 pcs 1.5x1.5" (38.1mm) + 4 pcs 1x1" (25.4mm)
      return [
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
    }

    if (activePreset.value === 'SET_4') {
      // 6 pcs Passport 35x45mm
      return [
        { id: 'b1', xMm: 10, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
        { id: 'b2', xMm: 55, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
        { id: 'b3', xMm: 10, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
        { id: 'b4', xMm: 55, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
        { id: 'b5', xMm: 10, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
        { id: 'b6', xMm: 55, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport (35x45mm)', isPassport: true },
      ];
    }

    if (activePreset.value === 'POLAROID') {
      // 4 pcs Polaroid Mini 2x3" (50.8mm x 76.2mm)
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { id: 'b3', xMm: 0, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
        { id: 'b4', xMm: 50.8 + gap, yMm: 76.2 + gap, widthMm: 50.8 - gap, heightMm: 76.2 - gap, label: 'Polaroid Mini' },
      ];
    }

    return [{ id: 'b1', xMm: 0, yMm: 0, widthMm: wSheet, heightMm: hSheet, label: `Full ${paperSize.value} Photo` }];
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

  return {
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
    effectiveDpi,
    dpiQuality,
  };
});
