import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PrinterStatus {
  isOnline: boolean;
  state: 'idle' | 'printing' | 'stopped' | 'unknown';
  message: string;
  inkLevels?: {
    black: number;
    cyan: number;
    magenta: number;
    yellow: number;
  };
}

export interface PrintOptions {
  printerName?: string;
  paperSize: '4R' | 'A4' | 'Letter' | 'Legal';
  paperType: 'GLOSSY_PHOTO' | 'MATTE_PHOTO' | 'PLAIN_PAPER';
  copies?: number;
  isDuplex?: boolean;
}

export class CupsDriverService {
  private defaultPrinter = 'HP_Smart_Tank_670';

  /**
   * Checks real-time printer status using lpstat and HPLIP
   */
  async getPrinterStatus(): Promise<PrinterStatus> {
    try {
      const { stdout } = await execAsync(`lpstat -p ${this.defaultPrinter}`);
      const isOnline = stdout.includes('is idle') || stdout.includes('is processing');
      let state: PrinterStatus['state'] = 'unknown';

      if (stdout.includes('is idle')) state = 'idle';
      else if (stdout.includes('is processing') || stdout.includes('printing')) state = 'printing';
      else if (stdout.includes('is stopped') || stdout.includes('disabled')) state = 'stopped';

      return {
        isOnline,
        state,
        message: stdout.trim(),
      };
    } catch (error: any) {
      // In development or when printer is offline
      return {
        isOnline: false,
        state: 'stopped',
        message: error.message || 'Printer unreachable',
      };
    }
  }

  /**
   * Dispatches a print-ready PDF directly to the HP Smart Tank 670 via CUPS.
   * Maps media types to HP driver attributes.
   */
  async dispatchJob(pdfPath: string, options: PrintOptions): Promise<{ cupsJobId: string }> {
    const printer = options.printerName || this.defaultPrinter;
    const copies = options.copies || 1;

    let mediaArg = 'media=A4';
    if (options.paperSize === '4R') {
      // Custom 4x6 inch borderless for HP Smart Tank 670
      mediaArg = 'media=Custom.4x6in.Borderless';
    }

    let mediaTypeArg = 'MediaType=Plain';
    let qualityArg = 'print-quality=4';
    if (options.paperType === 'GLOSSY_PHOTO') {
      mediaTypeArg = 'MediaType=PhotographicGlossy';
      qualityArg = 'print-quality=5'; // Max photo resolution
    }

    const duplexArg = options.isDuplex ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';

    const command = `lp -d ${printer} -n ${copies} -o ${mediaArg} -o ${mediaTypeArg} -o ${qualityArg} ${duplexArg} "${pdfPath}"`;

    try {
      const { stdout } = await execAsync(command);
      // stdout format: "request id is HP_Smart_Tank_670-123 (1 file(s))"
      const match = stdout.match(/request id is ([^\s]+)/);
      const cupsJobId = match ? match[1] : 'JOB_SUBMITTED';

      return { cupsJobId };
    } catch (error: any) {
      throw new Error(`Failed to dispatch print job to CUPS: ${error.message}`);
    }
  }
}
