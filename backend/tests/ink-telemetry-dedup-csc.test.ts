import { describe, it, expect, beforeEach } from 'vitest';
import { InkLevelService } from '../src/services/ink-level.service';
import { PdfBuilderService } from '../src/services/pdf-builder.service';
import { PrinterDiscoveryService, DiscoveredPrinter } from '../src/services/printer-discovery.service';
import { sanitizeWinAnsi } from '../src/services/document-converter.service';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

describe('HP Smart Tank 670 Ink Telemetry & EWS Parsing', () => {
  const inkService = new InkLevelService();

  const mockHpConsumableXml = `<?xml version="1.0" encoding="UTF-8" ?>
<ccdyn:ConsumableConfigDyn xmlns:ccdyn="http://www.hp.com/schemas/imaging/con/ledm/consumableconfigdyn/2007/11/19" xmlns:dd="http://www.hp.com/schemas/imaging/con/dictionaries/1.0/">
  <ccdyn:ConsumableInfo>
    <dd:ConsumableLabelCode>C</dd:ConsumableLabelCode>
    <dd:ConsumablePercentageLevelRemaining>100</dd:ConsumablePercentageLevelRemaining>
    <dd:ConsumableTypeEnum>inkTank</dd:ConsumableTypeEnum>
  </ccdyn:ConsumableInfo>
  <ccdyn:ConsumableInfo>
    <dd:ConsumableLabelCode>M</dd:ConsumableLabelCode>
    <dd:ConsumablePercentageLevelRemaining>85</dd:ConsumablePercentageLevelRemaining>
    <dd:ConsumableTypeEnum>inkTank</dd:ConsumableTypeEnum>
  </ccdyn:ConsumableInfo>
  <ccdyn:ConsumableInfo>
    <dd:ConsumableLabelCode>Y</dd:ConsumableLabelCode>
    <dd:ConsumablePercentageLevelRemaining>70</dd:ConsumablePercentageLevelRemaining>
    <dd:ConsumableTypeEnum>inkTank</dd:ConsumableTypeEnum>
  </ccdyn:ConsumableInfo>
  <ccdyn:ConsumableInfo>
    <dd:ConsumableLabelCode>K</dd:ConsumableLabelCode>
    <dd:ConsumablePercentageLevelRemaining>90</dd:ConsumablePercentageLevelRemaining>
    <dd:ConsumableTypeEnum>inkTank</dd:ConsumableTypeEnum>
  </ccdyn:ConsumableInfo>
</ccdyn:ConsumableConfigDyn>`;

  it('correctly parses native HP EWS Consumable XML ink levels', () => {
    const levels = inkService.parseHpConsumableXml(mockHpConsumableXml);
    expect(levels).not.toBeNull();
    expect(levels?.cyan).toBe(100);
    expect(levels?.magenta).toBe(85);
    expect(levels?.yellow).toBe(70);
    expect(levels?.black).toBe(90);
  });
});

describe('Printer Discovery IP Deduplication', () => {
  it('deduplicates multiple aliases with the same IP address into a single clean entry', () => {
    const discovery = new PrinterDiscoveryService();
    const rawPrinters: DiscoveredPrinter[] = [
      {
        id: 'net_192_168_1_60',
        name: 'HP Smart Tank 670 (192.168.1.60)',
        connectionType: 'WIFI_NETWORK',
        uri: 'ipp://192.168.1.60/ipp/print',
        ipAddress: '192.168.1.60',
        portName: '192.168.1.60',
        status: 'ONLINE',
        isDefault: false,
      },
      {
        id: 'HP_Smart_Tank_192_168_1_60',
        name: 'HP_Smart_Tank_192_168_1_60',
        connectionType: 'WIFI_NETWORK',
        uri: 'ipp://192.168.1.60:631/ipp/print',
        ipAddress: '192.168.1.60',
        portName: '192.168.1.60',
        status: 'ONLINE',
        isDefault: false,
      },
      {
        id: 'HP_Smart_Tank_670',
        name: 'HP_Smart_Tank_670',
        connectionType: 'WIFI_NETWORK',
        uri: 'ipp://192.168.1.60/ipp/print',
        ipAddress: '192.168.1.60',
        portName: '192.168.1.60',
        status: 'ONLINE',
        isDefault: false,
      },
      {
        id: 'win_Canon_MP250',
        name: 'Canon MP250 series Printer',
        connectionType: 'USB',
        uri: 'winspool://USB003/Canon',
        ipAddress: null,
        portName: 'USB003',
        status: 'ONLINE',
        isDefault: false,
      },
    ];

    const ipMap = new Map<string, DiscoveredPrinter>();
    const nonIpPrinters: DiscoveredPrinter[] = [];

    for (const p of rawPrinters) {
      if (p.ipAddress) {
        const existing = ipMap.get(p.ipAddress);
        if (!existing) {
          ipMap.set(p.ipAddress, { ...p });
        } else {
          if (existing.status !== 'ONLINE' && p.status === 'ONLINE') {
            existing.status = 'ONLINE';
          }
          if (p.name.includes('(') && !existing.name.includes('(')) {
            existing.name = p.name;
          }
        }
      } else {
        nonIpPrinters.push(p);
      }
    }

    const deduped = [...Array.from(ipMap.values()), ...nonIpPrinters];
    expect(deduped.length).toBe(2);
    expect(deduped.find(p => p.ipAddress === '192.168.1.60')?.name).toBe('HP Smart Tank 670 (192.168.1.60)');
  });
});

