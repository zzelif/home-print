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
   */
  async scanPrinters(): Promise<DiscoveredPrinter[]> {
    const db = getDatabase();
    const defaultSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'").get() as { value: string } | undefined;
    const activeDefaultName = defaultSetting ? defaultSetting.value : 'HP_Smart_Tank_670';

    const printers: DiscoveredPrinter[] = [];

    if (process.platform === 'win32') {
      try {
        const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, Default, WorkOffline | ConvertTo-Json -Compress"`;
        const { stdout } = await execAsync(psCommand);
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];

          for (const item of list) {
            const name = item.Name || 'Unknown Printer';
            const port = item.PortName || '';
            const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(port) || port.toLowerCase().startsWith('ip_') || port.toLowerCase().startsWith('wsd');
            const isUsb = port.toLowerCase().startsWith('usb') || port.toLowerCase().startsWith('dot4');
            const isDefault = name === activeDefaultName || !!item.Default;

            let ipAddress: string | null = null;
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(port)) {
              ipAddress = port;
            } else if (port.startsWith('IP_')) {
              ipAddress = port.replace('IP_', '');
            }

            printers.push({
              id: `win_${name.replace(/\s+/g, '_')}`,
              name,
              makeAndModel: item.DriverName || name,
              connectionType: isUsb ? 'USB' : (isIp ? 'WIFI_NETWORK' : 'VIRTUAL'),
              uri: `winspool://${port}/${encodeURIComponent(name)}`,
              ipAddress,
              status: item.WorkOffline ? 'OFFLINE' : 'ONLINE',
              isDefault,
            });
          }
        }
      } catch (err) {
        console.warn('Windows PowerShell printer scan error:', err);
      }
    } else {
      // Linux / CUPS / HPLIP Scan
      try {
        // 1. Check configured CUPS printers and default
        let cupsDefault = '';
        try {
          const { stdout: defOut } = await execAsync('lpstat -d');
          const defMatch = defOut.match(/system default destination:\s*([^\s]+)/);
          if (defMatch) cupsDefault = defMatch[1];
        } catch {}

        // 2. Discover available devices via lpinfo
        try {
          const { stdout: lpinfoOut } = await execAsync('lpinfo -v');
          const lines = lpinfoOut.split('\n');

          for (const line of lines) {
            const match = line.match(/^(\w+)\s+(.+)$/);
            if (!match) continue;
            const [, type, uri] = match;

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
                isDefault: cleanId === activeDefaultName || cleanId === cupsDefault,
              });
            } else if (uri.startsWith('ipp://') || uri.startsWith('socket://') || uri.startsWith('dnssd://') || uri.startsWith('hp:/net/')) {
              // Extract IP or hostname
              const ipMatch = uri.match(/:\/\/([^:/]+)/);
              const ipAddress = ipMatch ? ipMatch[1] : null;
              const name = `Network Printer (${ipAddress || 'Wi-Fi'})`;
              const cleanId = `net_${ipAddress || 'printer'}`.replace(/\./g, '_');
              printers.push({
                id: cleanId,
                name,
                makeAndModel: 'Wi-Fi / IPP Network Printer',
                connectionType: 'WIFI_NETWORK',
                uri,
                ipAddress,
                status: 'ONLINE',
                isDefault: cleanId === activeDefaultName,
              });
            }
          }
        } catch (e) {
          console.warn('lpinfo not available, falling back to lpstat');
        }

        // 3. Check lpstat configured queues
        try {
          const { stdout: lpstatOut } = await execAsync('lpstat -p');
          const pLines = lpstatOut.split('\n');
          for (const pl of pLines) {
            const pMatch = pl.match(/printer\s+([^\s]+)\s+(is idle|is processing|is stopped|disabled)/);
            if (pMatch) {
              const [, pName, pState] = pMatch;
              if (!printers.some(p => p.id === pName)) {
                printers.push({
                  id: pName,
                  name: pName.replace(/_/g, ' '),
                  connectionType: pName.toLowerCase().includes('usb') ? 'USB' : 'WIFI_NETWORK',
                  uri: `ipp://localhost:631/printers/${pName}`,
                  ipAddress: null,
                  status: pState.includes('idle') || pState.includes('processing') ? 'ONLINE' : 'OFFLINE',
                  isDefault: pName === activeDefaultName || pName === cupsDefault,
                });
              }
            }
          }
        } catch {}
      } catch (err) {
        console.warn('Linux CUPS discovery error:', err);
      }
    }

    // Ensure our target HP Smart Tank 670 is represented
    if (printers.length === 0) {
      printers.push({
        id: 'HP_Smart_Tank_670',
        name: 'HP Smart Tank 670 Series',
        makeAndModel: 'HP Smart Tank 670 All-in-One (hpcups 3.22.6)',
        connectionType: 'USB',
        uri: 'usb://HP/Smart%20Tank%20670%20series?serial=TH1A2B3C',
        ipAddress: null,
        status: 'DISCONNECTED',
        isDefault: true,
      });
      printers.push({
        id: 'HP_Smart_Tank_670_WiFi',
        name: 'HP Smart Tank 670 (Wi-Fi / AirPrint)',
        makeAndModel: 'HP Smart Tank 670 (IPP Everywhere)',
        connectionType: 'WIFI_NETWORK',
        uri: 'ipp://192.168.1.150:631/ipp/print',
        ipAddress: '192.168.1.150',
        status: 'DISCONNECTED',
        isDefault: false,
      });
    }

    // Mark default accurately
    const hasDefault = printers.some(p => p.isDefault);
    if (!hasDefault && printers.length > 0) {
      printers[0].isDefault = true;
    }

    return printers;
  }

  /**
   * Sets the specified printer as the default system printer.
   */
  async setDefaultPrinter(printerName: string): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();

    // Persist in SQLite
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES ('default_printer_name', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(printerName);

    // If Linux CUPS is present, set system default
    if (process.platform !== 'win32') {
      try {
        await execAsync(`lpoptions -d ${printerName}`);
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
