import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import net from 'net';
import { getDatabase } from '../db/database';

import { PrinterDiscoveryService } from './printer-discovery.service';

const execAsync = promisify(exec);

export interface PrinterStatus {
  isOnline: boolean;
  state: 'idle' | 'printing' | 'stopped' | 'disconnected';
  message: string;
  activePrinterName: string;
  jobCount?: number;
  inkLevels?: {
    black: number;
    cyan: number;
    magenta: number;
    yellow: number;
  };
}

export interface PrintOptions {
  printerName?: string;
  paperSize?: '4R' | 'A4' | 'Letter' | 'Long' | 'Legal';
  paperType?: 'GLOSSY_PHOTO' | 'MATTE_PHOTO' | 'PLAIN_PAPER';
  copies?: number;
  isDuplex?: boolean;
  pageRange?: string;
}

export interface SpoolJob {
  id: string;
  documentName: string;
  printerName: string;
  status: 'PENDING' | 'PRINTING' | 'COMPLETED' | 'PAUSED' | 'ERROR';
  totalPages: number;
  submittedAt: string;
}

export class CupsDriverService {
  private printerDiscovery = new PrinterDiscoveryService();

  /**
   * Ensures CUPS daemon is active on Linux hosts / containers.
   */
  private async ensureCupsRunning(): Promise<void> {
    if (process.platform === 'win32') return;
    try {
      await execAsync('lpstat -r 2>/dev/null || service cups start 2>/dev/null || /etc/init.d/cups start 2>/dev/null || true');
    } catch {}
  }

  /**
   * Resolves the active default printer from system settings.
   */
  async getActivePrinterName(): Promise<string> {
    const db = getDatabase();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'").get() as { value: string } | undefined;
    if (row && row.value) return row.value;

    if (process.platform !== 'win32') {
      try {
        const { stdout } = await execAsync('lpstat -d');
        const match = stdout.match(/system default destination:\s*(.+)$/i);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
      } catch {}
    }
    return 'Default_Printer';
  }

  /**
   * Checks real-time printer status with truthful physical reachability probing.
   */
  async getPrinterStatus(): Promise<PrinterStatus> {
    const printerName = await this.getActivePrinterName();
    const reachability = await this.printerDiscovery.checkPrinterReachability(printerName);

    const isOnline = reachability.isOnline;
    const message = isOnline
      ? `${printerName} is Ready`
      : `${printerName} is Offline (Check Cable / Power)`;

    return {
      isOnline,
      state: isOnline ? 'idle' : 'disconnected',
      message,
      activePrinterName: printerName,
    };
  }

