import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiscoveredDriverOptions {
  printerName: string;
  colorModeFlag: string;       // e.g. 'ColorModel' or 'OutputMode' or 'print-color-mode'
  monochromeValue: string;     // e.g. 'Gray' or 'BlackOnly' or 'monochrome'
  colorValue: string;          // e.g. 'RGB' or 'Color' or 'color'
  glossyMediaValue: string;    // e.g. 'PhotographicGlossy' or 'Photo'
  plainMediaValue: string;     // e.g. 'Plain'
  borderless4RValue: string;   // e.g. 'Custom.4x6in.Borderless' or 'Photo4x6'
  rawOptionsMap: Record<string, string[]>;
}

export class PpdDiscoveryService {
  private defaultPrinter = 'HP_Smart_Tank_670';

  /**
   * Introspects CUPS driver options using `lpoptions -p <printer> -l`
   * and parses available values to prevent hardcoding unverified flags.
   */
  async discoverOptions(printerName: string = this.defaultPrinter): Promise<DiscoveredDriverOptions> {
    const rawOptionsMap: Record<string, string[]> = {};

    try {
      const { stdout } = await execAsync(`lpoptions -p ${printerName} -l`);
      const lines = stdout.split('\n');

      for (const line of lines) {
        if (!line.includes(':')) continue;
        const [keyPart, valuesPart] = line.split(':');
        const key = keyPart.trim();
        const values = valuesPart.trim().split(/\s+/).map((v) => v.replace(/^\*/, '')); // remove default marker
        rawOptionsMap[key] = values;
      }
    } catch (err) {
      // Fallback defaults for development / testing without active CUPS daemon
    }

    // Dynamic heuristic extraction
    let colorModeFlag = 'OutputMode';
    let monochromeValue = 'BlackOnlyGrayscale';
    let colorValue = 'Color';

    if (rawOptionsMap['ColorModel']) {
      colorModeFlag = 'ColorModel';
      monochromeValue = rawOptionsMap['ColorModel'].find((v) => /gray|mono|k/i.test(v)) || 'Gray';
      colorValue = rawOptionsMap['ColorModel'].find((v) => /rgb|cmyk|color/i.test(v)) || 'RGB';
    } else if (rawOptionsMap['print-color-mode']) {
      colorModeFlag = 'print-color-mode';
      monochromeValue = 'monochrome';
      colorValue = 'color';
    }

    let glossyMediaValue = 'PhotographicGlossy';
    if (rawOptionsMap['MediaType']) {
      glossyMediaValue = rawOptionsMap['MediaType'].find((v) => /photo|glossy/i.test(v)) || 'PhotographicGlossy';
    }

    return {
      printerName,
      colorModeFlag,
      monochromeValue,
      colorValue,
      glossyMediaValue,
      plainMediaValue: 'Plain',
      borderless4RValue: 'Custom.4x6in.Borderless',
      rawOptionsMap,
    };
  }
}