describe('5-in-a-Page Uniform Layout Math', () => {
  const pdfBuilder = new PdfBuilderService();

  it('generates 3-row uniform layout for 5-in-a-page in Portrait mode (all 5 photos equal size)', () => {
    const boxes = pdfBuilder.resolvePresetBoxes('TILE_5', true, 'Letter', 'PORTRAIT');
    expect(boxes.length).toBe(5);

    // Verify all 5 photos have the exact same width and height
    const w = boxes[0].widthMm;
    const h = boxes[0].heightMm;

    expect(boxes[1].widthMm).toBeCloseTo(w, 2);
    expect(boxes[1].heightMm).toBeCloseTo(h, 2);
    expect(boxes[2].widthMm).toBeCloseTo(w, 2);
    expect(boxes[2].heightMm).toBeCloseTo(h, 2);
    expect(boxes[3].widthMm).toBeCloseTo(w, 2);
    expect(boxes[3].heightMm).toBeCloseTo(h, 2);
    expect(boxes[4].widthMm).toBeCloseTo(w, 2);
    expect(boxes[4].heightMm).toBeCloseTo(h, 2);

    // Verify 3 rows structure: Row 1 (2), Row 2 (2), Row 3 (1 centered)
    expect(boxes[0].yMm).toBeCloseTo(0, 1);
    expect(boxes[1].yMm).toBeCloseTo(0, 1);
    expect(boxes[2].yMm).toBeCloseTo(h, 1);
    expect(boxes[3].yMm).toBeCloseTo(h, 1);
    expect(boxes[4].yMm).toBeCloseTo(2 * h, 1);

    // Verify row 3 photo is centered horizontally
    const sheetW = 215.9; // Letter width
    expect(boxes[4].xMm).toBeCloseTo((sheetW - w) / 2, 1);
  });

  it('generates 2-row uniform layout for 5-in-a-page in Landscape mode', () => {
    const boxes = pdfBuilder.resolvePresetBoxes('TILE_5', true, 'A4', 'LANDSCAPE');
    expect(boxes.length).toBe(5);

    const w = boxes[0].widthMm;
    const h = boxes[0].heightMm;

    // All 5 photos should have identical width and height
    for (let i = 0; i < 5; i++) {
      expect(boxes[i].widthMm).toBeCloseTo(w, 2);
      expect(boxes[i].heightMm).toBeCloseTo(h, 2);
    }
  });
});

describe('CSC Official 4-pcs Passport Package & Handwriting Nametag', () => {
  const pdfBuilder = new PdfBuilderService();

  it('resolves CSC_PASSPORT preset to 4 equal passport slots (35x45mm) on 4R photo sheet', () => {
    const boxes = pdfBuilder.resolvePresetBoxes('CSC_PASSPORT', true, '4R', 'PORTRAIT');
    expect(boxes.length).toBe(4);

    for (let i = 0; i < 4; i++) {
      expect(boxes[i].widthMm).toBe(35);
      expect(boxes[i].heightMm).toBe(45);
      expect(boxes[i].isPassport).toBe(true);
      expect(boxes[i].nameplate?.enabled).toBe(true);
    }
  });

  it('renders vector PDF with CSC blank handwriting nametag box and guideline', async () => {
    const testDir = path.join(process.cwd(), 'cache', 'test_csc');
    await fs.mkdir(testDir, { recursive: true });
    const targetPdf = path.join(testDir, `csc_test_${Date.now()}.pdf`);

    const mockState: any = {
      jobId: 'test_csc_job',
      options: { preset: 'CSC_PASSPORT', zeroGap: true, showCutLines: true },
      layout: {
        presetId: 'CSC_PASSPORT',
        paperSize: '4R',
        orientation: 'PORTRAIT',
        copies: 1,
        nameplateConfig: {
          enabled: true,
          name: '', // Blank for handwriting
          subtext: 'CIVIL SERVICE EXAM',
          style: 'CSC_OFFICIAL',
        },
      },
      product: { paperSize: '4R', paperType: 'GLOSSY_PHOTO' },
    };

    await pdfBuilder.buildLayoutPdf(mockState, targetPdf, 'test_csc_job');

    const pdfBytes = await fs.readFile(targetPdf);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    const [firstPage] = pdfDoc.getPages();
    expect(firstPage.getWidth()).toBeCloseTo(101.6 * (72 / 25.4), 1);
    expect(firstPage.getHeight()).toBeCloseTo(152.4 * (72 / 25.4), 1);

    await fs.unlink(targetPdf).catch(() => {});
  });
});
