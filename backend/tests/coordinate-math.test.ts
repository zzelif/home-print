import { describe, it, expect } from 'vitest';
import { MM_TO_POINTS, PAPER_DIMENSIONS_MM } from '../src/services/pdf-builder.service';

describe('Layout Coordinate Transformation & Millimeter Mathematics', () => {
  it('converts physical millimeters to PostScript points with exact precision', () => {
    // 1 inch = 25.4 mm = 72 pt
    expect(25.4 * MM_TO_POINTS).toBeCloseTo(72.0, 4);

    // 4R Sheet width: 101.6 mm = 4.0 inches = 288.0 pt
    expect(101.6 * MM_TO_POINTS).toBeCloseTo(288.0, 4);

    // 4R Sheet height: 152.4 mm = 6.0 inches = 432.0 pt
    expect(152.4 * MM_TO_POINTS).toBeCloseTo(432.0, 4);
  });

  it('correctly maps 2x2 inch passport box to 50.8mm points', () => {
    const boxWidthMm = 50.8; // 2 inches
    const boxHeightMm = 50.8;

    const widthPt = boxWidthMm * MM_TO_POINTS;
    const heightPt = boxHeightMm * MM_TO_POINTS;

    expect(widthPt).toBeCloseTo(144.0, 4);
    expect(heightPt).toBeCloseTo(144.0, 4);
  });

  it('transforms top-left canvas coordinates to bottom-left PDF space', () => {
    const pageHeightMm = PAPER_DIMENSIONS_MM['4R'].height; // 152.4 mm
    const pageHeightPt = pageHeightMm * MM_TO_POINTS; // 432 pt

    // Box at top margin y = 10mm, height = 50.8mm
    const boxYMm = 10.0;
    const boxHeightMm = 50.8;

    // In PDF bottom-left origin: yPt = pageHeightPt - ((boxYMm + boxHeightMm) * MM_TO_POINTS)
    const yPt = pageHeightPt - ((boxYMm + boxHeightMm) * MM_TO_POINTS);

    // Expected yPt = 432 - (60.8 * (72 / 25.4)) = 432 - 172.346 = 259.653 pt
    expect(yPt).toBeCloseTo(259.6535, 2);
    expect(yPt).toBeGreaterThan(0);
  });
});
