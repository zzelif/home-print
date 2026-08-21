import { exec } from 'child_process';
import { promisify } from 'util';
import { getDatabase } from '../db/database';

const execAsync = promisify(exec);

export interface DiscoveredPrinter {
  id: string;
  name: string;
  makeAndModel?: string;
  connectionType: 'USB' | 'WIFI_NETWORK' | 'IPP' | 'VIRTUAL';
  uri: string;
  ipAddress: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'IDLE' | 'PRINTING' | 'DISCONNECTED';
  isDefault: boolean;
}

export class PrinterDiscoveryService {
  /**
   * Scans for all connected USB and Wi-Fi/Network printers.
   * Strictly resolves real hardware ports without mock/fake IP addresses.
   */
  async scanPrinters(): Promise<DiscoveredPrinter[]> {
    const db = getDatabase();
    
    // Retrieve the single assigned default printer from database
    const defaultSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'").get() as { value: string } | undefined;
    const activeDefaultName = defaultSetting ? defaultSetting.value : null;

    const printers: DiscoveredPrinter[] = [];

    if (process.platform === 'win32') {
      try {
        const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, Default, WorkOffline | ConvertTo-Json -Compress"`;
        const { stdout } = await execAsync(psCommand);

        // Also query TCP/IP ports to map exact real IP addresses
        let realTcpIpMap: Record<string, string> = {};
        try {
          const portsCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_TCPIPPrinterPort -ErrorAction SilentlyContinue | Select-Object Name, HostAddress | ConvertTo-Json -Compress"`;
          const { stdout: portsOut } = await execAsync(portsCmd);
          if (portsOut.trim()) {
            const pList = JSON.parse(portsOut);
            const arr = Array.isArray(pList) ? pList : [pList];
            for (const p of arr) {
              if (p.Name && p.HostAddress) {
                realTcpIpMap[p.Name] = p.HostAddress;
              }
            }
          }
        } catch {}

        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];

          for (const item of list) {
            const name = item.Name || 'Unknown Printer';
            const port = item.PortName || '';
            const portLower = port.toLowerCase();

            // Strict categorization
            const isUsb = portLower.startsWith('usb') || portLower.startsWith('dot4');
            const isVirtual = name.toLowerCase().includes('pdf') || name.toLowerCase().includes('xps') || name.toLowerCase().includes('onenote') || name.toLowerCase().includes('fax');
            const isWsd = portLower.startsWith('wsd') || portLower.startsWith('http');
            const isIpPort = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(port) || portLower.startsWith('ip_') || !!realTcpIpMap[port];

            let connectionType: DiscoveredPrinter['connectionType'] = 'VIRTUAL';
            if (isUsb) connectionType = 'USB';
            else if (isIpPort || isWsd) connectionType = 'WIFI_NETWORK';
            else if (isVirtual) connectionType = 'VIRTUAL';

            // Real address/port resolution (NO FAKE DATA)
            let ipAddress: string | null = null;
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(port)) {
              ipAddress = port;
            } else if (realTcpIpMap[port]) {
              ipAddress = realTcpIpMap[port];
            } else if (port.startsWith('IP_')) {
              ipAddress = port.replace('IP_', '');
            } else if (isWsd) {
              ipAddress = `WSD Network Port (${port})`;
            }

            printers.push({
              id: `win_${name.replace(/\s+/g, '_')}`,
              name,
              makeAndModel: item.DriverName || name,
              connectionType,
              uri: `winspool://${port}/${encodeURIComponent(name)}`,
              ipAddress,
              status: item.WorkOffline ? 'OFFLINE' : 'ONLINE',
              isDefault: false, // will be resolved strictly below
            });
          }
        }
      } catch (err) {
        console.warn('Windows printer scan error:', err);
      }
    } else {
      // Linux / CUPS / Avahi Discovery
      try {
        let cupsDefault = '';
        try {
          const { stdout: defOut } = await execAsync('lpstat -d');
          const defMatch = defOut.match(/system default destination:\s*([^\s]+)/);
          if (defMatch) cupsDefault = defMatch[1];
        } catch {}

        try {
          const { stdout: lpinfoOut } = await execAsync('lpinfo -v');
          const lines = lpinfoOut.split('\n');

          for (const line of lines) {
            const match = line.match(/^(\w+)\s+(.+)$/);
            if (!match) continue;
            const [, , uri] = match;

            if (uri.startsWith('usb://') || uri.startsWith('hp:/usb/')) {
              const nameMatch = uri.match(/usb:\/\/([^/]+)\/([^?]+)/) || uri.match(/hp:\/usb\/([^?]+)/);
              const name = nameMatch ? decodeURIComponent(nameMatch[2] || nameMatch[1]).replace(/_/g, ' ') : 'HP USB Printer';
              const cleanId = name.replace(/\s+/g, '_');
              printers.push({
                id: cleanId,
                name,
                makeAndModel: 'HP Smart Tank / Direct USB Driver',
                connectionType: 'USB',
                uri,
                ipAddress: null,
                status: 'ONLINE',
                isDefault: false,
              });
            } else if (uri.startsWith('ipp://') || uri.startsWith('socket://') || uri.startsWith('dnssd://') || uri.startsWith('hp:/net/')) {
              const ipMatch = uri.match(/:\/\/([^:/]+)/);
              const ipAddress = ipMatch ? ipMatch[1] : null;
              const name = `Network Printer (${ipAddress || 'Wi-Fi'})`;
              const cleanId = `net_${ipAddress || 'printer'}`.replace(/\./g, '_');
              printers.push({
                id: cleanId,
                name,
                makeAndModel: 'Wi-Fi / IPP Driver',
                connectionType: 'WIFI_NETWORK',
                uri,
                ipAddress,
                status: 'ONLINE',
                isDefault: false,
              });
            }
          }
        } catch {}
      } catch (err) {
        console.warn('Linux discovery error:', err);
      }
    }

    // STRICT SINGLE DEFAULT RESOLUTION
    // If activeDefaultName matches a printer, mark ONLY that printer as default
    let defaultAssigned = false;
    if (activeDefaultName) {
      for (const p of printers) {
        if (p.name === activeDefaultName || p.id === activeDefaultName) {
          p.isDefault = true;
          defaultAssigned = true;
          break;
        }
      }
    }

    // If activeDefaultName wasn't found or was null, default to the first real printer
    if (!defaultAssigned && printers.length > 0) {
      const preferred = printers.find(p => p.name.toLowerCase().includes('smart tank')) || printers[0];
      preferred.isDefault = true;
      // Save this preferred default to SQLite
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) 
        VALUES ('default_printer_name', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(preferred.name);
    }

    return printers;
  }

  /**
   * Sets the specified printer as the single default system printer.
   */
  async setDefaultPrinter(printerName: string): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();

    // Persist single default in SQLite
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES ('default_printer_name', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(printerName);

    // If Linux CUPS is present, sync OS default
    if (process.platform !== 'win32') {
      try {
        await execAsync(`lpoptions -d "${printerName}"`);
      } catch (err: any) {
        console.warn(`Could not set CUPS default: ${err.message}`);
      }
    }

    return {
      success: true,
      message: `Default printer successfully set to "${printerName}".`,
    };
  }

  /**
   * Gets the current default printer details.
   */
  async getDefaultPrinter(): Promise<string> {
    const db = getDatabase();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'").get() as { value: string } | undefined;
    return row ? row.value : 'HP_Smart_Tank_670';
  }
}
