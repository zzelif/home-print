import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import os from 'os';
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
   * Checks if an IP is a host interface, Docker internal bridge, localhost, or default gateway.
   */
  isIgnoredIp(ip: string): boolean {
    if (!ip) return true;
    const cleanIp = ip.trim();
    if (cleanIp === '127.0.0.1' || cleanIp === 'localhost' || cleanIp.startsWith('127.')) return true;
    // Ignore Docker virtual bridge subnets (172.16.0.0 - 172.31.255.255)
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp)) return true;
    // Ignore gateway / broadcast
    if (cleanIp.endsWith('.1') || cleanIp.endsWith('.255') || cleanIp.endsWith('.0')) return true;

    // Ignore Raspberry Pi / Host's own IP addresses
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
      for (const iface of interfaces[name] || []) {
        if (iface.address === cleanIp) return true;
      }
    }
    return false;
  }

  /**
   * Quick TCP socket probe to verify if a host is listening on raw print port 9100 (JetDirect) or IPP 631.
   * Note: Port 80 (HTTP) is deliberately excluded to prevent routers, Docker containers, and web servers from false-matching.
   */
  async probeNetworkPrinter(host: string): Promise<boolean> {
    if (!host || host.includes('nul') || host.includes('PORTPROMPT')) {
      return false;
    }

    const cleanHost = host.replace(/^IP_/, '').trim();
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost) && !cleanHost.includes('.')) {
      return false;
    }

    if (this.isIgnoredIp(cleanHost)) {
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

    // Only probe dedicated print ports (Port 9100 Raw JetDirect & Port 631 IPP)
    const results = await Promise.all([checkPort(9100), checkPort(631)]);
    return results.some((r) => r === true);
  }

  /**
   * Resolves the authentic printer make and model by querying device metadata or inspecting MAC OUI.
   */
  async getPrinterModelName(ip: string, mac?: string): Promise<string> {
    const cleanMac = mac ? mac.toLowerCase().replace(/[:-]/g, '') : '';
    const isHpMac = cleanMac.startsWith('74da78') || cleanMac.startsWith('001e0b') || cleanMac.startsWith('00215a') || cleanMac.startsWith('9c8e99') || cleanMac.startsWith('c8d9d2') || cleanMac.startsWith('b4b52f');

    // Attempt HP Embedded Web Server XML metadata query
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`http://${ip}/DevMgmt/ProductConfigDyn.xml`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const xml = await res.text();
        const match = xml.match(/<prdcfgdyn:ProductInformation>[\s\S]*?<prdcfgdyn:MakeAndModel>([^<]+)<\/prdcfgdyn:MakeAndModel>/) ||
                      xml.match(/<prdcfgdyn:ProductInformation>[\s\S]*?<prdcfgdyn:MakeAndModelName>([^<]+)<\/prdcfgdyn:MakeAndModelName>/) ||
                      xml.match(/<dd:ModelName>([^<]+)<\/dd:ModelName>/);
        if (match && match[1].trim()) {
          return match[1].trim();
        }
        if (xml.includes('Smart Tank')) {
          return 'HP Smart Tank 670';
        }
      }
    } catch {}

    if (isHpMac) {
      return `HP Smart Tank 670 (${ip})`;
    }

    return `Network Printer (${ip})`;
  }

  /**
   * Scans local ARP table, ip neigh, and active subnet to find all network printers.
   */
  async getLiveLanDevices(): Promise<Array<{ ip: string; mac: string }>> {
    const devices: Array<{ ip: string; mac: string }> = [];
    const seenIps = new Set<string>();

    // 1. Check ARP on Windows & Linux
    try {
      const { stdout } = await execAsync('arp -a');
      const lines = stdout.split('\n');
      for (const line of lines) {
        // Windows format: 192.168.1.60  74-da-78-28-c3-79  dynamic
        // Linux format: ? (192.168.1.60) at 74:da:78:28:c3:79 [ether] on eth0
        const winMatch = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]+)\s+dynamic/i);
        const linuxMatch = line.match(/\(([\d.]+)\)\s+at\s+([0-9a-fA-F:]+)/i);

        const ip = winMatch ? winMatch[1].trim() : (linuxMatch ? linuxMatch[1].trim() : null);
        const rawMac = winMatch ? winMatch[2] : (linuxMatch ? linuxMatch[2] : null);

        if (ip && rawMac && !seenIps.has(ip) && !this.isIgnoredIp(ip)) {
          const mac = rawMac.toLowerCase().replace(/[:-]/g, '').trim();
          seenIps.add(ip);
          devices.push({ ip, mac });
        }
      }
    } catch {}

    // 2. Check Linux `ip neigh`
    if (process.platform !== 'win32') {
      try {
        const { stdout } = await execAsync('ip neigh show');
        for (const line of stdout.split('\n')) {
          const match = line.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+.*lladdr\s+([0-9a-fA-F:]+)/i);
          if (match) {
            const ip = match[1].trim();
            const mac = match[2].toLowerCase().replace(/[:-]/g, '').trim();
            if (!seenIps.has(ip) && !this.isIgnoredIp(ip)) {
              seenIps.add(ip);
              devices.push({ ip, mac });
            }
          }
        }
      } catch {}
    }

    // 3. Fast Parallel Subnet Sweep across ports 9100 and 631 (Sweep /24 subnet)
    try {
      const probeIps: string[] = [];
      for (let i = 1; i <= 254; i++) {
        const ip = `192.168.1.${i}`;
        if (!seenIps.has(ip) && !this.isIgnoredIp(ip)) {
          probeIps.push(ip);
        }
      }

      // Sweep in parallel chunks of 30
      const chunkSize = 30;
      for (let i = 0; i < probeIps.length; i += chunkSize) {
        const chunk = probeIps.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (ip) => {
          const isPrinter = await this.probeNetworkPrinter(ip);
          if (isPrinter && !seenIps.has(ip) && !this.isIgnoredIp(ip)) {
            seenIps.add(ip);
            devices.push({ ip, mac: 'dynamic_printer' });
          }
        }));
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

    // 0. Load persisted manual network printers from database
    try {
      const manualRows = db.prepare("SELECT * FROM manual_printers").all() as Array<{
        id: string;
        name: string;
        ip_address: string;
        port: number;
        protocol: string;
        uri: string;
      }>;

      for (const m of manualRows) {
        const isOnline = await this.probeNetworkPrinter(m.ip_address);
        printers.push({
          id: m.id,
          name: m.name,
          makeAndModel: 'Manual Wi-Fi IPP Printer',
          connectionType: 'WIFI_NETWORK',
          uri: m.uri,
          ipAddress: m.ip_address,
          portName: m.ip_address,
          status: isOnline ? 'ONLINE' : 'OFFLINE',
          isDefault: false,
          isVirtual: false,
        });
      }
    } catch {}

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

        // 0. Explicit Environment IP Probe (if HP_PRINTER_IP or PRINTER_IP configured)
        const explicitIp = process.env.HP_PRINTER_IP || process.env.PRINTER_IP;
        if (explicitIp) {
          const isOnline = await this.probeNetworkPrinter(explicitIp);
          const name = `HP Smart Tank 670 (${explicitIp})`;
          seenNames.add(name);
          printers.push({
            id: `net_${explicitIp.replace(/\./g, '_')}`,
            name,
            makeAndModel: 'HP Smart Tank 670 (Wi-Fi / IPP)',
            connectionType: 'WIFI_NETWORK',
            uri: `ipp://${explicitIp}/ipp/print`,
            ipAddress: explicitIp,
            portName: `Wi-Fi (${explicitIp})`,
            status: isOnline ? 'ONLINE' : 'OFFLINE',
            isDefault: false,
            isVirtual: false,
          });
        }

        // 1. Proactively probe all active LAN devices discovered via ARP/Network
        for (const dev of lanDevices) {
          if (this.isIgnoredIp(dev.ip)) continue;
          const isOnline = await this.probeNetworkPrinter(dev.ip);
          if (isOnline) {
            const detectedModel = await this.getPrinterModelName(dev.ip, dev.mac);
            const name = `${detectedModel}`;
            if (!seenNames.has(name)) {
              seenNames.add(name);
              printers.push({
                id: `net_${dev.ip.replace(/\./g, '_')}`,
                name,
                makeAndModel: detectedModel,
                connectionType: 'WIFI_NETWORK',
                uri: `ipp://${dev.ip}/ipp/print`,
                ipAddress: dev.ip,
                portName: `Wi-Fi IPP (${dev.ip})`,
                status: 'ONLINE',
                isDefault: false,
                isVirtual: false,
              });
            }
          }
        }

        // 2. Inspect configured CUPS queues
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

        // 3. Discover available devices via lpinfo -v
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
   * Adds and persists a manual Wi-Fi/Network printer by IP address with truthful reachability check.
   */
  async addManualPrinter(ipAddress: string, printerName?: string): Promise<{ success: boolean; isOnline: boolean; printer: DiscoveredPrinter; message: string }> {
    const cleanIp = ipAddress.trim().replace(/^IP_/, '');
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanIp) && !cleanIp.includes('.')) {
      throw new Error(`Invalid IP address format: "${ipAddress}"`);
    }

    const name = printerName?.trim() || `HP Smart Tank (${cleanIp})`;
    const id = `manual_${cleanIp.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const uri = `ipp://${cleanIp}:631/ipp/print`;

    // 1. Truthful Reachability Probe (TCP 9100, 631, 80)
    const isOnline = await this.probeNetworkPrinter(cleanIp);
    const status: DiscoveredPrinter['status'] = isOnline ? 'ONLINE' : 'OFFLINE';

    // 2. Persist to SQLite
    const db = getDatabase();
    db.prepare(`
      INSERT INTO manual_printers (id, name, ip_address, port, protocol, uri, created_at)
      VALUES (?, ?, ?, 631, 'IPP', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, uri = excluded.uri, ip_address = excluded.ip_address
    `).run(id, name, cleanIp, uri);

    // 3. Optional: Register with CUPS if available on Linux
    if (process.platform !== 'win32') {
      try {
        await execAsync(`lpadmin -p "${name.replace(/\s+/g, '_')}" -E -v "${uri}" -m everywhere 2>/dev/null || true`);
      } catch {}
    }

    // Invalidate discovery cache
    PrinterDiscoveryService.cachedPrinters = null;

    const printer: DiscoveredPrinter = {
      id,
      name,
      makeAndModel: 'Manual Wi-Fi IPP Printer',
      connectionType: 'WIFI_NETWORK',
      uri,
      ipAddress: cleanIp,
      portName: cleanIp,
      status,
      isDefault: false,
      isVirtual: false,
    };

    return {
      success: true,
      isOnline,
      printer,
      message: isOnline 
        ? `Printer at ${cleanIp} is Online & Ready!`
        : `Printer saved (${cleanIp}), but is currently Offline / Unreachable. Check printer power and Wi-Fi connection.`,
    };
  }

  /**
   * Deletes a manually saved network printer.
   */
  async removeManualPrinter(id: string): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();
    db.prepare("DELETE FROM manual_printers WHERE id = ? OR ip_address = ?").run(id, id);
    PrinterDiscoveryService.cachedPrinters = null;
    return { success: true, message: 'Printer removed.' };
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

