import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type PresetType = 'SET_1' | 'SET_2' | 'SET_3' | 'SET_4' | 'POLAROID' | 'FREE';

export interface BoundingBox {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  label: string;
  isPassport?: boolean;
}

export const useLayoutStore = defineStore('layoutStore', () => {
  const activePreset = ref<PresetType>('SET_1');
  const paperSize = ref<'4R' | 'A4'>('4R');
  const showCutLines = ref(true);
  const zeroGap = ref(true);
  const mirrorFlip = ref(false);
  const photoUrl = ref<string | null>(null);
  const photoDimensions = ref<{ width: number; height: number }>({ width: 1200, height: 1600 });
  const zoomScale = ref(1.0);
  const panOffset = ref({ x: 0, y: 0 });

  // 4R Sheet is 101.6mm x 152.4mm
  const sheetWidthMm = 101.6;
  const sheetHeightMm = 152.4;

  const boxes = computed<BoundingBox[]>(() => {
    const gap = zeroGap.value ? 0 : 2; // 0mm when Zero Gap is on, 2mm when off

    if (activePreset.value === 'SET_1') {
      // 4 pcs 2x2" (50.8mm) + 8 pcs 1x1" (25.4mm)
      return [
        // Top 4 copies of 2x2 (Row 1)
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        // Top 4 copies of 2x2 (Row 2)
        { id: 'b3', xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b4', xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        // Bottom 8 copies of 1x1 (Row 3)
        { id: 'b5', xMm: 0, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        { id: 'b6', xMm: 25.4 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        { id: 'b7', xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        { id: 'b8', xMm: 76.2 + gap, yMm: 101.6 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        // Bottom 8 copies of 1x1 (Row 4)
        { id: 'b9', xMm: 0, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        { id: 'b10', xMm: 25.4 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        { id: 'b11', xMm: 50.8 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
        { id: 'b12', xMm: 76.2 + gap, yMm: 127.0 + gap, widthMm: 25.4 - gap, heightMm: 25.4 - gap, label: '1x1 in' },
      ];
    } else if (activePreset.value === 'SET_2') {
      // 6 pcs 2x2" (50.8mm)
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b2', xMm: 50.8 + gap, yMm: 0, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b3', xMm: 0, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b4', xMm: 50.8 + gap, yMm: 50.8 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b5', xMm: 0, yMm: 101.6 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
        { id: 'b6', xMm: 50.8 + gap, yMm: 101.6 + gap, widthMm: 50.8 - gap, heightMm: 50.8 - gap, label: '2x2 in' },
      ];
    } else if (activePreset.value === 'SET_3') {
      // 6 pcs 1.5x1.5" (38.1mm) + 4 pcs 1x1" (25.4mm)
      return [
        { id: 'b1', xMm: 10, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b2', xMm: 52, yMm: 5, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b3', xMm: 10, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b4', xMm: 52, yMm: 48, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b5', xMm: 10, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        { id: 'b6', xMm: 52, yMm: 90, widthMm: 38.1 - gap, heightMm: 38.1 - gap, label: '1.5x1.5 in' },
        // 4 of 1x1 at bottom
        { id: 'b7', xMm: 0, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
        { id: 'b8', xMm: 25.4, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
        { id: 'b9', xMm: 50.8, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
        { id: 'b10', xMm: 76.2, yMm: 130, widthMm: 25.4 - gap, heightMm: 22 - gap, label: '1x1 in' },
      ];
    } else if (activePreset.value === 'SET_4') {
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
    // Full 4R Photo
    return [{ id: 'b1', xMm: 0, yMm: 0, widthMm: 101.6, heightMm: 152.4, label: 'Full 4R Photo' }];
  });

  // Effective DPI Calculation
  const effectiveDpi = computed(() => {
    if (!photoDimensions.value.width) return 300;
    const dpi = photoDimensions.value.width / 2.0;
    return Math.round(dpi);
  });

  const dpiQuality = computed<'CRISP' | 'ACCEPTABLE' | 'BLURRY'>(() => {
    if (effectiveDpi.value >= 250) return 'CRISP';
    if (effectiveDpi.value >= 150) return 'ACCEPTABLE';
    return 'BLURRY';
  });

  return {
    activePreset,
    paperSize,
    showCutLines,
    zeroGap,
    mirrorFlip,
    photoUrl,
    photoDimensions,
    zoomScale,
    panOffset,
    sheetWidthMm,
    sheetHeightMm,
    boxes,
    effectiveDpi,
    dpiQuality,
  };
});