  /**
   * Dispatches a print job to the target printer.
   */
  async dispatchJob(pdfPath: string, options: PrintOptions): Promise<{ cupsJobId: string; message: string }> {
    const printer = options.printerName || (await this.getActivePrinterName());
    const copies = options.copies || 1;

    if (process.platform === 'win32') {
      try {
        // Direct Windows Print Spooler dispatch via native pdf-to-printer
        const ptp = await import('pdf-to-printer');
        const ptpOptions: any = {
          printer,
          copies,
        };
        if (options.paperSize === '4R') {
          ptpOptions.paperSize = 'Custom.4x6in';
        } else if (options.paperSize) {
          ptpOptions.paperSize = options.paperSize;
        }

        await ptp.print(pdfPath, ptpOptions);

        return {
          cupsJobId: `win_${Date.now()}`,
          message: `Dispatched directly to "${printer}" via Windows Hardware Spooler`,
        };
      } catch (err: any) {
        throw new Error(`Windows hardware spool error for "${printer}": ${err.message}`);
      }
    }

    // Linux Print Dispatch: Standard CUPS Queue via IPP Everywhere Driverless
    await this.ensureCupsRunning();

    // 1. Resolve target IP address if printer is a network printer
    let targetIp: string | null = null;
    const ipMatch = printer.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    if (ipMatch) {
      targetIp = ipMatch[1];
    } else {
      const db = getDatabase();
      const manualRow = db.prepare("SELECT ip_address FROM manual_printers WHERE name = ? OR id = ?").get(printer, printer) as { ip_address: string } | undefined;
      if (manualRow) {
        targetIp = manualRow.ip_address;
      }
    }

    const cleanQueueName = targetIp 
      ? `HP_Smart_Tank_${targetIp.replace(/\./g, '_')}`
      : printer.replace(/[^a-zA-Z0-9_-]/g, '_');

    let activeQueueName = cleanQueueName;

    // 2. Resolve or Register CUPS Queue
    if (targetIp) {
      const deviceUri = `ipp://${targetIp}:631/ipp/print`;
      try {
        // Check if any existing CUPS queue is already connected to target IP
        const { stdout: lpstatOut } = await execAsync('lpstat -v 2>/dev/null').catch(() => ({ stdout: '' }));
        let existingMatchedQueue: string | null = null;
        for (const line of lpstatOut.split('\n')) {
          if (line.includes(targetIp)) {
            const match = line.match(/^device for ([^:]+):/i);
            if (match) {
              existingMatchedQueue = match[1].trim();
              break;
            }
          }
        }

        if (existingMatchedQueue) {
          activeQueueName = existingMatchedQueue;
        } else {
          // Attempt IPP Everywhere / Driverless queue creation
          let registered = false;

          try {
            await execAsync(`lpadmin -p "${cleanQueueName}" -E -v "${deviceUri}" -m everywhere 2>/dev/null`);
            registered = true;
          } catch {}

          if (!registered) {
            try {
              await execAsync(`lpadmin -p "${cleanQueueName}" -E -v "ipp://${targetIp}/ipp/print" -m everywhere 2>/dev/null`);
              registered = true;
            } catch {}
          }

          if (!registered) {
            try {
              await execAsync(`lpadmin -p "${cleanQueueName}" -E -v "${deviceUri}" -m drv:///sample.drv/generic.ppd 2>/dev/null`);
              registered = true;
            } catch {}
          }

          await execAsync(`cupsenable "${cleanQueueName}" 2>/dev/null || true`);
          await execAsync(`cupsaccept "${cleanQueueName}" 2>/dev/null || true`);
          activeQueueName = cleanQueueName;
        }
      } catch (err: any) {
        console.warn(`CUPS queue setup notice for ${cleanQueueName}: ${err.message}`);
      }
    }

    let mediaArg = 'media=A4';
    if (options.paperSize === '4R') {
      mediaArg = 'media=Custom.4x6in.Borderless';
    } else if (options.paperSize === 'Letter') {
      mediaArg = 'media=Letter';
    } else if (options.paperSize === 'Long' || options.paperSize === 'Legal') {
      mediaArg = 'media=Legal';
    }

    let mediaTypeArg = 'MediaType=Plain';
    let qualityArg = 'print-quality=4';
    if (options.paperType === 'GLOSSY_PHOTO') {
      mediaTypeArg = 'MediaType=PhotographicGlossy';
      qualityArg = 'print-quality=5';
    }

    const duplexArg = options.isDuplex ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
    const pageRangeArg = options.pageRange && options.pageRange !== 'all' ? `-o page-ranges=${options.pageRange}` : '';

    // 3. Dispatch via standard Linux CUPS spooler with raster filters
    try {
      const command = `lp -d "${activeQueueName}" -n ${copies} -o ${mediaArg} -o ${mediaTypeArg} -o ${qualityArg} ${duplexArg} ${pageRangeArg} "${pdfPath}"`.trim();
      const { stdout } = await execAsync(command);
      const match = stdout.match(/request id is ([^\s]+)/);
      const cupsJobId = match ? match[1] : 'JOB_SUBMITTED';
      return { cupsJobId, message: `Dispatched to CUPS queue ${activeQueueName}` };
    } catch (cupsErr: any) {
      console.warn(`CUPS lp command failed (${cupsErr.message}), attempting direct IPP Everywhere dispatch via ipptool...`);

      // 4. Direct IPP Protocol Fallback via ipptool over Port 631 (True IPP Everywhere Print-Job)
      if (targetIp) {
        try {
          const ippScriptPath = path.join(os.tmpdir(), `job_${Date.now()}.ipp`);
          const ippScriptContent = `
{
  VERSION 2.0
  OPERATION Print-Job
  GROUP operation-attributes-tag
  ATTR charset "attributes-charset" "utf-8"
  ATTR naturalLanguage "attributes-natural-language" "en"
  ATTR uri "printer-uri" "ipp://${targetIp}:631/ipp/print"
  ATTR name "requesting-user-name" "HomePrint"
  ATTR name "job-name" "${path.basename(pdfPath)}"
  ATTR mimeMediaType "document-format" "application/pdf"
  ATTR integer "copies" ${copies}
  FILE "${pdfPath.replace(/\\/g, '/')}"
}
`.trim();
          await fs.writeFile(ippScriptPath, ippScriptContent);
          await execAsync(`ipptool -v -t "ipp://${targetIp}:631/ipp/print" "${ippScriptPath}"`);
          await fs.unlink(ippScriptPath).catch(() => {});

          return {
            cupsJobId: `ipp_${Date.now()}`,
            message: `Dispatched directly to ${printer} via IPP Everywhere protocol (Port 631)`,
          };
        } catch (ippErr: any) {
          throw new Error(`Print dispatch failed: CUPS error (${cupsErr.message}) and Direct IPP protocol error (${ippErr.message})`);
        }
      }

      throw new Error(`CUPS dispatch failed for "${activeQueueName}": ${cupsErr.message}. Ensure printer at ${targetIp || printer} is online.`);
    }
  }

