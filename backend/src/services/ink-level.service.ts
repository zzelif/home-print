import { exec } from 'child_process';
import { promisify } from 'util';
import { getDatabase } from '../db/database';

const execAsync = promisify(exec);

export interface InkLevels {
  black: number;       // 0–100 percentage
  cyan: number;
  magenta: number;
  yellow: number;
  readAt: string;      // ISO timestamp
  source: 'hplip' | 'snmp' | 'ipp' | 'cached' | 'unavailable';
  printerName?: string;
  printerIp?: string | null;
}

export interface NozzleCheckResult {
  success: boolean;
  message: string;
  jobId?: string;
}

export interface PrinterQueueJob {
  jobId: string;
  documentName: string;
  owner: string;
  status: string;
  size: string;
  submittedAt: string;
  pagesPrinted?: number;
}

export interface CupsQueueStatus {
  queueName: string;
  state: string;
  isEnabled: boolean;
  isAccepting: boolean;
  jobs: PrinterQueueJob[];
}

const INK_CACHE_PREFIX = 'cached_ink_levels';
const INK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute TTL

export class InkLevelService {
  /**
   * Reads real ink tank percentages dynamically for any specified or active default printer.
   *
   * Strategy (in priority order):
   * 1. HPLIP `hp-levels` — most accurate, reads actual hardware tank sensors
   * 2. HPLIP `hp-info` — broader output, parse ink section
   * 3. IPP Get-Printer-Attributes `printer-supply` — standard IPP Everywhere
   * 4. Return cached SQLite value per-printer if all live reads fail
   */
  async getInkLevels(printerName?: string, printerIp?: string): Promise<InkLevels> {
    const resolvedName = printerName || (await this.resolveDefaultQueueName());
    const ip = printerIp ?? (await this.resolvePrinterIp(resolvedName));
    const cacheKey = this.getCacheKey(ip, resolvedName);

    // Attempt live reads in order of reliability
    if (ip) {
      const hplipLevels = await this.readViaHplip(ip);
      if (hplipLevels) {
        const result: InkLevels = {
          ...hplipLevels,
          printerName: resolvedName,
          printerIp: ip,
        };
        await this.cacheInkLevels(cacheKey, result);
        return result;
      }

      const ippLevels = await this.readViaIppAttributes(ip);
      if (ippLevels) {
        const result: InkLevels = {
          ...ippLevels,
          printerName: resolvedName,
          printerIp: ip,
        };
        await this.cacheInkLevels(cacheKey, result);
        return result;
      }
    }

    // Fall back to SQLite cache for this specific printer
    const cached = await this.getCachedInkLevels(cacheKey);
    if (cached) {
      return {
        ...cached,
        printerName: resolvedName,
        printerIp: ip,
      };
    }

    // Return unknown state
    return {
      black: -1,
      cyan: -1,
      magenta: -1,
      yellow: -1,
      readAt: new Date().toISOString(),
      source: 'unavailable',
      printerName: resolvedName,
      printerIp: ip,
    };
  }

  /**
   * Triggers an HP nozzle check print using HPLIP or a CUPS test page.
   */
  async printNozzleCheck(printerName?: string, printerIp?: string): Promise<NozzleCheckResult> {
    const ip = printerIp ?? (await this.resolveDefaultPrinterIp());
    const queue = printerName ?? (await this.resolveDefaultQueueName());

    // Strategy 1: HPLIP hp-check (most hardware-accurate)
    if (ip) {
      try {
        await execAsync(`hp-check -d ${ip} --nozzle 2>/dev/null`, { timeout: 30000 });
        return { success: true, message: 'HP nozzle check page sent to printer.' };
      } catch {}

      // Strategy 2: hp-testpage via HPLIP
      try {
        await execAsync(`hp-testpage -d ${ip} 2>/dev/null`, { timeout: 30000 });
        return { success: true, message: 'HP test page sent to printer.' };
      } catch {}
    }

    // Strategy 3: CUPS built-in test page via lp
    if (queue) {
      try {
        const { stdout } = await execAsync(
          `lp -d "${queue}" /usr/share/cups/data/testprint 2>/dev/null`,
          { timeout: 15000 }
        );
        const match = stdout.match(/request id is ([^\s]+)/);
        return {
          success: true,
          message: 'CUPS test page sent to printer.',
          jobId: match ? match[1] : undefined,
        };
      } catch {}
    }

    return {
      success: false,
      message: 'Nozzle check unavailable — ensure HPLIP is installed on the host and the printer is reachable.',
    };
  }

