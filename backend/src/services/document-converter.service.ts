import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import zlib from "zlib";
import { PDFDocument, StandardFonts, rgb, PDFName } from "pdf-lib";
import sharp from "sharp";
import { getPricingConfig, classifyColorTier } from "../config/pricing-tiers.config";

const execAsync = promisify(exec);

export type ColorTier = 0 | 1 | 2 | 3;
export type PaperSize =
  | "A4"
  | "Letter"
  | "Long"
  | "Legal"
  | "4R"
  | "5R"
  | "Unknown";

export interface PageColorAnalysis {
  pageNumber: number;
  tier: ColorTier;
  tierName: string;
  unitPrice: number;
  estimatedCoverage: string;
  chromaticRatio?: number;
}

export interface DocumentConversionResult {
  convertedPdfPath: string;
  totalPages: number;
  pageSize: PaperSize;
  pageBreakdown: PageColorAnalysis[];
  monochromePageCount: number;
  accentColorPageCount: number;
  mediumColorPageCount: number;
  heavyColorPageCount: number;
  suggestedAdaptiveTotal: number;
  flatColorTotal: number;
  customerSavings: number;
}

export const PAPER_DIMENSIONS_PT: Record<
  string,
  { width: number; height: number; name: string }
> = {
  A4: { width: 595.28, height: 841.89, name: "A4 Standard (210 x 297 mm)" },
  Letter: { width: 612.0, height: 792.0, name: "Short / Letter (8.5 x 11 in)" },
  Long: { width: 612.0, height: 936.0, name: "Long / Folio F4 (8.5 x 13 in)" },
  Legal: { width: 612.0, height: 1008.0, name: "US Legal (8.5 x 14 in)" },
  "4R": { width: 288.0, height: 432.0, name: "4R Photo (4 x 6 in)" },
  "5R": { width: 360.0, height: 504.0, name: "5R Photo (5 x 7 in)" },
};

/**
 * Maps all Unicode typographic characters, ligatures, symbols, and formatting marks
 * into safe WinAnsi (standard PDF Helvetica) characters to prevent pdf-lib encoding crashes.
 */
export function sanitizeWinAnsi(text: string): string {
  if (!text) return "";
  return (
    text
      // Typographic Ligatures
      .replace(/\uFB00/g, "ff")
      .replace(/\uFB01/g, "fi")
      .replace(/\uFB02/g, "fl")
      .replace(/\uFB03/g, "ffi")
      .replace(/\uFB04/g, "ffl")
      .replace(/\uFB05/g, "st")
      .replace(/\uFB06/g, "st")
      .replace(/[\u00C6\u01E2\u01FC]/g, "AE")
      .replace(/[\u00E6\u01E3\u01FD]/g, "ae")
      .replace(/\u0152/g, "OE")
      .replace(/\u0153/g, "oe")

      // Smart Quotes, Apostrophes & Primes
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB]/g, '"')

      // Dashes & Hyphens
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-")
      .replace(/\u00AD/g, "") // Soft hyphen

      // Bullets & List Markers
      .replace(
        /[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB]/g,
        "* ",
      )

      // Currency & Commercial
      .replace(/\u20B1/g, "PHP ") // Philippine Peso
      .replace(/\u20AC/g, "EUR ")
      .replace(/\u00A3/g, "GBP ")
      .replace(/\u00A5/g, "JPY ")
      .replace(/\u2122/g, "(TM)")
      .replace(/\u00A9/g, "(C)")
      .replace(/\u00AE/g, "(R)")
      .replace(/\u2026/g, "...") // Ellipsis
      .replace(/\u00B0/g, " deg") // Degree

      // Spacing
      .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, " ")

      // Final pass: replace any remaining character > 255 with '?'
      .replace(/[^\x00-\xFF]/g, "?")
  );
}

export class DocumentConverterService {
  private outputDir = path.join(process.cwd(), "cache", "converted");

