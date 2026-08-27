import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { getDatabase } from '../db/database';

const execAsync = promisify(exec);

export interface DiscoveredPrinter {
  id: string;
  name: string;
  makeAndModel?: string;
  connectionType: 'USB' | 'WIFI_NETWORK' | 'IPP' | 'VIRTUAL';
  uri: string;
  ipAddress: string | null;
  portName: string;
  status: 'ONLINE' | 'OFFLINE' | 'DISCONNECTED';
  isDefault: boolean;
  isVirtual?: boolean;
}

export class PrinterDiscoveryService {
  private static cachedPrinters: DiscoveredPrinter[] | null = null;
  private static lastScanTime: number = 0;
  private static readonly CACHE_TTL_MS = 10000; // 10 seconds cache

  /**
   * Quick TCP socket probe to verify if a host is listening on raw print port 9100, IPP 631, or HTTP 80.
   */
  async probeNetworkPrinter(host: string): Promise<boolean> {
    if (!host || host.includes('nul') || host.includes('PORTPROMPT')) {
      return false;
    }

    const cleanHost = host.replace(/^IP_/, '').trim();
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost) && !cleanHost.includes('.')) {
      return false;
    }

    const checkPort = (port: number) =>
      new Promise<boolean>((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(400);

        socket.on('connect', () => {
          socket.destroy();
          resolve(true);
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
        });

        socket.on('error', () => {
          socket.destroy();
          resolve(false);
        });

        socket.connect(port, cleanHost);
      });

    const results = await Promise.all([checkPort(9100), checkPort(631), checkPort(80)]);
    return results.some((r) => r === true);
  }

  /**
   * Scans local ARP table to find all dynamic active devices and MAC addresses on the LAN.
   */
  async getLiveLanDevices(): Promise<Array<{ ip: string; mac: string }>> {
    const devices: Array<{ ip: string; mac: string }> = [];
    try {
      const { stdout } = await execAsync('arp -a');
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]+)\s+dynamic/i);
        if (match) {
          const ip = match[1].trim();
          const mac = match[2].toLowerCase().replace(/[:-]/g, '').trim();
          if (!ip.startsWith('127.') && !ip.startsWith('169.254.') && !ip.endsWith('.255')) {
            devices.push({ ip, mac });
          }
        }
      }
    } catch {}
    return devices;
  }

  /**
   * Probes whether USB printers are physically plugged in and present in the hardware bus.
   */
  private async getPresentUsbPrinters(): Promise<Set<string>> {
    const presentDevices = new Set<string>();

    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(
          `powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq 'Printer' -or $_.PNPClass -eq 'USB' -or $_.Name -like '*Smart Tank*' -or $_.Name -like '*HP*' } | Select-Object -ExpandProperty Name"`
        );
        for (const line of stdout.split('\n')) {
          const trimmed = line.trim();
          if (trimmed) presentDevices.add(trimmed.toLowerCase());
        }
      } catch {}
    } else {
      try {
        const { stdout } = await execAsync('lsusb');
        for (const line of stdout.split('\n')) {
          const trimmed = line.trim();
          if (trimmed) presentDevices.add(trimmed.toLowerCase());
        }
      } catch {}
    }

    return presentDevices;
  }

  /**
   * Scans for all physical hardware and network printers with authentic live reachability probing.
   */
  async scanPrinters(forceRefresh = false): Promise<DiscoveredPrinter[]> {
    const now = Date.now();
    if (!forceRefresh && PrinterDiscoveryService.cachedPrinters && (now - PrinterDiscoveryService.lastScanTime < PrinterDiscoveryService.CACHE_TTL_MS)) {
      return PrinterDiscoveryService.cachedPrinters;
    }

    const db = getDatabase();
    const defaultSetting = db.prepare("SELECT value FROM system_settings WHERE key = 'default_printer_name'").get() as { value: string } | undefined;
    const activeDefaultName = defaultSetting ? defaultSetting.value : null;

    const printers: DiscoveredPrinter[] = [];
    const presentUsbDevices = await this.getPresentUsbPrinters();
    const lanDevices = await this.getLiveLanDevices();

    // Map of MAC address / identifier to IP
    const macToIpMap: Record<string, string> = {};
    for (const dev of lanDevices) {
      macToIpMap[dev.mac] = dev.ip;
    }

    if (process.platform === 'win32') {
      try {
        const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, Default, WorkOffline, PrinterStatus | ConvertTo-Json -Compress"`;
        const { stdout } = await execAsync(psCommand);

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
            const nameLower = name.toLowerCase();
            const port = item.PortName || '';
            const portLower = port.toLowerCase();

            // Strict categorization
            const isUsb = portLower.startsWith('usb') || portLower.startsWith('dot4');
            const isVirtual = nameLower.includes('pdf') || nameLower.includes('xps') || nameLower.includes('onenote') || nameLower.includes('fax') || portLower.startsWith('portprompt') || portLower.startsWith('shrfax') || portLower === 'nul:';
            const isWsd = portLower.startsWith('wsd') || portLower.startsWith('http');
            const isIpPort = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(port) || portLower.startsWith('ip_') || !!realTcpIpMap[port];

            let connectionType: DiscoveredPrinter['connectionType'] = 'VIRTUAL';
            if (isUsb) connectionType = 'USB';
            else if (isIpPort || isWsd) connectionType = 'WIFI_NETWORK';
            else if (isVirtual) connectionType = 'VIRTUAL';

            // Real address/port resolution
            let ipAddress: string | null = null;
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(port)) {
              ipAddress = port;
            } else if (realTcpIpMap[port]) {
              ipAddress = realTcpIpMap[port];
            } else if (port.startsWith('IP_')) {
              ipAddress = port.replace('IP_', '');
            } else if (isWsd) {
              // Match WSD device identifier against LAN ARP table
              // Example: "HP Smart Tank 660-670 series [28C379]" matches MAC ending in "28c379"
              const idMatch = name.match(/\[([0-9a-fA-F]+)\]/);
              if (idMatch) {
                const searchId = idMatch[1].toLowerCase();
                for (const dev of lanDevices) {
                  if (dev.mac.endsWith(searchId) || dev.mac.includes(searchId)) {
                    ipAddress = dev.ip;
                    break;
                  }
                }
              }

              // If not matched by identifier, probe all LAN IPs for printer web servers
              if (!ipAddress) {
                for (const dev of lanDevices) {
                  const isHp = dev.mac.startsWith('74da78') || dev.mac.startsWith('001e0b') || dev.mac.startsWith('00215a');
                  if (isHp) {
                    const reachable = await this.probeNetworkPrinter(dev.ip);
                    if (reachable) {
                      ipAddress = dev.ip;
                      break;
                    }
                  }
                }
              }
            }

            // TRUTHFUL HARDWARE STATUS PROBE (NO MOCKING)
            let status: DiscoveredPrinter['status'] = 'DISCONNECTED';

            if (connectionType === 'VIRTUAL') {
              status = 'ONLINE';
            } else if (connectionType === 'USB') {
              let isUsbPluggedIn = false;
              for (const usbName of presentUsbDevices) {
                if (nameLower.includes(usbName) || usbName.includes(nameLower.split(' ')[0])) {
                  isUsbPluggedIn = true;
                  break;
                }
              }
              status = isUsbPluggedIn ? 'ONLINE' : 'DISCONNECTED';
            } else if (connectionType === 'WIFI_NETWORK') {
              if (ipAddress) {
                const reachable = await this.probeNetworkPrinter(ipAddress);
                status = reachable ? 'ONLINE' : 'OFFLINE';
              } else {
                status = 'DISCONNECTED';
              }
            }

            printers.push({
              id: `win_${name.replace(/\s+/g, '_')}`,
              name,
              makeAndModel: item.DriverName || name,
              connectionType,
              uri: ipAddress ? `ipp://${ipAddress}:631/ipp/print` : `winspool://${port}/${encodeURIComponent(name)}`,
              ipAddress,
              portName: ipAddress ? `${port} (${ipAddress})` : port,
              status,
              isDefault: false,
              isVirtual,
            });
          }
        }
      } catch (err) {
        console.warn('Windows printer scan error:', err);
      }
    } else {
      // Linux / CUPS Discovery
      try {
        const seenNames = new Set<string>();

        // 1. Inspect configured CUPS queues
        try {
          const { stdout: lpstatOut } = await execAsync('lpstat -v');
          const lines = lpstatOut.split('\n');
          for (const line of lines) {
            const match = line.match(/^device for ([^:]+):\s+(.+)$/i);
            if (match) {
              const name = match[1].trim();
              const uri = match[2].trim();
              seenNames.add(name);

              const isUsb = uri.startsWith('usb://') || uri.startsWith('hp:/usb/');
              const isNet = uri.startsWith('ipp://') || uri.startsWith('socket://') || uri.startsWith('http://') || uri.startsWith('hp:/net/') || uri.startsWith('dnssd://');

              let ipAddress: string | null = null;
              const ipMatch = uri.match(/:\/\/([^:/]+)/);
              if (ipMatch && (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ipMatch[1]) || ipMatch[1].includes('.'))) {
                ipAddress = ipMatch[1];
              }

              let status: DiscoveredPrinter['status'] = 'ONLINE';
              if (isNet && ipAddress) {
                const reachable = await this.probeNetworkPrinter(ipAddress);
                status = reachable ? 'ONLINE' : 'OFFLINE';
              } else if (isUsb) {
                status = presentUsbDevices.size > 0 ? 'ONLINE' : 'DISCONNECTED';
              }

              printers.push({
                id: name.replace(/\s+/g, '_'),
                name,
                makeAndModel: name.replace(/_/g, ' '),
                connectionType: isUsb ? 'USB' : (isNet ? 'WIFI_NETWORK' : 'IPP'),
                uri,
                ipAddress,
                portName: ipAddress || (isUsb ? 'USB Device Bus' : 'CUPS Queue'),
                status,
                isDefault: false,
                isVirtual: false,
              });
            }
          }
        } catch {}

        // 2. Discover available devices via lpinfo -v
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
              if (seenNames.has(name)) continue;
              seenNames.add(name);

              const cleanId = name.replace(/\s+/g, '_');
              const isPresent = presentUsbDevices.size > 0;
              printers.push({
                id: cleanId,
                name,
                makeAndModel: 'HP Smart Tank / Direct USB Driver',
                connectionType: 'USB',
                uri,
                ipAddress: null,
                portName: 'USB Device Bus',
                status: isPresent ? 'ONLINE' : 'DISCONNECTED',
                isDefault: false,
                isVirtual: false,
              });
            } else if (uri.startsWith('ipp://') || uri.startsWith('socket://') || uri.startsWith('dnssd://') || uri.startsWith('hp:/net/') || uri.startsWith('http://')) {
              const ipMatch = uri.match(/:\/\/([^:/]+)/);
              const ipAddress = ipMatch ? ipMatch[1] : null;

              // Dynamically extract printer model/name from URI
              let detectedName = ipAddress ? `Network Printer (${ipAddress})` : 'Network IPP Printer';
              const nameMatch = uri.match(/dnssd:\/\/([^?]+)/) || uri.match(/hp:\/net\/([^?]+)/);
              if (nameMatch) {
                detectedName = decodeURIComponent(nameMatch[1]).replace(/_/g, ' ');
              }

              if (seenNames.has(detectedName)) continue;
              seenNames.add(detectedName);

              const cleanId = `net_${detectedName.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
              const isOnline = ipAddress ? await this.probeNetworkPrinter(ipAddress) : false;
              printers.push({
                id: cleanId,
                name: detectedName,
                makeAndModel: detectedName,
                connectionType: 'WIFI_NETWORK',
                uri,
                ipAddress,
                portName: ipAddress || 'Network IPP',
                status: isOnline ? 'ONLINE' : 'OFFLINE',
                isDefault: false,
                isVirtual: false,
              });
            }
          }
        } catch {}
      } catch (err) {
        console.warn('Linux discovery error:', err);
      }
    }

    // Prioritize Physical Printers over Virtual Drivers
    printers.sort((a, b) => {
      if (a.isVirtual && !b.isVirtual) return 1;
      if (!a.isVirtual && b.isVirtual) return -1;
      if (a.status === 'ONLINE' && b.status !== 'ONLINE') return -1;
      if (a.status !== 'ONLINE' && b.status === 'ONLINE') return 1;
      return 0;
    });

    // STRICT SINGLE DEFAULT RESOLUTION
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

    if (!defaultAssigned && printers.length > 0) {
      // Pick first online physical printer (preferred HP Smart Tank)
      const preferred = printers.find(p => !p.isVirtual && p.status === 'ONLINE') ||
                        printers.find(p => p.name.toLowerCase().includes('smart tank')) ||
                        printers[0];
      preferred.isDefault = true;
      db.prepare(`
        INSERT INTO system_settings (key, value, updated_at) 
        VALUES ('default_printer_name', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `).run(preferred.name);
    }

    PrinterDiscoveryService.cachedPrinters = printers;
    PrinterDiscoveryService.lastScanTime = Date.now();
    return printers;
  }

  /**
   * Sets the specified printer as the single default system printer.
   */
  async setDefaultPrinter(printerName: string): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES ('default_printer_name', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(printerName);

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
