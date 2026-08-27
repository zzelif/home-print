import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { DocumentConverterService } from '../src/services/document-converter.service';

describe('Academic Pixel & Pigment Color Classification Engine', () => {
  const converter = new DocumentConverterService();

  it('classifies pure white / blank page as Tier 0 Monochrome (₱3.00)', async () => {
    const blankBuf = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    }).png().toBuffer();

    const result = await converter.analyzeRasterImageBuffer(blankBuf);
    expect(result.tier).toBe(0);
    expect(result.unitPrice).toBe(3.00);
    expect(result.tierName).toContain('Monochrome');
  });

  it('detects grayscale image stored inside 3-channel RGB mode and grants false-color immunity (Tier 0 @ ₱3.00)', async () => {
    // 400x400 neutral gray photo stored in 24-bit RGB mode
    const grayRgbBuf = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    }).png().toBuffer();

    const result = await converter.analyzeRasterImageBuffer(grayRgbBuf);
    expect(result.tier).toBe(0);
    expect(result.unitPrice).toBe(3.00);
    expect(result.tierName).toContain('Monochrome');
  });

  it('classifies white page with a 4% blue header/logo as Tier 1 Spot Color (₱8.00)', async () => {
    const logoBuf = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
    .composite([
      {
        input: await sharp({
          create: {
            width: 80,
            height: 80,
            channels: 3,
            background: { r: 20, g: 80, b: 220 }, // High-chroma blue logo
          },
        }).png().toBuffer(),
        top: 20,
        left: 20,
      },
    ])
    .png().toBuffer();

    const result = await converter.analyzeRasterImageBuffer(logoBuf);
    expect(result.tier).toBe(1);
    expect(result.unitPrice).toBe(8.00);
    expect(result.tierName).toContain('Spot / Logo');
  });

  it('classifies presentation slide with 25% orange/blue charts as Tier 2 Medium Color (₱15.00)', async () => {
    const slideBuf = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
    .composite([
      {
        input: await sharp({
          create: {
            width: 200,
            height: 200,
            channels: 3,
            background: { r: 240, g: 90, b: 30 }, // High-chroma orange chart block
          },
        }).png().toBuffer(),
        top: 100,
        left: 100,
      },
    ])
    .png().toBuffer();

    const result = await converter.analyzeRasterImageBuffer(slideBuf);
    expect(result.tier).toBe(2);
    expect(result.unitPrice).toBe(15.00);
    expect(result.tierName).toContain('Medium Color');
  });

  it('classifies dark burgundy/gold ornate full-page book cover as Tier 3 Heavy / Full Photo Color (₱20.00)', async () => {
    // High-chroma dark burgundy/gold full page
    const heavyBuf = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 120, g: 20, b: 40 }, // Rich dark burgundy
      },
    })
    .composite([
      {
        input: await sharp({
          create: {
            width: 300,
            height: 300,
            channels: 3,
            background: { r: 210, g: 160, b: 40 }, // Ornate gold frame
          },
        }).png().toBuffer(),
        top: 50,
        left: 50,
      },
    ])
    .png().toBuffer();

    const result = await converter.analyzeRasterImageBuffer(heavyBuf);
    expect(result.tier).toBe(3);
    expect(result.unitPrice).toBe(20.00);
    expect(result.tierName).toContain('Heavy / Full');
  });
});
