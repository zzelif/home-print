import { describe, it, expect, beforeAll, vi } from 'vitest';
import { InkLevelService } from '../src/services/ink-level.service';
import { getDatabase } from '../src/db/database';

describe('InkLevelService — Ink Level Parsing & Caching', { timeout: 15000 }, () => {
  let service: InkLevelService;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    service = new InkLevelService();
  });

  // -------------------------------------------------------------------------
  // Unit tests for internal parsing methods (via public API with mocked exec)
  // -------------------------------------------------------------------------

  it('parses standard hp-levels output format correctly', async () => {
    // Access private method via type cast for unit test
    const parsed = (service as any).parseHplipOutput(`
      Black(0):   85%
      Cyan(1):    62%
      Magenta(2): 44%
      Yellow(3):  91%
    `);
    expect(parsed).not.toBeNull();
    expect(parsed.black).toBe(85);
    expect(parsed.cyan).toBe(62);
    expect(parsed.magenta).toBe(44);
    expect(parsed.yellow).toBe(91);
  });

  it('parses HP Smart Tank ink bottle label format', async () => {
    const parsed = (service as any).parseHplipOutput(`
      HP 310 Black Ink Bottle: 80%
      HP 308 Cyan Ink Bottle: 55%
      HP 308 Magenta Ink Bottle: 33%
      HP 308 Yellow Ink Bottle: 70%
    `);
    expect(parsed).not.toBeNull();
    expect(parsed.black).toBe(80);
    expect(parsed.cyan).toBe(55);
    expect(parsed.magenta).toBe(33);
    expect(parsed.yellow).toBe(70);
  });

  it('returns null for unrecognized HPLIP output format', async () => {
    const parsed = (service as any).parseHplipOutput(`
      Error: could not connect to device
      Device not found
    `);
    expect(parsed).toBeNull();
  });

  it('parses IPP supply output with color percentage keywords', async () => {
    const parsed = (service as any).parseIppSupplyOutput(`
      HP 310 Black Ink 90%
      HP 308 Cyan Ink 71%
      HP 308 Magenta Ink 52%
      HP 308 Yellow Ink 83%
    `);
    expect(parsed).not.toBeNull();
    expect(parsed.black).toBe(90);
    expect(parsed.cyan).toBe(71);
    expect(parsed.magenta).toBe(52);
    expect(parsed.yellow).toBe(83);
  });

  it('returns null for IPP supply output with no ink percentages', async () => {
    const parsed = (service as any).parseIppSupplyOutput(`
      printer-supply-info = printer-supply;
    `);
    expect(parsed).toBeNull();
  });

  it('caches ink levels to SQLite and retrieves them', async () => {
    const db = getDatabase();
    // Ensure clean state regardless of test ordering
    db.prepare("DELETE FROM system_settings WHERE key = 'cached_ink_levels'").run();

    const testLevels = {
      black: 75,
      cyan: 60,
      magenta: 45,
      yellow: 80,
      readAt: new Date().toISOString(),
      source: 'hplip' as const,
    };

    // Write directly to validate the cache read works correctly
    const nowIso = new Date().toISOString();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('cached_ink_levels', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(JSON.stringify(testLevels), nowIso);

    const cached = await (service as any).getCachedInkLevels();
    expect(cached).not.toBeNull();
    expect(cached.black).toBe(75);
    expect(cached.cyan).toBe(60);
    expect(cached.magenta).toBe(45);
    expect(cached.yellow).toBe(80);
    expect(cached.source).toBe('cached');
  });

  it('returns null for stale cache (older than 5 minutes)', async () => {
    const db = getDatabase();
    // Manually insert stale cache entry
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('cached_ink_levels', '{"black":50,"cyan":50,"magenta":50,"yellow":50,"readAt":"2020-01-01T00:00:00.000Z","source":"hplip"}', '2020-01-01 00:00:00')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = '2020-01-01 00:00:00'
    `).run();

    const cached = await (service as any).getCachedInkLevels();
    expect(cached).toBeNull(); // must return null for stale cache
  });

  it('resolveDefaultPrinterIp extracts IP from underscore-encoded printer name', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP_Smart_Tank_192_168_1_60', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_192_168_1_60'
    `).run();

    const ip = await (service as any).resolveDefaultPrinterIp();
    expect(ip).toBe('192.168.1.60');
  });

  it('resolveDefaultQueueName returns SQLite setting or default fallback', async () => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('default_printer_name', 'HP_Smart_Tank_670', CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = 'HP_Smart_Tank_670'
    `).run();

    const name = await (service as any).resolveDefaultQueueName();
    expect(name).toBe('HP_Smart_Tank_670');
  });

  it('getInkLevels returns unavailable when no IP and no cache', async () => {
    const db = getDatabase();
    // Clear settings so there's no IP to probe and no valid cache
    db.prepare("DELETE FROM system_settings WHERE key LIKE 'cached_ink_levels%' OR key IN ('default_printer_name', 'default_printer_ip')").run();

    const levels = await service.getInkLevels();
    expect(levels.source).toBe('unavailable');
    expect(levels.black).toBe(-1);
  });

  it('getCupsQueueStatus returns structured object on Windows (no-op path)', async () => {
    // On Windows test host, lpstat won't exist — verify graceful fallback
    const status = await service.getCupsQueueStatus('HP_Smart_Tank_670');
    expect(status).toHaveProperty('queueName', 'HP_Smart_Tank_670');
    expect(status).toHaveProperty('jobs');
    expect(Array.isArray(status.jobs)).toBe(true);
  });

  it('cancelJob returns structured error on Windows', async () => {
    const result = await service.cancelJob('HP_Smart_Tank_670-42');
    expect(result).toHaveProperty('success');
    expect(typeof result.message).toBe('string');
  });

  it('printNozzleCheck returns structured result even when HPLIP unavailable', async () => {
    const result = await service.printNozzleCheck('HP_Smart_Tank_670', undefined);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('message');
    expect(typeof result.message).toBe('string');
  });
});
