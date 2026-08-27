import fs from 'fs';
import path from 'path';
import { getDatabase } from '../db/database';

export class AutoPurgeService {
  private timer: NodeJS.Timeout | null = null;
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'uploads');
  }

  /**
   * Starts the periodic background auto-purge worker.
   * Default sweep interval: 10 minutes.
   */
  startWorker(intervalMs: number = 10 * 60 * 1000) {
    if (this.timer) return;
    // Run an initial sweep 5 seconds after startup
    setTimeout(() => {
      this.executeSweep().catch((err) => {
        console.warn('[AutoPurgeService] Initial sweep error:', err.message);
      });
    }, 5000);

    this.timer = setInterval(() => {
      this.executeSweep().catch((err) => {
        console.warn('[AutoPurgeService] Interval sweep error:', err.message);
      });
    }, intervalMs);
  }

  stopWorker() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Immediately purges physical files and temporary PDFs for a specific job.
   */
  async purgeJobFiles(jobId: string): Promise<{ deletedFilesCount: number }> {
    const db = getDatabase();
    let deletedCount = 0;

    // 1. Unlink files tracked in job_files
    const rawFiles = db.prepare('SELECT stored_path FROM job_files WHERE job_id = ?').all(jobId) as any[];
    for (const f of rawFiles) {
      if (f.stored_path && fs.existsSync(f.stored_path)) {
        try {
          await fs.promises.unlink(f.stored_path);
          deletedCount++;
        } catch (e) {}
      }
    }

    // 2. Unlink generated/merged PDF tracked on job_orders
    const job = db.prepare('SELECT pdf_path FROM job_orders WHERE id = ?').get(jobId) as any;
    if (job?.pdf_path && fs.existsSync(job.pdf_path)) {
      try {
        await fs.promises.unlink(job.pdf_path);
        deletedCount++;
      } catch (e) {}
    }

    // 3. Mark database records
    db.prepare('UPDATE job_files SET is_purged = 1 WHERE job_id = ?').run(jobId);
    db.prepare('UPDATE job_orders SET files_purged = 1 WHERE id = ?').run(jobId);

    return { deletedFilesCount: deletedCount };
  }

  /**
   * Executes a full non-destructive privacy sweep across the local system:
   * 1. Purges files for COMPLETED jobs past the 1-hour reprint grace period.
   * 2. Purges files for CANCELLED or PURGED jobs.
   * 3. Purges files for abandoned IN_LAYOUT jobs older than 2 hours.
   * 4. Cleans up orphaned converted PDFs older than 2 hours in uploads/.
   */
  async executeSweep(options?: {
    gracePeriodMs?: number; // Default 1 hour (3600000 ms)
    abandonedAgeMs?: number; // Default 2 hours (7200000 ms)
  }): Promise<{ purgedJobsCount: number; purgedFilesCount: number }> {
    const db = getDatabase();
    const graceMs = options?.gracePeriodMs ?? 60 * 60 * 1000;
    const abandonedMs = options?.abandonedAgeMs ?? 2 * 60 * 60 * 1000;
    const now = Date.now();

    let totalPurgedJobs = 0;
    let totalPurgedFiles = 0;

    // 1. Completed jobs past 1-hour reprint window
    const completedThresholdIso = new Date(now - graceMs).toISOString();
    const completedEligible = db.prepare(`
      SELECT id FROM job_orders 
      WHERE (status = 'COMPLETED' OR payment_status = 'PAID')
        AND files_purged = 0
        AND completed_at IS NOT NULL
        AND completed_at <= ?
    `).all(completedThresholdIso) as any[];

    for (const j of completedEligible) {
      const res = await this.purgeJobFiles(j.id);
      db.prepare("UPDATE job_orders SET files_purged = 1, status = 'PURGED', customer_name = 'Walk-in Customer (Purged)' WHERE id = ?").run(j.id);
      totalPurgedJobs++;
      totalPurgedFiles += res.deletedFilesCount;
    }

    // 2. Lingering files on CANCELLED / PURGED jobs
    const cancelledEligible = db.prepare(`
      SELECT id FROM job_orders 
      WHERE status IN ('CANCELLED', 'PURGED')
        AND files_purged = 0
    `).all() as any[];

    for (const j of cancelledEligible) {
      const res = await this.purgeJobFiles(j.id);
      db.prepare('UPDATE job_orders SET files_purged = 1 WHERE id = ?').run(j.id);
      totalPurgedJobs++;
      totalPurgedFiles += res.deletedFilesCount;
    }

    // 3. Abandoned draft/in-layout jobs older than 2 hours
    const abandonedThresholdIso = new Date(now - abandonedMs).toISOString();
    const abandonedEligible = db.prepare(`
      SELECT id FROM job_orders 
      WHERE status = 'IN_LAYOUT'
        AND files_purged = 0
        AND created_at <= ?
    `).all(abandonedThresholdIso) as any[];

    for (const j of abandonedEligible) {
      const res = await this.purgeJobFiles(j.id);
      db.prepare("UPDATE job_orders SET status = 'CANCELLED', files_purged = 1 WHERE id = ?").run(j.id);
      totalPurgedJobs++;
      totalPurgedFiles += res.deletedFilesCount;
    }

    // 4. Clean unreferenced / orphaned files in uploads directory
    if (fs.existsSync(this.uploadDir)) {
      try {
        const trackedRows = db.prepare('SELECT stored_path FROM job_files WHERE is_purged = 0').all() as any[];
        const allTrackedPaths = new Set(trackedRows.map((r: any) => path.resolve(r.stored_path)));

        const pdfRows = db.prepare("SELECT pdf_path FROM job_orders WHERE files_purged = 0 AND pdf_path IS NOT NULL AND status NOT IN ('CANCELLED', 'PURGED')").all() as any[];
        const allJobPdfs = new Set(pdfRows.map((r: any) => path.resolve(r.pdf_path)));

        const diskFiles = await fs.promises.readdir(this.uploadDir);
        for (const file of diskFiles) {
          if (file === 'swatches' || file === 'test_lifecycle') continue;
          const fullPath = path.resolve(path.join(this.uploadDir, file));
          if (!allTrackedPaths.has(fullPath) && !allJobPdfs.has(fullPath)) {
            try {
              const stat = await fs.promises.stat(fullPath);
              if (stat.isFile() && (now - stat.mtimeMs > graceMs)) {
                await fs.promises.unlink(fullPath);
                totalPurgedFiles++;
              }
            } catch {}
          }
        }
      } catch (err: any) {
        console.warn('[AutoPurgeService] Orphan file sweep error:', err.message);
      }
    }

    return { purgedJobsCount: totalPurgedJobs, purgedFilesCount: totalPurgedFiles };
  }
}

export const autoPurgeService = new AutoPurgeService();