  /**
   * Returns the current CUPS queue state and active jobs using lpstat.
   */
  async getCupsQueueStatus(queueName?: string): Promise<CupsQueueStatus> {
    const queue = queueName ?? (await this.resolveDefaultQueueName());

    const status: CupsQueueStatus = {
      queueName: queue,
      state: 'unknown',
      isEnabled: false,
      isAccepting: false,
      jobs: [],
    };

    if (process.platform === 'win32') {
      status.state = 'windows-spooler';
      return status;
    }

    // Queue enabled state
    try {
      const { stdout: enabledOut } = await execAsync(`lpstat -p "${queue}" 2>/dev/null`);
      status.isEnabled = enabledOut.toLowerCase().includes('enabled');
      if (enabledOut.toLowerCase().includes('idle')) status.state = 'idle';
      else if (enabledOut.toLowerCase().includes('printing')) status.state = 'printing';
      else if (enabledOut.toLowerCase().includes('stopped')) status.state = 'stopped';
    } catch {}

    // Accepting state
    try {
      const { stdout: acceptOut } = await execAsync(`cupsaccept --help 2>/dev/null; lpstat -a "${queue}" 2>/dev/null`);
      status.isAccepting = acceptOut.toLowerCase().includes('accepting');
    } catch {}

    // Active jobs
    try {
      const { stdout: jobsOut } = await execAsync(`lpstat -o "${queue}" 2>/dev/null`);
      const lines = jobsOut.split('\n').filter(Boolean);
      for (const line of lines) {
        // Format: HP_Smart_Tank_670-123 pi 12345 date-time
        const match = line.match(/^([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+(.+)$/);
        if (match) {
          status.jobs.push({
            jobId: match[1],
            owner: match[2],
            size: match[3],
            documentName: '',
            status: 'printing',
            submittedAt: match[4] ?? new Date().toISOString(),
          });
        }
      }

      // Enrich with detailed job names via lpstat -l
      try {
        const { stdout: detailOut } = await execAsync(`lpstat -l -o "${queue}" 2>/dev/null`);
        const nameMatches = [...detailOut.matchAll(/Title:\s+(.+)/g)];
        status.jobs.forEach((job, i) => {
          if (nameMatches[i]) job.documentName = nameMatches[i][1].trim();
        });
      } catch {}
    } catch {}

    return status;
  }

  /**
   * Cancels a specific CUPS job by ID.
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    if (process.platform === 'win32') {
      return { success: false, message: 'Job cancellation not supported on Windows.' };
    }
    try {
      await execAsync(`cancel "${jobId}" 2>/dev/null`);
      return { success: true, message: `Job ${jobId} cancelled.` };
    } catch (err: any) {
      return { success: false, message: `Could not cancel job ${jobId}: ${err.message}` };
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async readViaHplip(ip: string): Promise<InkLevels | null> {
    const commands = [
      `hp-levels -d ${ip} 2>/dev/null`,
      `hp-info -d ${ip} 2>/dev/null`,
    ];

    for (const cmd of commands) {
      try {
        const { stdout } = await execAsync(cmd, { timeout: 10000 });
        const levels = this.parseHplipOutput(stdout);
        if (levels) return { ...levels, source: 'hplip', readAt: new Date().toISOString() };
      } catch {}
    }
    return null;
  }

  private parseHplipOutput(output: string): Omit<InkLevels, 'source' | 'readAt'> | null {
    // HPLIP hp-levels output format:
    // Black(0):  80%
    // Cyan(1):   65%
    // Magenta(2): 45%
    // Yellow(3): 90%
    const levels: Record<string, number> = {};
    const colorPatterns: Array<[RegExp, string]> = [
      // hp-levels format: "Black(0): 85%" or "Black: 85%"
      [/^[\s]*black\s*(?:\(\d+\))?\s*:\s*(\d+)\s*%/im, 'black'],
      [/^[\s]*cyan\s*(?:\(\d+\))?\s*:\s*(\d+)\s*%/im, 'cyan'],
      [/^[\s]*magenta\s*(?:\(\d+\))?\s*:\s*(\d+)\s*%/im, 'magenta'],
      [/^[\s]*yellow\s*(?:\(\d+\))?\s*:\s*(\d+)\s*%/im, 'yellow'],
      // HP Smart Tank ink bottle labels: "HP 310 Black Ink Bottle: 80%" (color before Ink keyword)
      [/black\s+ink.*?:\s*(\d+)\s*%/i, 'black'],
      [/cyan\s+ink.*?:\s*(\d+)\s*%/i, 'cyan'],
      [/magenta\s+ink.*?:\s*(\d+)\s*%/i, 'magenta'],
      [/yellow\s+ink.*?:\s*(\d+)\s*%/i, 'yellow'],
      // Generic fallback: any line with color keyword and number%
      [/\bblack\b.*?(\d+)\s*%/i, 'black'],
      [/\bcyan\b.*?(\d+)\s*%/i, 'cyan'],
      [/\bmagenta\b.*?(\d+)\s*%/i, 'magenta'],
      [/\byellow\b.*?(\d+)\s*%/i, 'yellow'],
    ];

    for (const [pattern, color] of colorPatterns) {
      if (levels[color] !== undefined) continue; // already found
      const match = output.match(pattern);
      if (match) levels[color] = parseInt(match[1], 10);
    }

    if (Object.keys(levels).length === 0) return null;

    return {
      black: levels['black'] ?? -1,
      cyan: levels['cyan'] ?? -1,
      magenta: levels['magenta'] ?? -1,
      yellow: levels['yellow'] ?? -1,
    };
  }

  private async readViaIppAttributes(ip: string): Promise<InkLevels | null> {
    // Use ipptool to query printer-supply attributes via IPP Everywhere
    try {
      const { stdout } = await execAsync(
        `ipptool -v "ipp://${ip}:631/ipp/print" get-printer-attributes.test 2>/dev/null | grep -i 'supply\\|ink\\|toner' | head -30`,
        { timeout: 8000 }
      );

      if (!stdout.trim()) return null;

      // Parse printer-supply-info lines such as:
      // printer-supply-info (1setOf 1setOf textWithLanguage) = ...
      // HP 310 Black Ink Bottle = 80%
      const levels = this.parseIppSupplyOutput(stdout);
      if (levels) return { ...levels, source: 'ipp', readAt: new Date().toISOString() };
    } catch {}
    return null;
  }

  private parseIppSupplyOutput(output: string): Omit<InkLevels, 'source' | 'readAt'> | null {
    const result: Omit<InkLevels, 'source' | 'readAt'> = { black: -1, cyan: -1, magenta: -1, yellow: -1 };
    let found = false;

    // IPP supply output patterns vary; try numeric percentage extraction by color keyword
    const colorMap: Array<[RegExp, keyof typeof result]> = [
      [/black.*?(\d+)%/i, 'black'],
      [/cyan.*?(\d+)%/i, 'cyan'],
      [/magenta.*?(\d+)%/i, 'magenta'],
      [/yellow.*?(\d+)%/i, 'yellow'],
    ];

    for (const [pattern, key] of colorMap) {
      const match = output.match(pattern);
      if (match) {
        (result[key] as number) = parseInt(match[1], 10);
        found = true;
      }
    }

    return found ? result : null;
  }

  private getCacheKey(ip: string | null, printerName: string): string {
    if (ip) {
      return `${INK_CACHE_PREFIX}_${ip.replace(/\./g, '_')}`;
    }
    const clean = printerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${INK_CACHE_PREFIX}_${clean}`;
  }

  private async cacheInkLevels(cacheKey: string, levels: InkLevels): Promise<void> {
    try {
      const db = getDatabase();
      const nowIso = new Date().toISOString(); // Use JS ISO to avoid SQLite timezone ambiguity
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `).run(cacheKey, JSON.stringify(levels), nowIso);
    } catch {}
  }

  private async getCachedInkLevels(cacheKey: string = INK_CACHE_PREFIX): Promise<InkLevels | null> {
    try {
      const db = getDatabase();
      const row = db.prepare("SELECT value, updated_at FROM system_settings WHERE key = ?")
        .get(cacheKey) as { value: string; updated_at: string } | undefined;
      if (!row) return null;

      const cached: InkLevels = JSON.parse(row.value);
      const age = Date.now() - new Date(row.updated_at).getTime();
      if (age > INK_CACHE_TTL_MS) return null; // stale

      return { ...cached, source: 'cached' };
    } catch {
      return null;
    }
  }

  private async resolvePrinterIp(printerName?: string): Promise<string | null> {
    if (printerName) {
      // 1. Direct IP check inside printerName (e.g. 192.168.1.60 or HP_Smart_Tank_192_168_1_60)
      const dotMatch = printerName.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (dotMatch) return dotMatch[1];

      const underMatch = printerName.match(/(\d{1,3})_(\d{1,3})_(\d{1,3})_(\d{1,3})/);
      if (underMatch) return `${underMatch[1]}.${underMatch[2]}.${underMatch[3]}.${underMatch[4]}`;

      // 2. Query manual_printers table by name or ID
      try {
        const db = getDatabase();
        const manualRow = db.prepare("SELECT ip_address FROM manual_printers WHERE name = ? OR id = ?").get(printerName, printerName) as { ip_address: string } | undefined;
        if (manualRow?.ip_address) return manualRow.ip_address;
      } catch {}

      // 3. Query CUPS lpstat for device URI
      if (process.platform !== 'win32') {
        try {
          const { stdout } = await execAsync(`lpstat -v "${printerName}" 2>/dev/null`);
          const uriMatch = stdout.match(/ipp:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
          if (uriMatch) return uriMatch[1];
        } catch {}
      }
    }

    return this.resolveDefaultPrinterIp();
  }

  private async resolveDefaultPrinterIp(): Promise<string | null> {
    try {
      const db = getDatabase();

      // Check for explicit IP setting
      const ipRow = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_ip'")
        .get() as { value: string } | undefined;
      if (ipRow?.value) return ipRow.value;

      // Extract IP from default printer name (e.g., HP_Smart_Tank_192_168_1_60)
      const nameRow = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'")
        .get() as { value: string } | undefined;
      if (nameRow?.value) {
        const ipMatch = nameRow.value.match(/(\d{1,3})_(\d{1,3})_(\d{1,3})_(\d{1,3})/);
        if (ipMatch) return `${ipMatch[1]}.${ipMatch[2]}.${ipMatch[3]}.${ipMatch[4]}`;

        const dotMatch = nameRow.value.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
        if (dotMatch) return dotMatch[1];
      }

      // Try manual_printers table
      const manual = db.prepare("SELECT ip_address FROM manual_printers ORDER BY created_at DESC LIMIT 1")
        .get() as { ip_address: string } | undefined;
      if (manual?.ip_address) return manual.ip_address;
    } catch {}
    return null;
  }

  private async resolveDefaultQueueName(): Promise<string> {
    try {
      const db = getDatabase();
      const row = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'")
        .get() as { value: string } | undefined;
      if (row?.value) return row.value;

      if (process.platform !== 'win32') {
        const { stdout } = await execAsync('lpstat -d 2>/dev/null').catch(() => ({ stdout: '' }));
        const match = stdout.match(/system default destination:\s*(.+)$/i);
        if (match && match[1].trim()) return match[1].trim();
      }
    } catch {}
    return 'Default_Printer';
  }
}
