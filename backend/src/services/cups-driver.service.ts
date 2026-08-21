import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PrinterStatus {
  isOnline: boolean;
  state: 'idle' | 'printing' | 'stopped' | 'disconnected';
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
   * Checks real-time printer status using lpstat.
   * Truthful detection: reports disconnected if CUPS is not active or printer is missing.
   */
  async getPrinterStatus(): Promise<PrinterStatus> {
    try {
      const { stdout } = await execAsync(`lpstat -p ${this.defaultPrinter}`);
      const isIdle = stdout.includes('is idle');
      const isProcessing = stdout.includes('is processing') || stdout.includes('printing');
      const isStopped = stdout.includes('is stopped') || stdout.includes('disabled');

      let state: PrinterStatus['state'] = 'disconnected';
      if (isIdle) state = 'idle';
      else if (isProcessing) state = 'printing';
      else if (isStopped) state = 'stopped';

      return {
        isOnline: isIdle || isProcessing,
        state,
        message: stdout.trim(),
      };
    } catch (error: any) {
      // In development or when printer is not physically connected
      return {
        isOnline: false,
        state: 'disconnected',
        message: 'Printer not detected / CUPS service not connected.',
      };
    }
  }

  /**
   * Dispatches print job to CUPS with exact driver flags.
   */
  async dispatchJob(pdfPath: string, options: PrintOptions): Promise<{ cupsJobId: string }> {
    const printer = options.printerName || this.defaultPrinter;
    const copies = options.copies || 1;

    let mediaArg = 'media=A4';
    if (options.paperSize === '4R') {
      mediaArg = 'media=Custom.4x6in.Borderless';
    }

    let mediaTypeArg = 'MediaType=Plain';
    let qualityArg = 'print-quality=4';
    if (options.paperType === 'GLOSSY_PHOTO') {
      mediaTypeArg = 'MediaType=PhotographicGlossy';
      qualityArg = 'print-quality=5';
    }

    const duplexArg = options.isDuplex ? '-o sides=two-sided-long-edge' : '-o sides=one-sided';
    const command = `lp -d ${printer} -n ${copies} -o ${mediaArg} -o ${mediaTypeArg} -o ${qualityArg} ${duplexArg} "${pdfPath}"`;

    try {
      const { stdout } = await execAsync(command);
      const match = stdout.match(/request id is ([^\s]+)/);
      const cupsJobId = match ? match[1] : 'JOB_SUBMITTED';
      return { cupsJobId };
    } catch (error: any) {
      // If running in development on Windows without CUPS
      if (process.platform === 'win32') {
        console.warn(`[DEV MOCK] CUPS not available on Windows. Simulated dispatch of ${pdfPath}`);
        return { cupsJobId: `MOCK_JOB_${Date.now()}` };
      }
      throw new Error(`Failed to dispatch print job to CUPS: ${error.message}`);
    }
  }
}
