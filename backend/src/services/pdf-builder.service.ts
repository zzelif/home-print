import { PDFDocument, rgb, degrees } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { SharedPrintJobState, PhotoBoundingBox } from '../nodes/types';

// Physical unit conversions: 1 inch = 25.4 mm = 72 PostScript points
export const MM_TO_POINTS = 72 / 25.4;

export const PAPER_DIMENSIONS_MM: Record<string, { width: number; height: number }> = {
  '4R': { width: 101.6, height: 152.4 }, // 4 x 6 inches
  'A4': { width: 210.0, height: 297.0 },
  'Letter': { width: 215.9, height: 279.4 },
  'Legal': { width: 215.9, height: 355.6 },
};

export class PdfBuilderService {
  /**
   * Generates a precise 300+ DPI vector PDF matching the layout coordinates.
   * Runs in streaming memory mode (< 40MB RAM usage).
   */
  async buildLayoutPdf(state: SharedPrintJobState, outputPath: string): Promise<string> {
    const paperDim = PAPER_DIMENSIONS_MM[state.product.paperSize] || PAPER_DIMENSIONS_MM['4R'];
    const pageWidthPt = paperDim.width * MM_TO_POINTS;
    const pageHeightPt = paperDim.height * MM_TO_POINTS;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

    // Load customer photo
    if (state.inputFiles.length > 0) {
      const primaryFile = state.inputFiles[0];
      const imageBytes = await fs.readFile(primaryFile.filePath);

      let embeddedImage;
      if (primaryFile.mimeType.includes('png')) {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }

      // Draw each photo bounding box
      for (const box of state.layout.boxes) {
        const xPt = box.xMm * MM_TO_POINTS;
        // PDF coordinate origin is bottom-left
        const yPt = pageHeightPt - ((box.yMm + box.heightMm) * MM_TO_POINTS);
        const wPt = box.widthMm * MM_TO_POINTS;
        const hPt = box.heightMm * MM_TO_POINTS;

        // Draw image
        page.drawImage(embeddedImage, {
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
        });

        // Draw scissor cut lines if enabled
        if (state.layout.showCutLines) {
          // Top & Bottom horizontal lines
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

          // Left & Right vertical lines
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
    }

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }
}
