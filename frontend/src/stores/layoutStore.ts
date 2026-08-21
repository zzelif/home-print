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
}

export const useLayoutStore = defineStore('layoutStore', () => {
  const activePreset = ref<PresetType>('SET_1');
  const paperSize = ref<'4R' | 'A4'>('4R');
  const showCutLines = ref(true);
  const zeroGap = ref(false);
  const mirrorFlip = ref(false);
  const photoUrl = ref<string | null>(null);
  const photoDimensions = ref<{ width: number; height: number }>({ width: 1200, height: 1600 });
  const zoomScale = ref(1.0);
  const panOffset = ref({ x: 0, y: 0 });

  // 4R Sheet is 101.6mm x 152.4mm
  const boxes = computed<BoundingBox[]>(() => {
    if (activePreset.value === 'SET_1') {
      // 4 pcs 2x2" (50.8mm) + 8 pcs 1x1" (25.4mm)
      return [
        // Top 4 copies of 2x2
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b2', xMm: 50.8, yMm: 0, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b3', xMm: 0, yMm: 50.8, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b4', xMm: 50.8, yMm: 50.8, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        // Bottom 8 copies of 1x1 (Row 1)
        { id: 'b5', xMm: 0, yMm: 101.6, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        { id: 'b6', xMm: 25.4, yMm: 101.6, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        { id: 'b7', xMm: 50.8, yMm: 101.6, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        { id: 'b8', xMm: 76.2, yMm: 101.6, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        // Bottom 8 copies of 1x1 (Row 2)
        { id: 'b9', xMm: 0, yMm: 127.0, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        { id: 'b10', xMm: 25.4, yMm: 127.0, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        { id: 'b11', xMm: 50.8, yMm: 127.0, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
        { id: 'b12', xMm: 76.2, yMm: 127.0, widthMm: 25.4, heightMm: 25.4, label: '1x1' },
      ];
    } else if (activePreset.value === 'SET_2') {
      // 6 pcs 2x2" (50.8mm)
      return [
        { id: 'b1', xMm: 0, yMm: 0, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b2', xMm: 50.8, yMm: 0, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b3', xMm: 0, yMm: 50.8, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b4', xMm: 50.8, yMm: 50.8, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b5', xMm: 0, yMm: 101.6, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
        { id: 'b6', xMm: 50.8, yMm: 101.6, widthMm: 50.8, heightMm: 50.8, label: '2x2' },
      ];
    } else if (activePreset.value === 'SET_4') {
      // 6 pcs Passport 35x45mm
      return [
        { id: 'b1', xMm: 10, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport' },
        { id: 'b2', xMm: 55, yMm: 5, widthMm: 35, heightMm: 45, label: 'Passport' },
        { id: 'b3', xMm: 10, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport' },
        { id: 'b4', xMm: 55, yMm: 55, widthMm: 35, heightMm: 45, label: 'Passport' },
        { id: 'b5', xMm: 10, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport' },
        { id: 'b6', xMm: 55, yMm: 105, widthMm: 35, heightMm: 45, label: 'Passport' },
      ];
    }
    return [{ id: 'b1', xMm: 0, yMm: 0, widthMm: 101.6, heightMm: 152.4, label: 'Full Page' }];
  });

  // Effective DPI Calculation
  const effectiveDpi = computed(() => {
    if (!photoDimensions.value.width) return 300;
    // For 2x2" box (50.8mm = 2.0 inches)
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
    boxes,
    effectiveDpi,
    dpiQuality,
  };
});