  /**
   * Generates and prints a real CMYK / Grayscale 300 DPI Hardware Calibration Swatch.
   */
  async printCalibrationSwatch(printerName?: string): Promise<{ success: boolean; pdfPath: string; message: string }> {
    const targetPrinter = printerName || (await this.getActivePrinterName());
    const tempDir = path.resolve(process.cwd(), 'uploads/swatches');
    await fs.mkdir(tempDir, { recursive: true });
    const swatchPath = path.join(tempDir, `calibration_swatch_${Date.now()}.pdf`);

    // Create 300 DPI Test Page (A4: 595.28 x 841.89 pt)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Header
    page.drawText('HomePrint OS — Hardware Calibration & Alignment Swatch', {
      x: 36,
      y: 800,
      size: 14,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Target: ${targetPrinter}  •  Date: ${new Date().toLocaleString()}`, {
      x: 36,
      y: 785,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Outer Margin Alignment Box (10mm from edges)
    page.drawRectangle({
      x: 28.35,
      y: 28.35,
      width: 538.58,
      height: 745.19,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    // CMYK Color Density Swatches
    const colors = [
      { name: 'Cyan 100%', color: rgb(0, 0.7, 0.9) },
      { name: 'Magenta 100%', color: rgb(0.9, 0.1, 0.5) },
      { name: 'Yellow 100%', color: rgb(1, 0.9, 0) },
      { name: 'Black 100%', color: rgb(0, 0, 0) },
      { name: 'Gray 50%', color: rgb(0.5, 0.5, 0.5) },
      { name: 'Gray 25%', color: rgb(0.75, 0.75, 0.75) },
    ];

    let startX = 36;
    const swatchY = 690;
    for (const c of colors) {
      page.drawRectangle({
        x: startX,
        y: swatchY,
        width: 80,
        height: 60,
        color: c.color,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.5,
      });
      page.drawText(c.name, {
        x: startX + 5,
        y: swatchY - 12,
        size: 8,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      startX += 86;
    }

    // Microtext Resolution Test
    page.drawText('Resolution & Sharpness Test (12pt down to 4pt):', {
      x: 36,
      y: 630,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
    const sizes = [12, 10, 8, 6, 5, 4];
    let textY = 615;
    for (const s of sizes) {
      page.drawText(`[${s}pt] The quick brown fox jumps over the lazy dog. 1234567890 @#$%`, {
        x: 36,
        y: textY,
        size: s,
        font: fontRegular,
        color: rgb(0, 0, 0),
      });
      textY -= s + 4;
    }

    // Grid Alignment Crosshairs
    page.drawLine({ start: { x: 297.64, y: 50 }, end: { x: 297.64, y: 400 }, color: rgb(0.8, 0.8, 0.8), thickness: 0.5 });
    page.drawLine({ start: { x: 50, y: 225 }, end: { x: 545, y: 225 }, color: rgb(0.8, 0.8, 0.8), thickness: 0.5 });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(swatchPath, pdfBytes);

    // Dispatch to hardware
    await this.dispatchJob(swatchPath, {
      printerName: targetPrinter,
      paperSize: 'A4',
      paperType: 'PLAIN_PAPER',
      copies: 1,
    });

    return {
      success: true,
      pdfPath: swatchPath,
      message: `Hardware calibration swatch sent directly to ${targetPrinter}!`,
    };
  }

  /**
   * Retrieves active spool jobs from the system print spooler.
   */
  async getActiveSpoolJobs(): Promise<SpoolJob[]> {
    const printerName = await this.getActivePrinterName();
    const spoolJobs: SpoolJob[] = [];

    if (process.platform === 'win32') {
      try {
        const psCommand = `powershell -NoProfile -Command "Get-PrintJob -PrinterName '${printerName}' -ErrorAction SilentlyContinue | Select-Object Id, DocumentName, JobStatus, TotalPages, SubmittedTime | ConvertTo-Json -Compress"`;
        const { stdout } = await execAsync(psCommand);
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of list) {
            spoolJobs.push({
              id: `spool_${item.Id || Date.now()}`,
              documentName: item.DocumentName || 'Print Document',
              printerName,
              status: item.JobStatus?.includes('Printing') ? 'PRINTING' : 'PENDING',
              totalPages: item.TotalPages || 1,
              submittedAt: item.SubmittedTime || new Date().toISOString(),
            });
          }
        }
      } catch {}
    } else {
      try {
        const { stdout } = await execAsync(`lpstat -o "${printerName}"`);
        const lines = stdout.split('\n');
        for (const line of lines) {
          const match = line.match(/^([^\s]+)\s+([^\s]+)\s+(\d+)\s+(.+)$/);
          if (match) {
            spoolJobs.push({
              id: match[1],
              documentName: match[2],
              printerName,
              status: 'PRINTING',
              totalPages: 1,
              submittedAt: match[4],
            });
          }
        }
      } catch {}
    }

    return spoolJobs;
  }
}
