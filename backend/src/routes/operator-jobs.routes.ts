import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { getDatabase } from '../db/database';
import { wsHub } from './ws';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { DocumentConverterService, PaperSize } from '../services/document-converter.service';
import { autoPurgeService } from '../services/auto-purge.service';

export const operatorJobsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const db = getDatabase();
  const documentConverter = new DocumentConverterService();

  // Helper to get real page count of a file on disk
  async function getFilePageCount(storedPath: string, mimeType: string): Promise<number> {
    if (mimeType === 'application/pdf' || storedPath.toLowerCase().endsWith('.pdf')) {
      try {
        if (fs.existsSync(storedPath)) {
          const buffer = await fs.promises.readFile(storedPath);
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          return pdfDoc.getPageCount();
        }
      } catch (err) {
        console.warn(`Could not read PDF page count from ${storedPath}:`, err);
      }
    }
    return 1;
  }

  // Helper to normalize dates into standard ISO-8601 strings with UTC Z suffix
  function toIsoString(dateVal: any): string {
    if (!dateVal) return new Date().toISOString();
    const str = String(dateVal).trim();
    if (str.includes('T')) {
      return str.endsWith('Z') ? str : `${str}Z`;
    }
    return `${str.replace(' ', 'T')}Z`;
  }

  // Get active queue & inbox (filters out cancelled and purged jobs from active view by default)
  fastify.get('/api/operator/jobs', async (req, reply) => {
    const query = req.query as { includePurged?: string };
    const includePurged = query?.includePurged === 'true';

    const whereClause = includePurged
      ? ''
      : "WHERE (j.files_purged = 0 AND j.status NOT IN ('PURGED', 'CANCELLED')) OR j.status IN ('IN_LAYOUT', 'PENDING', 'PRINTING', 'PROCESSING')";

    const jobs = db.prepare(`
      SELECT j.*, 
        json_group_array(json_object(
          'id', f.id, 
          'originalName', f.original_filename, 
          'filePath', f.stored_path, 
          'mimeType', f.mime_type, 
          'fileSize', f.file_size_bytes,
          'isPurged', f.is_purged
        )) as files
      FROM job_orders j
      LEFT JOIN job_files f ON j.id = f.job_id
      ${whereClause}
      GROUP BY j.id
      ORDER BY j.created_at DESC
      LIMIT 100
    `).all();

    const formattedJobs = jobs.map((job: any) => ({
      ...job,
      created_at: toIsoString(job.created_at),
      completed_at: job.completed_at ? toIsoString(job.completed_at) : null,
      files: JSON.parse(job.files || '[]').filter((f: any) => f.id !== null),
    }));

    return reply.send({ jobs: formattedJobs });
  });

  // Create manual job
  fastify.post('/api/operator/jobs', async (req, reply) => {
    const body = req.body as any;
    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const customerName = body.customerName || 'Walk-in Customer';
    const source = body.source || 'MANUAL_UI';

    const insert = db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, product_id, status, copies, selling_price, final_amount)
      VALUES (?, ?, ?, ?, 'IN_LAYOUT', ?, ?, ?)
    `);
    insert.run(jobId, customerName, source, body.productId || null, body.copies || 1, body.sellingPrice || 0, body.finalAmount || 0);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId, status: 'IN_LAYOUT' });
    return reply.send({ success: true, jobId });
  });

  // Get single job details
  fastify.get('/api/operator/jobs/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(id) as any;
    if (!job) return reply.status(404).send({ error: 'Job not found.' });

    const rawFiles = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY id ASC').all(id) as any[];
    const files = await Promise.all(
      rawFiles.map(async (f) => {
        const pageCount = await getFilePageCount(f.stored_path, f.mime_type);
        return {
          id: f.id,
          originalName: f.original_filename,
          filePath: f.stored_path,
          mimeType: f.mime_type,
          fileSize: f.file_size_bytes,
          isPurged: f.is_purged,
          pageCount,
        };
      })
    );

    let pageBreakdown = null;
    if (job.page_breakdown) {
      try {
        pageBreakdown = JSON.parse(job.page_breakdown);
      } catch {}
    }

    // On-demand analysis if page_breakdown was missing or null
    if ((!pageBreakdown || pageBreakdown.length === 0) && files.length > 0) {
      try {
        const fileTypes = await Promise.all(files.map(f => documentConverter.detectFileType(f.filePath)));
        const allImages = fileTypes.every(t => t === 'IMAGE');
        const targetPath = job.pdf_path || files[0].filePath;
        const analysis = await documentConverter.analyzePdf(targetPath, allImages ? files.map(f => f.filePath) : undefined);
        pageBreakdown = analysis.pageBreakdown;
        db.prepare('UPDATE job_orders SET page_breakdown = ?, selling_price = COALESCE(NULLIF(selling_price, 0), ?) WHERE id = ?')
          .run(JSON.stringify(pageBreakdown), analysis.suggestedAdaptiveTotal, id);
      } catch (e: any) {
        console.warn('On-demand job analysis error:', e.message);
      }
    }

    return reply.send({ job: { ...job, pageBreakdown, files } });
  });

  // Re-analyze job files endpoint
  fastify.get('/api/operator/jobs/:id/analyze', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(id) as any;
    if (!job) return reply.status(404).send({ error: 'Job not found.' });

    const rawFiles = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY id ASC').all(id) as any[];
    if (!rawFiles || rawFiles.length === 0) return reply.status(400).send({ error: 'No files to analyze.' });

    try {
      const fileTypes = await Promise.all(rawFiles.map(f => documentConverter.detectFileType(f.stored_path)));
      const allImages = fileTypes.every(t => t === 'IMAGE');
      const targetPath = job.pdf_path || rawFiles[0].stored_path;
      const analysis = await documentConverter.analyzePdf(targetPath, allImages ? rawFiles.map(f => f.stored_path) : undefined);

      db.prepare('UPDATE job_orders SET page_breakdown = ?, selling_price = ? WHERE id = ?')
        .run(JSON.stringify(analysis.pageBreakdown), analysis.suggestedAdaptiveTotal, id);

      return reply.send({ success: true, analysis });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Direct Operator File Upload & Conversion (used by Document Station & Layout Studio)
  // Batch Upload Endpoint: Combines multiple files (e.g. 15 photos) into 1 single multi-page print job
  fastify.post('/api/operator/upload-batch', async (req, reply) => {
    const parts = req.files();
    const uploadedFiles: Array<{ filename: string; storedPath: string; mimeType: string; size: number }> = [];
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const query = req.query as { jobId?: string; paperSize?: string; orientation?: string; fitMode?: string };
    const jobId = query?.jobId || `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const targetPaperSize = (query?.paperSize as any) || 'A4';
    const orientation = (query?.orientation as any) || 'AUTO';
    const fitMode = (query?.fitMode as any) || 'FIT_PRINTABLE';

    for await (const part of parts) {
      if (part.file) {
        const fileId = `f_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        const safeName = part.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storedPath = path.join(uploadDir, `${fileId}_${safeName}`);
        const buffer = await part.toBuffer();
        await fs.promises.writeFile(storedPath, buffer);
        uploadedFiles.push({
          filename: part.filename,
          storedPath,
          mimeType: part.mimetype,
          size: buffer.length,
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return reply.status(400).send({ error: 'No files uploaded.' });
    }

    let convertedPdfPath = uploadedFiles[0].storedPath;
    let pageCount = uploadedFiles.length;
    let analysis: any = null;

    try {
      const fileTypes = await Promise.all(
        uploadedFiles.map(f => documentConverter.detectFileType(f.storedPath))
      );
      const allImages = fileTypes.every(t => t === 'IMAGE');

      if (uploadedFiles.length > 1 && allImages) {
        // Collate all images into 1 multi-page PDF with auto-orientation per page
        convertedPdfPath = await documentConverter.convertImagesToMultiPagePdf(
          uploadedFiles.map(f => f.storedPath),
          targetPaperSize,
          orientation,
          fitMode
        );
        analysis = await documentConverter.analyzePdf(convertedPdfPath, uploadedFiles.map(f => f.storedPath));
        pageCount = analysis.totalPages || uploadedFiles.length;
      } else if (uploadedFiles.length === 1) {
        convertedPdfPath = await documentConverter.convertToPdf(uploadedFiles[0].storedPath, targetPaperSize, orientation, fitMode);
        analysis = await documentConverter.analyzePdf(convertedPdfPath, fileTypes[0] === 'IMAGE' ? [uploadedFiles[0].storedPath] : undefined);
        pageCount = analysis.totalPages || 1;
      } else {
        // Mixed files: convert each and merge with pdf-lib
        const mergedDoc = await PDFDocument.create();
        const srcImages: string[] = [];
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const pdf = await documentConverter.convertToPdf(file.storedPath, targetPaperSize, orientation, fitMode);
          const pdfBytes = await fs.promises.readFile(pdf);
          const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
          const pages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
          for (const p of pages) mergedDoc.addPage(p);
          if (fileTypes[i] === 'IMAGE') srcImages.push(file.storedPath);
        }
        const mergedBytes = await mergedDoc.save();
        const mergedPath = path.join(uploadDir, `merged_${Date.now()}.pdf`);
        await fs.promises.writeFile(mergedPath, mergedBytes);
        convertedPdfPath = mergedPath;
        analysis = await documentConverter.analyzePdf(convertedPdfPath, srcImages.length > 0 ? srcImages : undefined);
        pageCount = analysis.totalPages || mergedDoc.getPageCount();
      }
    } catch (err: any) {
      console.warn('Batch conversion error:', err.message);
    }

    const pageBreakdownJson = analysis?.pageBreakdown ? JSON.stringify(analysis.pageBreakdown) : null;
    const initialPrice = analysis?.suggestedAdaptiveTotal || pageCount * 3.0;

    // Record job order
    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, service_type, status, copies, selling_price, final_amount, page_breakdown, pdf_path)
      VALUES (?, 'Walk-in Customer', 'MANUAL_UI', 'DOCUMENT', 'IN_LAYOUT', 1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        service_type = 'DOCUMENT',
        status = 'IN_LAYOUT',
        selling_price = excluded.selling_price,
        final_amount = excluded.final_amount,
        page_breakdown = excluded.page_breakdown,
        pdf_path = excluded.pdf_path
    `).run(jobId, initialPrice, initialPrice, pageBreakdownJson, convertedPdfPath);

    // Record all files
    for (const f of uploadedFiles) {
      const fId = `f_${crypto.randomBytes(4).toString('hex')}`;
      db.prepare(`
        INSERT INTO job_files (id, job_id, original_filename, stored_path, mime_type, file_size_bytes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(fId, jobId, f.filename, f.storedPath, f.mimeType, f.size);
    }

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId, status: 'IN_LAYOUT' });

    return reply.send({
      success: true,
      jobId,
      file: {
        originalName: `${uploadedFiles[0].filename}${uploadedFiles.length > 1 ? ` (+${uploadedFiles.length - 1} more)` : ''}`,
        filePath: convertedPdfPath,
        fileCount: uploadedFiles.length,
        pageCount,
        previewPdfUrl: `/api/operator/jobs/${jobId}/pdf`,
      },
      previewPdfUrl: `/api/operator/jobs/${jobId}/pdf`,
      analysis,
    });
  });

  // Single file upload endpoint (delegates cleanly to converter & analysis)
  fastify.post('/api/operator/upload', async (req, reply) => {
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file uploaded.' });
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const fileId = `f_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedPath = path.join(uploadDir, `${fileId}_${safeName}`);

    const buffer = await data.toBuffer();
    await fs.promises.writeFile(storedPath, buffer);

    const query = req.query as { jobId?: string; paperSize?: string; orientation?: string; fitMode?: string };
    const jobId = query?.jobId || `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const targetPaperSize = (query?.paperSize as any) || 'A4';
    const orientation = (query?.orientation as any) || 'AUTO';
    const fitMode = (query?.fitMode as any) || 'FIT_PRINTABLE';

    // Auto-convert to vector PDF if DOCX, TXT, or Image
    let convertedPdfPath = storedPath;
    let pageCount = 1;
    let analysis: any = null;

    try {
      const fileType = await documentConverter.detectFileType(storedPath);
      convertedPdfPath = await documentConverter.convertToPdf(storedPath, targetPaperSize, orientation, fitMode);
      analysis = await documentConverter.analyzePdf(convertedPdfPath, fileType === 'IMAGE' ? [storedPath] : undefined);
      pageCount = analysis.totalPages || 1;
    } catch (err: any) {
      console.warn('Document conversion / analysis error:', err.message);
      if (data.mimetype === 'application/pdf' || data.filename.toLowerCase().endsWith('.pdf')) {
        try {
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch {}
      }
    }

    const pageBreakdownJson = analysis?.pageBreakdown ? JSON.stringify(analysis.pageBreakdown) : null;

    // Ensure job order exists
    db.prepare(`
      INSERT INTO job_orders (id, customer_name, source, service_type, status, copies, selling_price, final_amount, page_breakdown, pdf_path)
      VALUES (?, 'Walk-in Customer', 'MANUAL_UI', 'DOCUMENT', 'IN_LAYOUT', 1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET 
        service_type = 'DOCUMENT',
        status = 'IN_LAYOUT',
        selling_price = excluded.selling_price,
        final_amount = excluded.final_amount,
        page_breakdown = excluded.page_breakdown,
        pdf_path = excluded.pdf_path
    `).run(jobId, analysis?.suggestedAdaptiveTotal || 3.0, analysis?.suggestedAdaptiveTotal || 3.0, pageBreakdownJson, convertedPdfPath);

    // Record job file
    db.prepare(`
      INSERT INTO job_files (id, job_id, original_filename, stored_path, mime_type, file_size_bytes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(fileId, jobId, data.filename, storedPath, data.mimetype, buffer.length);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId, status: 'IN_LAYOUT' });

    return reply.send({
      success: true,
      jobId,
      file: {
        fileId,
        originalName: data.filename,
        filePath: convertedPdfPath,
        mimeType: data.mimetype,
        fileSize: buffer.length,
        pageCount,
        previewPdfUrl: `/api/operator/jobs/${jobId}/pdf`,
      },
      previewPdfUrl: `/api/operator/jobs/${jobId}/pdf`,
      analysis,
    });
  });

  // Serve Converted/Native PDF for preview in PDF.js Canvas
  fastify.get('/api/operator/jobs/:id/pdf', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(id) as any;
    const rawFiles = db.prepare('SELECT * FROM job_files WHERE job_id = ? ORDER BY id ASC').all(id) as any[];

    if (!rawFiles || rawFiles.length === 0) {
      return reply.status(404).send({ error: 'No files attached to this job.' });
    }

    const query = req.query as { paperSize?: string; orientation?: string; fitMode?: string };
    const paperSize = (query?.paperSize as any) || 'A4';
    const orientation = (query?.orientation as any) || 'AUTO';
    const fitMode = (query?.fitMode as any) || 'FIT_PRINTABLE';

    try {
      const fileTypes = await Promise.all(rawFiles.map(f => documentConverter.detectFileType(f.stored_path)));
      const allImages = fileTypes.every(t => t === 'IMAGE');

      let pdfPath = job?.pdf_path;

      // If user customized paperSize, orientation, or fitMode, or if cached PDF doesn't exist, regenerate cleanly
      const shouldRegenerate = !pdfPath || !fs.existsSync(pdfPath) || query?.orientation || query?.paperSize || query?.fitMode;

      if (shouldRegenerate) {
        if (rawFiles.length > 1 && allImages) {
          pdfPath = await documentConverter.convertImagesToMultiPagePdf(
            rawFiles.map(f => f.stored_path),
            paperSize,
            orientation,
            fitMode
          );
        } else if (rawFiles.length === 1) {
          pdfPath = await documentConverter.convertToPdf(
            rawFiles[0].stored_path,
            paperSize,
            orientation,
            fitMode
          );
        } else {
          // Multiple mixed files
          const mergedDoc = await PDFDocument.create();
          for (const file of rawFiles) {
            const converted = await documentConverter.convertToPdf(file.stored_path, paperSize, orientation, fitMode);
            const buf = await fs.promises.readFile(converted);
            const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
            const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
            for (const p of pages) mergedDoc.addPage(p);
          }
          const mergedBytes = await mergedDoc.save();
          const uploadDir = path.join(process.cwd(), 'uploads');
          pdfPath = path.join(uploadDir, `merged_${id}_${Date.now()}.pdf`);
          await fs.promises.writeFile(pdfPath, mergedBytes);
        }

        db.prepare('UPDATE job_orders SET pdf_path = ? WHERE id = ?').run(pdfPath, id);
      }

      const pdfBuffer = await fs.promises.readFile(pdfPath);
      reply.type('application/pdf');
      reply.header('Content-Disposition', `inline; filename="${path.basename(pdfPath)}"`);
      return reply.send(pdfBuffer);
    } catch (err: any) {
      console.error(`PDF preview generation error for job ${id}:`, err.message);
      // Fallback: generate a clean readable PDF status notice so PDF.js never receives a raw 500 error
      try {
        const fallbackPdf = await PDFDocument.create();
        const page = fallbackPdf.addPage([595.28, 841.89]);
        const font = await fallbackPdf.embedFont(StandardFonts.Helvetica);
        const fontBold = await fallbackPdf.embedFont(StandardFonts.HelveticaBold);
        page.drawText('Document Preview Notice', { x: 50, y: 770, size: 16, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
        page.drawText(`File: ${documentConverter.sanitizeWinAnsi(rawFiles[0].original_filename)}`, { x: 50, y: 740, size: 12, font });
        page.drawText(`Status: Ready for printing on counter hardware.`, { x: 50, y: 715, size: 11, font, color: rgb(0.1, 0.5, 0.2) });
        page.drawText(`Detail: ${documentConverter.sanitizeWinAnsi(err.message)}`, { x: 50, y: 690, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
        const fallbackBytes = await fallbackPdf.save();
        reply.type('application/pdf');
        return reply.send(Buffer.from(fallbackBytes));
      } catch {
        return reply.status(500).send({ error: `Could not generate PDF preview: ${err.message}` });
      }
    }
  });

  // Serve raw uploaded file binary/image by file ID
  fastify.get('/api/operator/files/:fileId', async (req, reply) => {
    const { fileId } = req.params as { fileId: string };
    const file = db.prepare('SELECT * FROM job_files WHERE id = ?').get(fileId) as any;
    if (!file || !fs.existsSync(file.stored_path)) {
      return reply.status(404).send({ error: 'File not found or already purged from disk for privacy.' });
    }
    const buffer = await fs.promises.readFile(file.stored_path);
    reply.type(file.mime_type || 'application/octet-stream');
    return reply.send(buffer);
  });

  // Cancel job order and purge temporary uploaded files immediately
  fastify.post('/api/operator/jobs/:id/cancel', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = db.prepare('SELECT * FROM job_orders WHERE id = ?').get(id) as any;
    if (!job) {
      return reply.status(404).send({ error: 'Job not found.' });
    }

    await autoPurgeService.purgeJobFiles(id);
    db.prepare("UPDATE job_orders SET status = 'CANCELLED', files_purged = 1, payment_status = 'UNPAID' WHERE id = ?").run(id);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId: id, status: 'CANCELLED' });
    return reply.send({ success: true, message: 'Job order cancelled, draft discarded, and files cleaned up.' });
  });

  // Complete checkout & record cash change (with optional auto-purge)
  fastify.post('/api/operator/jobs/:id/complete', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { cashTendered, changeGiven, paymentMethod, purgeFiles } = req.body as {
      cashTendered: number;
      changeGiven: number;
      paymentMethod?: 'CASH' | 'GCASH';
      purgeFiles?: boolean;
    };

    const update = db.prepare(`
      UPDATE job_orders 
      SET status = 'COMPLETED', 
          payment_status = 'PAID', 
          cash_tendered = ?, 
          change_given = ?, 
          payment_method = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    update.run(cashTendered, changeGiven, paymentMethod || 'CASH', id);

    // If purge requested or default privacy mode, delete physical files from disk
    if (purgeFiles !== false) {
      await autoPurgeService.purgeJobFiles(id);
    }

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId: id, status: 'COMPLETED', paymentStatus: 'PAID' });
    return reply.send({ success: true, message: 'Job completed, payment recorded, and customer files purged for privacy.' });
  });

  // Non-Destructive Privacy Purge: Deletes customer binary files from disk, keeps sales ledger intact
  fastify.post('/api/operator/jobs/:id/purge', async (req, reply) => {
    const { id } = req.params as { id: string };
    await autoPurgeService.purgeJobFiles(id);
    db.prepare("UPDATE job_orders SET files_purged = 1, status = 'PURGED', customer_name = 'Walk-in Customer (Purged)' WHERE id = ?").run(id);

    wsHub.broadcast('JOB_STATE_CHANGED', { jobId: id, status: 'PURGED' });
    return reply.send({ success: true, message: 'Customer binary files purged from disk for privacy. Business sales record preserved.' });
  });

  // Purge all customer binary files for completed jobs (Non-Destructive)
  fastify.post('/api/operator/jobs/purge-completed', async (req, reply) => {
    const result = await autoPurgeService.executeSweep({ gracePeriodMs: 0 });
    wsHub.broadcast('JOB_STATE_CHANGED', { status: 'ALL_COMPLETED_PURGED' });
    return reply.send({ success: true, message: `Purged ${result.purgedJobsCount} orders (${result.purgedFilesCount} files) from disk. Permanent revenue ledger intact.` });
  });

  // Full storage sweep endpoint
  fastify.post('/api/operator/purge/sweep', async (req, reply) => {
    const body = req.body as any;
    const result = await autoPurgeService.executeSweep({
      gracePeriodMs: body?.gracePeriodMs,
      abandonedAgeMs: body?.abandonedAgeMs,
    });
    wsHub.broadcast('JOB_STATE_CHANGED', { status: 'STORAGE_SWEEP_COMPLETED' });
    return reply.send({ success: true, ...result });
  });

  // Permanent Accounting & Audit Ledger: Immutable financial calculations (Strictly ignores CANCELLED orders)
  fastify.get('/api/operator/analytics', async (req, reply) => {
    const { timeframe } = req.query as { timeframe?: string };
    
    const getDateFilter = (prefix: string = 'job_orders') => {
      const p = prefix ? `${prefix}.` : '';
      if (timeframe === 'today') {
        return `AND (date(COALESCE(${p}completed_at, ${p}created_at), 'localtime') = date('now', 'localtime') OR date(COALESCE(${p}completed_at, ${p}created_at)) = date('now') OR substr(COALESCE(${p}completed_at, ${p}created_at), 1, 10) = date('now') OR substr(COALESCE(${p}completed_at, ${p}created_at), 1, 10) = date('now', 'localtime'))`;
      } else if (timeframe === 'week') {
        return `AND COALESCE(${p}completed_at, ${p}created_at) >= datetime('now', '-7 days')`;
      } else if (timeframe === 'month') {
        return `AND COALESCE(${p}completed_at, ${p}created_at) >= datetime('now', '-30 days')`;
      }
      return '';
    };

    // Revenue & financial metrics: Paid orders only, strictly excluding CANCELLED
    const financialTotals = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN final_amount ELSE 0 END), 0) as grossRevenue,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND payment_method = 'CASH' THEN final_amount ELSE 0 END), 0) as cashTotal,
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' AND payment_method = 'GCASH' THEN final_amount ELSE 0 END), 0) as gcashTotal,
        COUNT(CASE WHEN payment_status = 'PAID' OR status = 'COMPLETED' THEN 1 END) as completedOrders,
        COUNT(CASE WHEN status IN ('PENDING', 'IN_LAYOUT', 'PRINTING') THEN 1 END) as pendingOrders
      FROM job_orders
      WHERE status != 'CANCELLED' ${getDateFilter('job_orders')}
    `).get() as any;

    const grossRevenue = financialTotals?.grossRevenue || 0;
    const estimatedCost = Number((grossRevenue * 0.28).toFixed(2));
    const netProfit = Number((grossRevenue - estimatedCost).toFixed(2));

    // Product breakdown (qualify with 'j' table alias)
    const productBreakdown = db.prepare(`
      SELECT 
        COALESCE(p.name, 'Document / Rush ID') as product_name,
        COUNT(j.id) as count,
        COALESCE(SUM(j.final_amount), 0) as revenue
      FROM job_orders j
      LEFT JOIN products p ON j.product_id = p.id
      WHERE (j.payment_status = 'PAID' OR j.status IN ('COMPLETED', 'PURGED'))
        AND j.status != 'CANCELLED'
        ${getDateFilter('j')}
      GROUP BY product_name
      ORDER BY revenue DESC
    `).all();

    // Immutable Audit Log
    const rawAuditLog = db.prepare(`
      SELECT id, customer_name, source, final_amount, status, payment_status, payment_method, files_purged, created_at, completed_at
      FROM job_orders
      WHERE 1=1 ${getDateFilter('job_orders')}
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];

    const recentAuditLog = rawAuditLog.map((log: any) => ({
      ...log,
      created_at: toIsoString(log.created_at),
      completed_at: log.completed_at ? toIsoString(log.completed_at) : null,
    }));

    return reply.send({
      timeframe: timeframe || 'today',
      metrics: {
        grossRevenue: Number(grossRevenue.toFixed(2)),
        estimatedCost,
        netProfit,
        completedOrders: financialTotals?.completedOrders || 0,
        pendingOrders: financialTotals?.pendingOrders || 0,
        averageOrderValue: financialTotals?.completedOrders > 0 ? Number((grossRevenue / financialTotals.completedOrders).toFixed(2)) : 0,
        cashTotal: Number((financialTotals?.cashTotal || 0).toFixed(2)),
        gcashTotal: Number((financialTotals?.gcashTotal || 0).toFixed(2)),
      },
      productBreakdown,
      recentAuditLog,
    });
  });
};