  async ensureOutputDir(): Promise<void> {
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  sanitizeWinAnsi(text: string): string {
    return sanitizeWinAnsi(text);
  }

  /**
   * Probes system to find an available LibreOffice executable across Windows, Linux, and macOS.
   */
  private async findLibreOffice(): Promise<string | null> {
    const candidates = [
      "soffice",
      "libreoffice",
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      "/usr/bin/soffice",
      "/usr/bin/libreoffice",
      "/usr/local/bin/soffice",
      "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    ];

    for (const cmd of candidates) {
      try {
        if (cmd.includes("\\") || cmd.includes("/")) {
          await fs.access(cmd);
          return `"${cmd}"`;
        } else {
          await execAsync(`${cmd} --version`);
          return cmd;
        }
      } catch {}
    }
    return null;
  }

  /**
   * Pure Node.js DOCX XML extractor using standard ZIP Central Directory parsing with sequential stream fallback.
   */
  private extractDocxText(buffer: Buffer): string[] {
    let xmlContent = "";

    // 1. Parse via End of Central Directory (EOCD: 0x06054b50)
    let eocdOffset = -1;
    for (
      let i = buffer.length - 22;
      i >= Math.max(0, buffer.length - 65557);
      i--
    ) {
      if (buffer.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset !== -1) {
      const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
      const totalEntries = buffer.readUInt16LE(eocdOffset + 8);
      let cur = cdOffset;

      for (let e = 0; e < totalEntries && cur < buffer.length - 46; e++) {
        if (buffer.readUInt32LE(cur) !== 0x02014b50) break;

        const compression = buffer.readUInt16LE(cur + 10);
        const compressedSize = buffer.readUInt32LE(cur + 20);
        const fileNameLen = buffer.readUInt16LE(cur + 28);
        const extraLen = buffer.readUInt16LE(cur + 30);
        const commentLen = buffer.readUInt16LE(cur + 32);
        const localHeaderOffset = buffer.readUInt32LE(cur + 42);
        const fileName = buffer.toString(
          "utf8",
          cur + 46,
          cur + 46 + fileNameLen,
        );

        if (fileName === "word/document.xml") {
          if (
            localHeaderOffset < buffer.length - 30 &&
            buffer.readUInt32LE(localHeaderOffset) === 0x04034b50
          ) {
            const lNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
            const lExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
            const dataStart = localHeaderOffset + 30 + lNameLen + lExtraLen;
            const compData = buffer.subarray(
              dataStart,
              dataStart + compressedSize,
            );

            try {
              if (compression === 8) {
                xmlContent = zlib.inflateRawSync(compData).toString("utf8");
              } else if (compression === 0) {
                xmlContent = compData.toString("utf8");
              }
            } catch {}
          }
          break;
        }
        cur += 46 + fileNameLen + extraLen + commentLen;
      }
    }

    // 2. Sequential scan fallback if ZIP structure has prepended offsets
    if (!xmlContent) {
      let offset = 0;
      while (offset < buffer.length - 30) {
        if (buffer.readUInt32LE(offset) === 0x04034b50) {
          const compression = buffer.readUInt16LE(offset + 8);
          const compressedSize = buffer.readUInt32LE(offset + 18);
          const nameLen = buffer.readUInt16LE(offset + 26);
          const extraLen = buffer.readUInt16LE(offset + 28);
          const fileName = buffer.toString(
            "utf8",
            offset + 30,
            offset + 30 + nameLen,
          );
          const dataStart = offset + 30 + nameLen + extraLen;

          if (fileName === "word/document.xml") {
            const compData =
              compressedSize > 0
                ? buffer.subarray(dataStart, dataStart + compressedSize)
                : buffer.subarray(dataStart);
            try {
              if (compression === 8) {
                xmlContent = zlib.inflateRawSync(compData).toString("utf8");
              } else {
                xmlContent = compData.toString("utf8");
              }
            } catch {}
            break;
          }
          offset = dataStart + (compressedSize > 0 ? compressedSize : 1);
        } else {
          offset++;
        }
      }
    }

    if (!xmlContent) {
      // Fallback regex on raw text
      const rawText = buffer.toString("utf8");
      const textMatches = rawText.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      return textMatches
        .map((m) =>
          this.sanitizeWinAnsi(m.replace(/<\/?[^>]+(>|$)/g, "").trim()),
        )
        .filter(Boolean);
    }

    // Extract paragraphs <w:p> (including those nested in table rows <w:tr><w:tc>)
    const paragraphs: string[] = [];
    const pMatches = xmlContent.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [];

    for (const pXml of pMatches) {
      const tMatches = pXml.match(/<w:t\b[^>]*>(.*?)<\/w:t>/g) || [];
      const text = tMatches
        .map((m) => m.replace(/<\/?[^>]+(>|$)/g, ""))
        .join("");
      const sanitized = this.sanitizeWinAnsi(text);
      if (sanitized.trim()) {
        paragraphs.push(sanitized.trim());
      } else {
        paragraphs.push(""); // Empty paragraph spacing
      }
    }

    return paragraphs;
  }

  /**
   * Built-in pure-JS DOCX to PDF converter supporting A4, Letter (Short), and Legal (Long) paper formats.
   */
  async convertDocxWithBuiltin(
    inputFilePath: string,
    targetPaperSize: "A4" | "Letter" | "Long" | "Legal" = "A4",
  ): Promise<string> {
    await this.ensureOutputDir();
    const fileBuffer = await fs.readFile(inputFilePath);
    const paragraphs = this.extractDocxText(fileBuffer);

    const dims = PAPER_DIMENSIONS_PT[targetPaperSize] || PAPER_DIMENSIONS_PT.A4;
    const pageWidth = dims.width;
    const pageHeight = dims.height;
    const margin = 54; // 0.75 in
    const contentWidth = pageWidth - margin * 2;
    const fontSize = 10.5;
    const lineHeight = 15;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let currentY = pageHeight - margin;

    // If document is empty, draw subtle header
    if (paragraphs.length === 0) {
      currentPage.drawText("Document (No text extracted)", {
        x: margin,
        y: currentY,
        size: 11,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (!p) {
        currentY -= lineHeight * 0.75;
        continue;
      }

      const isHeading =
        (i === 0 || (p.length < 50 && p === p.toUpperCase())) && p.length < 60;
      const currentFont = isHeading ? fontBold : font;
      const currentFontSize = isHeading ? 13 : fontSize;
      const currentLineHeight = isHeading ? 18 : lineHeight;

      const words = p.split(/\s+/);
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        let width = 0;
        try {
          width = currentFont.widthOfTextAtSize(testLine, currentFontSize);
        } catch {
          // If any character width fails, estimate width
          width = testLine.length * (currentFontSize * 0.55);
        }

        if (width > contentWidth && currentLine) {
          if (currentY - currentLineHeight < margin) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            currentY = pageHeight - margin;
          }
          try {
            currentPage.drawText(currentLine, {
              x: margin,
              y: currentY,
              size: currentFontSize,
              font: currentFont,
              color: isHeading ? rgb(0.1, 0.2, 0.35) : rgb(0.15, 0.15, 0.15),
            });
          } catch {
            currentPage.drawText(this.sanitizeWinAnsi(currentLine), {
              x: margin,
              y: currentY,
              size: currentFontSize,
              font: currentFont,
              color: isHeading ? rgb(0.1, 0.2, 0.35) : rgb(0.15, 0.15, 0.15),
            });
          }
          currentY -= currentLineHeight;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        if (currentY - currentLineHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          currentY = pageHeight - margin;
        }
        try {
          currentPage.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: currentFontSize,
            font: currentFont,
            color: isHeading ? rgb(0.1, 0.2, 0.35) : rgb(0.15, 0.15, 0.15),
          });
        } catch {
          currentPage.drawText(this.sanitizeWinAnsi(currentLine), {
            x: margin,
            y: currentY,
            size: currentFontSize,
            font: currentFont,
            color: isHeading ? rgb(0.1, 0.2, 0.35) : rgb(0.15, 0.15, 0.15),
          });
        }
        currentY -= currentLineHeight + 4;
      }
    }

    const pdfBytes = await pdfDoc.save();
    const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputPath = path.join(
      this.outputDir,
      `${baseName}_${targetPaperSize}.pdf`,
    );
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }

  /**
   * Academic-grounded pixel-level chromaticity analysis in ITU-R BT.601 YCbCr space.
   * Incorporates US Patent 7,724,982 cylindrical tube and grayscale-in-RGB detection.
   */
  async analyzeRasterImageBuffer(
    imageBuffer: Buffer,
    pageNumber: number = 1,
  ): Promise<PageColorAnalysis> {
    try {
      const config = getPricingConfig();
      const { data, info } = await sharp(imageBuffer, { failOnError: false })
        .resize(200, 200, { fit: "inside" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const numPixels = info.width * info.height;
      let inkPixels = 0;
      let chromaticPixels = 0;
      let nearGrayCount = 0;

      const YCBCR_RADIUS = config.mathParams.ycbcrRadius;
      const YCBCR_RADIUS_SQ = YCBCR_RADIUS * YCBCR_RADIUS;
      const PAPER_WHITE_Y = config.mathParams.paperWhiteLuminance;

      for (let i = 0; i < data.length; i += 3) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 1. Luminance
        const y = 0.299 * r + 0.587 * g + 0.114 * b;

        // 2. Grayscale spread check
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (spread <= config.mathParams.grayscaleSpreadThreshold) {
          nearGrayCount++;
        }

        // 3. Non-paper ink check
        if (y < PAPER_WHITE_Y) {
          inkPixels++;
          const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128.0;
          const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128.0;

          const distSq =
            (cb - 128.0) * (cb - 128.0) + (cr - 128.0) * (cr - 128.0);
          if (distSq > YCBCR_RADIUS_SQ) {
            chromaticPixels++;
          }
        }
      }

      const isGrayscaleEncoded = nearGrayCount / numPixels >= config.mathParams.grayscaleImmunityFraction;
      const chromaticRatioOverTotal = chromaticPixels / numPixels;

      const classification = classifyColorTier(chromaticRatioOverTotal, isGrayscaleEncoded, config);

      return {
        pageNumber,
        tier: classification.tier,
        tierName: classification.tierName,
        unitPrice: classification.unitPrice,
        estimatedCoverage: classification.estimatedCoverage,
        chromaticRatio: Number(chromaticRatioOverTotal.toFixed(4)),
      };
    } catch {
      return {
        pageNumber,
        tier: 0,
        tierName: "Monochrome (B&W)",
        unitPrice: 3.0,
        estimatedCoverage: "Standard Page",
      };
    }
  }

  /**
   * Built-in Image to PDF Converter supporting A4, Letter, Long, Legal, 4R, 5R,
   * orientation (Portrait/Landscape), and fit modes (Fit to Printable / Fill Page).
   */
  /**
   * Probes system and buffer headers to accurately detect file type (PDF, IMAGE, DOCX, TEXT)
   * independent of file extensions or generic attachment names.
   */
  async detectFileType(
    filePath: string,
  ): Promise<"PDF" | "IMAGE" | "DOCX" | "TEXT" | "UNKNOWN"> {
    try {
      if (!fsSync.existsSync(filePath)) return "UNKNOWN";
      const buffer = await fs.readFile(filePath);
      if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "%PDF") {
        return "PDF";
      }

      // Check Sharp image support
      try {
        const meta = await sharp(buffer, { failOnError: false }).metadata();
        if (meta && meta.format) {
          return "IMAGE";
        }
      } catch {}

      // Check ZIP / DOCX magic bytes
      if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
        return "DOCX";
      }

      const ext = path.extname(filePath).toLowerCase();
      if (
        [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".gif"].includes(
          ext,
        )
      )
        return "IMAGE";
      if (ext === ".pdf") return "PDF";
      if ([".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls"].includes(ext))
        return "DOCX";
      if ([".txt", ".md", ".csv", ".json", ".log"].includes(ext)) return "TEXT";

      // Fallback: test if ASCII text
      const isAscii = buffer
        .subarray(0, Math.min(512, buffer.length))
        .every((b) => (b >= 32 && b <= 126) || b === 9 || b === 10 || b === 13);
      if (isAscii && buffer.length > 0) return "TEXT";
    } catch {}
    return "UNKNOWN";
  }

  /**
   * Built-in Image to PDF Converter supporting A4, Letter, Long, Legal, 4R, 5R,
   * orientation (Auto-Detect, Portrait, Landscape), and fit modes (Fit to Printable / Fill Page).
   */
  async convertImageWithBuiltin(
    inputFilePath: string,
    targetPaperSize: "A4" | "Letter" | "Long" | "Legal" | "4R" | "5R" = "A4",
    orientation: "AUTO" | "PORTRAIT" | "LANDSCAPE" = "AUTO",
    fitMode: "FIT_PRINTABLE" | "FILL_PAGE" = "FIT_PRINTABLE",
  ): Promise<string> {
    await this.ensureOutputDir();
    const rawBuffer = await fs.readFile(inputFilePath);
    const normalizedBuffer = await sharp(rawBuffer, { failOnError: false })
      .rotate()
      .toBuffer();
    const metadata = await sharp(normalizedBuffer, {
      failOnError: false,
    }).metadata();

    const baseDims =
      PAPER_DIMENSIONS_PT[targetPaperSize] || PAPER_DIMENSIONS_PT.A4;
    const imgWidth = metadata.width || 1200;
    const imgHeight = metadata.height || 1600;

    let isLandscape = false;
    if (orientation === "AUTO") {
      isLandscape = imgWidth > imgHeight;
    } else {
      isLandscape = orientation === "LANDSCAPE";
    }

    const pageWidth = isLandscape
      ? Math.max(baseDims.width, baseDims.height)
      : Math.min(baseDims.width, baseDims.height);
    const pageHeight = isLandscape
      ? Math.min(baseDims.width, baseDims.height)
      : Math.max(baseDims.width, baseDims.height);

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let embeddedImage;
    const format = metadata.format?.toLowerCase();
    if (format === "jpeg" || format === "jpg") {
      try {
        embeddedImage = await pdfDoc.embedJpg(normalizedBuffer);
      } catch {
        const pngBuffer = await sharp(normalizedBuffer, { failOnError: false })
          .png()
          .toBuffer();
        embeddedImage = await pdfDoc.embedPng(pngBuffer);
      }
    } else if (format === "png") {
      try {
        embeddedImage = await pdfDoc.embedPng(normalizedBuffer);
      } catch {
        const jpgBuffer = await sharp(normalizedBuffer, { failOnError: false })
          .jpeg()
          .toBuffer();
        embeddedImage = await pdfDoc.embedJpg(jpgBuffer);
      }
    } else {
      const pngBuffer = await sharp(normalizedBuffer, { failOnError: false })
        .png()
        .toBuffer();
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const margin = fitMode === "FILL_PAGE" ? 0 : 24; // 24 pt ≈ 8.5mm printable margin
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;

    let scale = 1.0;
    if (fitMode === "FILL_PAGE") {
      scale = Math.max(pageWidth / imgWidth, pageHeight / imgHeight);
    } else {
      scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
    }

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const drawX = (pageWidth - drawWidth) / 2;
    const drawY = (pageHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x: drawX,
      y: drawY,
      width: drawWidth,
      height: drawHeight,
    });

    const pdfBytes = await pdfDoc.save();
    const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputPath = path.join(
      this.outputDir,
      `${baseName}_${targetPaperSize}_${isLandscape ? "LANDSCAPE" : "PORTRAIT"}.pdf`,
    );
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }

  /**
   * Collates multiple uploaded images into a single multi-page vector PDF
   * with automatic per-page orientation detection (Landscape vs Portrait).
   */
  async convertImagesToMultiPagePdf(
    imageFilePaths: string[],
    targetPaperSize: "A4" | "Letter" | "Long" | "Legal" | "4R" | "5R" = "A4",
    orientation: "AUTO" | "PORTRAIT" | "LANDSCAPE" = "AUTO",
    fitMode: "FIT_PRINTABLE" | "FILL_PAGE" = "FIT_PRINTABLE",
  ): Promise<string> {
    await this.ensureOutputDir();
    const baseDims =
      PAPER_DIMENSIONS_PT[targetPaperSize] || PAPER_DIMENSIONS_PT.A4;
    const pdfDoc = await PDFDocument.create();

    for (const imgPath of imageFilePaths) {
      try {
        const rawBuffer = await fs.readFile(imgPath);
        const normalizedBuffer = await sharp(rawBuffer, { failOnError: false })
          .rotate()
          .toBuffer();
        const metadata = await sharp(normalizedBuffer, {
          failOnError: false,
        }).metadata();
        const imgWidth = metadata.width || 1200;
        const imgHeight = metadata.height || 1600;

        let isLandscape = false;
        if (orientation === "AUTO") {
          isLandscape = imgWidth > imgHeight;
        } else {
          isLandscape = orientation === "LANDSCAPE";
        }

        const pageWidth = isLandscape
          ? Math.max(baseDims.width, baseDims.height)
          : Math.min(baseDims.width, baseDims.height);
        const pageHeight = isLandscape
          ? Math.min(baseDims.width, baseDims.height)
          : Math.max(baseDims.width, baseDims.height);

        let embeddedImage;
        const format = metadata.format?.toLowerCase();
        if (format === "jpeg" || format === "jpg") {
          try {
            embeddedImage = await pdfDoc.embedJpg(normalizedBuffer);
          } catch {
            const pngBuf = await sharp(normalizedBuffer, { failOnError: false })
              .png()
              .toBuffer();
            embeddedImage = await pdfDoc.embedPng(pngBuf);
          }
        } else if (format === "png") {
          try {
            embeddedImage = await pdfDoc.embedPng(normalizedBuffer);
          } catch {
            const jpgBuf = await sharp(normalizedBuffer, { failOnError: false })
              .jpeg()
              .toBuffer();
            embeddedImage = await pdfDoc.embedJpg(jpgBuf);
          }
        } else {
          const pngBuf = await sharp(normalizedBuffer, { failOnError: false })
            .png()
            .toBuffer();
          embeddedImage = await pdfDoc.embedPng(pngBuf);
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        const margin = fitMode === "FILL_PAGE" ? 0 : 24;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;

        let scale = 1.0;
        if (fitMode === "FILL_PAGE") {
          scale = Math.max(pageWidth / imgWidth, pageHeight / imgHeight);
        } else {
          scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        }

        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        const drawX = (pageWidth - drawWidth) / 2;
        const drawY = (pageHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
      } catch (err: any) {
        console.warn(
          `Could not embed image ${imgPath} into multi-page PDF:`,
          err.message,
        );
      }
    }

    const pdfBytes = await pdfDoc.save();
    const batchId = `batch_${Date.now()}`;
    const outputPath = path.join(
      this.outputDir,
      `${batchId}_${targetPaperSize}.pdf`,
    );
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }

  /**
   * Built-in Text to PDF Converter supporting A4, Letter (Short), Long (Folio F4), and Legal dimensions.
   */
  async convertTextWithBuiltin(
    inputFilePath: string,
    targetPaperSize: "A4" | "Letter" | "Long" | "Legal" = "A4",
  ): Promise<string> {
    await this.ensureOutputDir();
    const text = await fs.readFile(inputFilePath, "utf8");
    const paragraphs = text.split("\n");

    const dims = PAPER_DIMENSIONS_PT[targetPaperSize] || PAPER_DIMENSIONS_PT.A4;
    const pageWidth = dims.width;
    const pageHeight = dims.height;
    const margin = 54;

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    for (const rawLine of paragraphs) {
      const line = this.sanitizeWinAnsi(rawLine);
      if (y < margin + 20) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      try {
        page.drawText(line.slice(0, 85), { x: margin, y, size: 10, font });
      } catch {
        page.drawText(line.slice(0, 85).replace(/[^\x20-\x7E]/g, "?"), {
          x: margin,
          y,
          size: 10,
          font,
        });
      }
      y -= 14;
    }

    const pdfBytes = await pdfDoc.save();
    const baseName = path.basename(inputFilePath, path.extname(inputFilePath));
    const outputPath = path.join(
      this.outputDir,
      `${baseName}_${targetPaperSize}.pdf`,
    );
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
  }

  /**
   * Converts DOCX, PPTX, TXT, or images to PDF across A4, Letter, Long, and Legal formats.
   */
  async convertToPdf(
    inputFilePath: string,
    targetPaperSize: "A4" | "Letter" | "Long" | "Legal" | "4R" | "5R" = "A4",
    orientation: "AUTO" | "PORTRAIT" | "LANDSCAPE" = "AUTO",
    fitMode: "FIT_PRINTABLE" | "FILL_PAGE" = "FIT_PRINTABLE",
  ): Promise<string> {
    await this.ensureOutputDir();
    const fileType = await this.detectFileType(inputFilePath);

    // 1. If already PDF, return directly
    if (fileType === "PDF") {
      return inputFilePath;
    }

    // 2. Try Headless LibreOffice if available for DOCX / Office
    const sofficeCmd = await this.findLibreOffice();
    if (sofficeCmd && fileType === "DOCX") {
      const command = `${sofficeCmd} --headless --convert-to pdf --outdir "${this.outputDir}" --norestore --nofirststartwizard --nologo "${inputFilePath}"`;
      try {
        await execAsync(command, { timeout: 15000 });
        const baseName = path.basename(
          inputFilePath,
          path.extname(inputFilePath),
        );
        const convertedPath = path.join(this.outputDir, `${baseName}.pdf`);
        await fs.access(convertedPath);
        return convertedPath;
      } catch (err) {
        console.warn(
          "LibreOffice headless execution failed, trying built-in converter:",
          err,
        );
      }
    }

    // 3. Fallback for DOCX / DOC
    if (fileType === "DOCX") {
      try {
        const paper =
          targetPaperSize === "4R" || targetPaperSize === "5R"
            ? "A4"
            : targetPaperSize;
        return await this.convertDocxWithBuiltin(inputFilePath, paper);
      } catch (err: any) {
        throw new Error(
          `Word document conversion failed: ${err.message}. Please save as PDF and re-upload.`,
        );
      }
    }

    // 4. Fallback for Images (support auto-orientation, paper size, fitMode)
    if (fileType === "IMAGE") {
      try {
        return await this.convertImageWithBuiltin(
          inputFilePath,
          targetPaperSize,
          orientation,
          fitMode,
        );
      } catch (err: any) {
        throw new Error(`Image conversion failed: ${err.message}`);
      }
    }

    // 5. Fallback for Text files
    if (fileType === "TEXT") {
      try {
        const paper =
          targetPaperSize === "4R" || targetPaperSize === "5R"
            ? "A4"
            : targetPaperSize;
        return await this.convertTextWithBuiltin(inputFilePath, paper);
      } catch (err: any) {
        throw new Error(`Text document conversion failed: ${err.message}`);
      }
    }

    throw new Error(
      `File format could not be automatically converted. Please save as PDF and re-upload.`,
    );
  }

  /**
   * Academic-Grounded Adaptive Pixel & Pigment Ink-Coverage Detection:
   * Inspects every page using YCbCr cylindrical chromaticity and RGB channel spread.
   * Classifies pages into 4 tiers:
   *  - Tier 0: Monochrome (B&W) @ ₱3.00
   *  - Tier 1: Spot / Logo Accent Color @ ₱8.00
   *  - Tier 2: Medium Color Graphic / Charts / Slides @ ₱15.00
   *  - Tier 3: Heavy / Full Photo Color @ ₱20.00
   */
  async analyzePdf(
    pdfPath: string,
    sourceImages?: string[],
  ): Promise<DocumentConversionResult> {
    const pdfBytes = await fs.readFile(pdfPath);
    let pdfDoc: PDFDocument;

    try {
      pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: false });
    } catch (err: any) {
      if (
        err.message?.includes("encrypted") ||
        err.name?.includes("Encrypted")
      ) {
        throw new Error(
          "This PDF is password-protected. Please ask the customer to unlock it before printing.",
        );
      }
      throw new Error(`Could not load PDF for analysis: ${err.message}`);
    }

    const totalPages = pdfDoc.getPageCount();
    const pageBreakdown: PageColorAnalysis[] = [];

    // If source image paths are provided (e.g. from single/multi-image upload), analyze them directly
    if (sourceImages && sourceImages.length > 0) {
      for (let i = 0; i < totalPages; i++) {
        const imgPath = sourceImages[Math.min(i, sourceImages.length - 1)];
        if (imgPath && fsSync.existsSync(imgPath)) {
          const imgBuf = await fs.readFile(imgPath);
          const pageAnalysis = await this.analyzeRasterImageBuffer(
            imgBuf,
            i + 1,
          );
          pageBreakdown.push(pageAnalysis);
        } else {
          pageBreakdown.push({
            pageNumber: i + 1,
            tier: 0,
            tierName: "Monochrome (B&W)",
            unitPrice: 3.0,
            estimatedCoverage: "Standard Page",
          });
        }
      }
    } else {
      // True Per-Page PDF Stream & XObject Chromaticity Analysis
      for (let i = 0; i < totalPages; i++) {
        const page = pdfDoc.getPage(i);

        // 1. Inspect page content stream for vector color operators
        const decodeStream = (streamObj: any): string => {
          if (!streamObj || typeof streamObj.getContents !== "function")
            return "";
          const bytes = streamObj.getContents();
          try {
            return zlib.inflateSync(Buffer.from(bytes)).toString("latin1");
          } catch {
            try {
              return zlib.unzipSync(Buffer.from(bytes)).toString("latin1");
            } catch {
              return Buffer.from(bytes).toString("latin1");
            }
          }
        };

        const contents = page.node.Contents();
        let contentString = "";
        if (contents) {
          if (typeof (contents as any).asArray === "function") {
            for (const ref of (contents as any).asArray()) {
              const stream = pdfDoc.context.lookup(ref);
              contentString += " " + decodeStream(stream);
            }
          } else if (typeof (contents as any).size === "function") {
            for (let j = 0; j < (contents as any).size(); j++) {
              const s = (contents as any).get(j);
              const stream = s ? pdfDoc.context.lookup(s) || s : null;
              contentString += " " + decodeStream(stream);
            }
          } else {
            contentString = decodeStream(contents);
          }
        }

        // Check for vector color operators (rg, RG, k, K)
        const rgMatches =
          contentString.match(
            /([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+[rR][gG]/g,
          ) || [];
        let chromaticRgCount = 0;
        for (const m of rgMatches) {
          const parts = m.trim().split(/\s+/);
          const r = parseFloat(parts[0]);
          const g = parseFloat(parts[1]);
          const b = parseFloat(parts[2]);
          if (Math.abs(r - g) > 0.05 || Math.abs(g - b) > 0.05) {
            chromaticRgCount++;
          }
        }

        const kMatches =
          contentString.match(
            /([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s+[kK]/g,
          ) || [];
        let chromaticKCount = 0;
        for (const m of kMatches) {
          const parts = m.trim().split(/\s+/);
          const c = parseFloat(parts[0]);
          const mVal = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          if (c > 0.05 || mVal > 0.05 || y > 0.05) {
            chromaticKCount++;
          }
        }

        const pageSize = page.getSize();
        const pageAreaPts = (pageSize.width || 595) * (pageSize.height || 842);

        // Find image placement dimensions in content stream (e.g. "150.0 0 0 112.5 x y cm /I1 Do")
        const imagePlacements: Record<string, number> = {};
        const cmDoRegex =
          /([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+([0-9.-]+)\s+cm\s*(\/[a-zA-Z0-9_]+)\s+Do/g;
        let cmMatch;
        while ((cmMatch = cmDoRegex.exec(contentString)) !== null) {
          const w = Math.abs(parseFloat(cmMatch[1]));
          const h = Math.abs(parseFloat(cmMatch[4]));
          const name = cmMatch[7];
          const areaFraction = Math.min(1.0, (w * h) / pageAreaPts);
          imagePlacements[name] = Math.max(
            imagePlacements[name] || 0,
            areaFraction,
          );
        }

        // 2. Check XObject images embedded on THIS specific page
        let imageContribution = 0;
        let imageCount = 0;

        const resources = page.node.Resources();
        if (resources) {
          const xobjRef = resources.lookup(PDFName.of("XObject"));
          if (xobjRef && typeof (xobjRef as any).entries === "function") {
            const entries = (xobjRef as any).entries();
            for (const [name, objRef] of entries) {
              const xobj = pdfDoc.context.lookup(objRef);
              if (xobj && (xobj as any).dict) {
                const subtype = (xobj as any).dict.lookup(
                  PDFName.of("Subtype"),
                );
                if (subtype && subtype.asString() === "/Image") {
                  imageCount++;
                  const cs = (xobj as any).dict.lookup(
                    PDFName.of("ColorSpace"),
                  );
                  const csStr = cs ? cs.toString() : "";
                  const isColorCs =
                    csStr.includes("RGB") ||
                    csStr.includes("CMYK") ||
                    csStr.includes("ICCBased") ||
                    csStr.includes("DeviceRGB");

                  if (isColorCs) {
                    const nameStr = name.asString();
                    const areaFraction =
                      imagePlacements[nameStr] !== undefined
                        ? imagePlacements[nameStr]
                        : 0.12;

                    if (typeof (xobj as any).getContents === "function") {
                      try {
                        const rawBytes = (xobj as any).getContents();
                        const filter = (xobj as any).dict.lookup(
                          PDFName.of("Filter"),
                        );
                        const filterStr = filter ? filter.toString() : "";

                        if (
                          filterStr.includes("DCTDecode") &&
                          rawBytes.length > 0
                        ) {
                          const imgBuf = Buffer.from(rawBytes);
                          const imgAnalysis =
                            await this.analyzeRasterImageBuffer(imgBuf, i + 1);
                          imageContribution +=
                            areaFraction * (imgAnalysis.chromaticRatio || 0.4);
                        } else {
                          imageContribution += areaFraction * 0.35;
                        }
                      } catch {
                        imageContribution += areaFraction * 0.35;
                      }
                    } else {
                      imageContribution += areaFraction * 0.35;
                    }
                  }
                }
              }
            }
          }
        }

        // Calculate combined page chromatic ratio using configurable parameters
        const config = getPricingConfig();
        const hasVectorColor = chromaticRgCount + chromaticKCount > 0;
        const vectorContribution = hasVectorColor
          ? Math.min(
              config.mathParams.vectorMaxContribution,
              Math.max(
                config.mathParams.vectorBaseContribution,
                (chromaticRgCount + chromaticKCount) * config.mathParams.vectorTokenMultiplier,
              ),
            )
          : 0;

        const totalEstimatedChromaticRatio = Math.min(
          1.0,
          vectorContribution + imageContribution,
        );

        const classification = classifyColorTier(totalEstimatedChromaticRatio, false, config);

        pageBreakdown.push({
          pageNumber: i + 1,
          tier: classification.tier,
          tierName: classification.tierName,
          unitPrice: classification.unitPrice,
          estimatedCoverage: classification.estimatedCoverage,
          chromaticRatio: Number(totalEstimatedChromaticRatio.toFixed(4)),
        });
      }
    }

    const monochromePageCount = pageBreakdown.filter(
      (p) => p.tier === 0,
    ).length;
    const accentColorPageCount = pageBreakdown.filter(
      (p) => p.tier === 1,
    ).length;
    const mediumColorPageCount = pageBreakdown.filter(
      (p) => p.tier === 2,
    ).length;
    const heavyColorPageCount = pageBreakdown.filter(
      (p) => p.tier === 3,
    ).length;

    const suggestedAdaptiveTotal = pageBreakdown.reduce(
      (sum, p) => sum + p.unitPrice,
      0,
    );
    const flatColorTotal = totalPages * 20.0;
    const customerSavings = Math.max(
      0,
      flatColorTotal - suggestedAdaptiveTotal,
    );

    const firstPage = pdfDoc.getPage(0);
    const { width, height } = firstPage.getSize();
    let pageSize: PaperSize = "A4";

    if (Math.abs(width - 612) < 25 && Math.abs(height - 792) < 25) {
      pageSize = "Letter";
    } else if (Math.abs(width - 612) < 25 && Math.abs(height - 936) < 30) {
      pageSize = "Long";
    } else if (Math.abs(width - 612) < 25 && Math.abs(height - 1008) < 30) {
      pageSize = "Legal";
    } else if (Math.abs(width - 288) < 25 && Math.abs(height - 432) < 25) {
      pageSize = "4R";
    } else if (Math.abs(width - 360) < 25 && Math.abs(height - 504) < 25) {
      pageSize = "5R";
    } else if (Math.abs(width - 595) < 25 && Math.abs(height - 842) < 25) {
      pageSize = "A4";
    }

    return {
      convertedPdfPath: pdfPath,
      totalPages,
      pageSize,
      pageBreakdown,
      monochromePageCount,
      accentColorPageCount,
      mediumColorPageCount,
      heavyColorPageCount,
      suggestedAdaptiveTotal: Number(suggestedAdaptiveTotal.toFixed(2)),
      flatColorTotal: Number(flatColorTotal.toFixed(2)),
      customerSavings: Number(customerSavings.toFixed(2)),
    };
  }

  /**
   * Parses user page range input strings like '1', '1-3', '1, 3, 5', '2-5, 8', 'all'
   * into 0-indexed page numbers strictly bounded by totalPages.
   */
  parsePageRangeToIndices(
    pageRangeStr: string | undefined,
    totalPages: number,
  ): number[] {
    if (!pageRangeStr || pageRangeStr.trim().toLowerCase() === "all") {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const indices = new Set<number>();
    const parts = pageRangeStr
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    for (const part of parts) {
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-").map((s) => s.trim());
        const start = startStr ? parseInt(startStr, 10) : 1;
        const end = endStr ? parseInt(endStr, 10) : totalPages;
        if (!isNaN(start) && !isNaN(end)) {
          const minP = Math.max(1, Math.min(start, end));
          const maxP = Math.min(totalPages, Math.max(start, end));
          for (let p = minP; p <= maxP; p++) {
            indices.add(p - 1);
          }
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
          indices.add(pageNum - 1);
        }
      }
    }

    const sortedIndices = Array.from(indices).sort((a, b) => a - b);
    return sortedIndices.length > 0
      ? sortedIndices
      : Array.from({ length: totalPages }, (_, i) => i);
  }

  /**
   * Extracts specified page ranges from a source PDF and writes the subset to targetPdfPath.
   * Guarantees that only the requested pages physically exist in the output PDF sent to spooler.
   */
  async extractPdfPages(
    sourcePdfPath: string,
    pageRangeStr: string | undefined,
    targetPdfPath: string,
  ): Promise<{ extractedPageCount: number; targetPdfPath: string }> {
    const pdfBytes = await fs.readFile(sourcePdfPath);
    const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    const selectedIndices = this.parsePageRangeToIndices(
      pageRangeStr,
      totalPages,
    );

    if (
      selectedIndices.length === totalPages &&
      sourcePdfPath === targetPdfPath
    ) {
      return { extractedPageCount: totalPages, targetPdfPath: sourcePdfPath };
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    const outputBytes = await newDoc.save();
    await fs.mkdir(path.dirname(targetPdfPath), { recursive: true });
    await fs.writeFile(targetPdfPath, outputBytes);

    return {
      extractedPageCount: selectedIndices.length,
      targetPdfPath,
    };
  }
}
