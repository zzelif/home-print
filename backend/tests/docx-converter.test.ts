import { describe, it, expect } from 'vitest';
import { DocumentConverterService } from '../src/services/document-converter.service';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

describe('DocumentConverterService Resilient Multi-Paper Conversion', () => {
  const service = new DocumentConverterService();

  it('sanitizes typographic ligatures and non-WinAnsi characters to prevent PDF crashes', () => {
    const rawText = 'Official Employee Sheet with ﬃ, ﬁ, ﬂ, ﬀ, and “smart quotes”, ₱150.00 price, and em—dash • bullet.';
    const clean = service.sanitizeWinAnsi(rawText);

    expect(clean).not.toContain('ﬃ');
    expect(clean).toContain('ffi');
    expect(clean).toContain('fi');
    expect(clean).toContain('fl');
    expect(clean).toContain('ff');
    expect(clean).toContain('PHP 150.00');
    expect(clean).toContain('"smart quotes"');
  });

  it('converts real-world Word documents with typographic ligatures into multi-page PDFs', async () => {
    const docxPath = path.join(process.cwd(), 'uploads', 'f_1787735112563_a7b7a2_Forty2_-_Employee_Information_Sheet_-_Dan_Gabriel_Lettac.docx');
    
    // Check if the uploaded sample docx exists
    const exists = await fs.stat(docxPath).then(() => true).catch(() => false);
    if (exists) {
      const pdfPath = await service.convertToPdf(docxPath, 'A4');
      expect(pdfPath).toBeDefined();

      const analysis = await service.analyzePdf(pdfPath);
      expect(analysis.totalPages).toBeGreaterThanOrEqual(1);
      expect(analysis.pageSize).toBe('A4');
      expect(analysis.pageBreakdown.length).toBe(analysis.totalPages);
    }
  });

  it('should convert text files to A4, Letter, and Legal PDFs', async () => {
    const textPath = path.join(process.cwd(), 'cache', 'sample_test.txt');
    await fs.mkdir(path.dirname(textPath), { recursive: true });
    await fs.writeFile(textPath, 'Hello HomePrint OS\nTesting Short and Long Paper Sizes\nPrice: ₱50.00 — Special Bullet • Test');

    // 1. A4
    const a4Pdf = await service.convertToPdf(textPath, 'A4');
    const a4Analysis = await service.analyzePdf(a4Pdf);
    expect(a4Analysis.pageSize).toBe('A4');

    // 2. Letter (Short Bond 8.5x11 in)
    const letterPdf = await service.convertToPdf(textPath, 'Letter');
    const letterAnalysis = await service.analyzePdf(letterPdf);
    expect(letterAnalysis.pageSize).toBe('Letter');

    // 3. Legal (Long Bond 8.5x14 in)
    const legalPdf = await service.convertToPdf(textPath, 'Legal');
    const legalAnalysis = await service.analyzePdf(legalPdf);
    expect(legalAnalysis.pageSize).toBe('Legal');

    await fs.unlink(textPath);
    await fs.unlink(a4Pdf);
    await fs.unlink(letterPdf);
    await fs.unlink(legalPdf);
  });

  it('should convert images to specified paper dimensions', async () => {
    const imgPath = path.join(process.cwd(), 'cache', 'sample_img_test.png');
    await fs.mkdir(path.dirname(imgPath), { recursive: true });
    
    await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 50, g: 120, b: 220 },
      },
    }).png().toFile(imgPath);

    const letterPdf = await service.convertToPdf(imgPath, 'Letter');
    const letterAnalysis = await service.analyzePdf(letterPdf);
    expect(letterAnalysis.pageSize).toBe('Letter');

    const legalPdf = await service.convertToPdf(imgPath, 'Legal');
    const legalAnalysis = await service.analyzePdf(legalPdf);
    expect(legalAnalysis.pageSize).toBe('Legal');

    await fs.unlink(imgPath);
    await fs.unlink(letterPdf);
    await fs.unlink(legalPdf);
  });
});
