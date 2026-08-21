import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server';
import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';

describe('End-to-End Ingestion & Operator Pipeline Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('completes full flow: customer QR upload -> operator queue -> checkout & change', async () => {
    // 1. Authenticate operator
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/operator/login',
      payload: { pin: '1234' },
    });
    expect(loginRes.statusCode).toBe(200);
    const cookies = loginRes.cookies;

    // 2. Query initial queue
    const queueRes = await app.inject({
      method: 'GET',
      url: '/api/operator/jobs',
      cookies: { hp_session: cookies[0].value },
    });
    expect(queueRes.statusCode).toBe(200);
    const queueData = JSON.parse(queueRes.payload);
    expect(Array.isArray(queueData.jobs)).toBe(true);

    // 3. Create a test manual job in queue
    const createJobRes = await app.inject({
      method: 'POST',
      url: '/api/operator/jobs',
      cookies: { hp_session: cookies[0].value },
      payload: {
        customerName: 'Juan Luna',
        source: 'QR_DROP',
        sellingPrice: 40.0,
        finalAmount: 40.0,
      },
    });
    expect(createJobRes.statusCode).toBe(200);
    const { jobId } = JSON.parse(createJobRes.payload);
    expect(jobId).toBeDefined();

    // 4. Verify job appears in operator queue
    const updatedQueueRes = await app.inject({
      method: 'GET',
      url: '/api/operator/jobs',
      cookies: { hp_session: cookies[0].value },
    });
    const updatedQueue = JSON.parse(updatedQueueRes.payload);
    const createdJob = updatedQueue.jobs.find((j: any) => j.id === jobId);
    expect(createdJob).toBeDefined();
    expect(createdJob.customer_name).toBe('Juan Luna');
    expect(createdJob.status).toBe('IN_LAYOUT');

    // 5. Calculate Costing via endpoint
    const costingRes = await app.inject({
      method: 'POST',
      url: '/api/operator/costing/calculate',
      cookies: { hp_session: cookies[0].value },
      payload: {
        materials: [{ name: '4R Glossy', qty: 1, unitPrice: 5.0 }],
        operations: [{ item: 'Ink', amount: 3.0 }],
        labor: { ratePerHour: 90.0, hours: 0, minutes: 10 }, // ₱15.00
        targetMarginPercent: 50,
      },
    });
    expect(costingRes.statusCode).toBe(200);
    const costingData = JSON.parse(costingRes.payload);
    // Base cost = 5 + 3 + 15 = ₱23.00, Margin = 50% => Price = ₱34.50
    expect(costingData.totalBaseCost).toBe(23.0);
    expect(costingData.targetSellingPrice).toBe(34.5);

    // 6. Complete checkout with Cash Tendered ₱50.00 -> Change ₱10.00
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/operator/jobs/${jobId}/complete`,
      cookies: { hp_session: cookies[0].value },
      payload: {
        cashTendered: 50.0,
        changeGiven: 10.0,
        paymentMethod: 'CASH',
      },
    });
    expect(completeRes.statusCode).toBe(200);

    // 7. Verify job is marked COMPLETED & PAID
    const finalizedRes = await app.inject({
      method: 'GET',
      url: `/api/operator/jobs/${jobId}`,
      cookies: { hp_session: cookies[0].value },
    });
    const finalizedData = JSON.parse(finalizedRes.payload);
    expect(finalizedData.job.status).toBe('COMPLETED');
    expect(finalizedData.job.payment_status).toBe('PAID');
    expect(finalizedData.job.cash_tendered).toBe(50.0);
    expect(finalizedData.job.change_given).toBe(10.0);
  });
});
