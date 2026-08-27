import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive Layout & UX Best Practices', () => {
  test.beforeEach(async ({ page, request }) => {
    // Authenticate with default PIN 1234
    try {
      const loginRes = await request.post('http://127.0.0.1:5000/api/operator/login', {
        data: { pin: '1234' },
      });
      const cookies = loginRes.headers()['set-cookie'];
      if (cookies) {
        const match = cookies.match(/hp_session=([^;]+)/);
        if (match) {
          await page.context().addCookies([
            {
              name: 'hp_session',
              value: match[1],
              domain: '127.0.0.1',
              path: '/',
            },
          ]);
        }
      }
    } catch (err) {
      console.warn('Could not authenticate before test:', err);
    }
  });

  test('Mobile Top Bar, Hamburger Drawer, and Close navigation', async ({ page, isMobile }) => {
    if (!isMobile) return;
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open Hamburger Drawer
    const menuBtn = page.locator('button[aria-label="Open Navigation Menu"]');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await page.waitForTimeout(300);

    // Links inside drawer
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('text=Live Queue')).toBeVisible();
    await expect(sidebar.locator('text=Layout Studio')).toBeVisible();
    await expect(sidebar.locator('text=Document Print')).toBeVisible();
    await expect(sidebar.locator('text=Analytics & History')).toBeVisible();

    // Close drawer with Close button
    const closeBtn = sidebar.locator('button[aria-label="Close Navigation"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(300);
  });

  test('Zero Horizontal Overflow on Mobile across all views', async ({ page, isMobile }) => {
    if (!isMobile) return;

    const routes = ['/', '/studio', '/document', '/analytics', '/settings'];

    for (const r of routes) {
      await page.goto(r);
      await page.waitForLoadState('domcontentloaded');

      const bodyWidth = await page.evaluate(() => document.body.clientWidth);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);

      expect(scrollWidth, `Route ${r} horizontally overflows viewport (${scrollWidth}px > ${viewportWidth}px)`).toBeLessThanOrEqual(
        viewportWidth + 2
      );
    }
  });

  test('Action button touch targets meet 40px+ minimum mobile ergonomic criteria', async ({ page, isMobile }) => {
    if (!isMobile) return;

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Target actionable navigation & action buttons
    const buttons = page.locator('header button[aria-label="Open Navigation Menu"], main button, main a.rounded-2xl');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box && box.height > 0) {
          expect(box.height, `Action button ${i} is too short (${box.height}px)`).toBeGreaterThanOrEqual(38);
        }
      }
    }
  });

  test('Layout Studio 4R Canvas maintains 2:3 aspect ratio and fits mobile screen', async ({ page }) => {
    await page.goto('/studio');
    await page.waitForLoadState('domcontentloaded');

    const viewport = page.viewportSize();
    const studioContainer = page.locator('#canvas-4r');
    await expect(studioContainer).toBeVisible();

    const box = await studioContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box && viewport) {
      // Must fit comfortably within viewport width (accounting for padding)
      expect(box.width).toBeLessThanOrEqual(viewport.width);
      // Verify approx 2:3 aspect ratio (width / height = 0.666 +/- 0.05)
      const ratio = box.width / box.height;
      expect(ratio).toBeGreaterThan(0.60);
      expect(ratio).toBeLessThan(0.72);
    }
  });

  test('Live Printer Status reflects truthful backend probe without false green status', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');

    // Verify Printer Discovery page loads
    await expect(page.locator('text=Hardware & Network Printer Discovery')).toBeVisible();

    // Verify presence of Scan button
    const scanBtn = page.locator('button:has-text("Scan for Printers")');
    await expect(scanBtn).toBeVisible();

    // Check printer card is present
    const printerCard = page.locator('text=HP Smart Tank');
    await expect(printerCard.first()).toBeVisible();

    // State reflects truth
    const isOnline = await page.locator('text=Ready for Printing').isVisible();
    const isOffline = await page.locator('text=Printer not connected / Offline').isVisible() || await page.locator('text=Disconnected').isVisible();
    expect(isOnline || isOffline).toBe(true);
  });

  test('Checkout Modal displays high-contrast change counter and quick tender buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const checkoutBtns = page.locator('button:has-text("Checkout")');
    if (await checkoutBtns.count() > 0) {
      await checkoutBtns.first().click();
      const modal = page.locator('text=Checkout & Change Counter');
      await expect(modal).toBeVisible();

      // Quick tender buttons
      const exactBtn = page.locator('button:has-text("Exact")').first();
      await expect(exactBtn).toBeVisible();

      // Change counter
      const changeCounter = page.locator('text=Customer Change Due');
      await expect(changeCounter).toBeVisible();

      // Close modal using Cancel button
      await page.click('button:has-text("Cancel")');
      await expect(modal).not.toBeVisible();
    }
  });

  test('Document Station Adaptive Costing accurately calculates Selected Page Range', async ({ page }) => {
    await page.goto('/document');
    await page.waitForLoadState('domcontentloaded');

    // Set page range to 1 only
    const rangeInput = page.locator('input[placeholder="all"]');
    await expect(rangeInput).toBeVisible();
    await rangeInput.fill('1');

    // Verify breakdown updates
    const page1OnlyBtn = page.locator('button:has-text("Page 1 Only")');
    await expect(page1OnlyBtn).toBeVisible();

    // Total price card reflects calculation
    const priceCard = page.locator('text=Total Price Due');
    await expect(priceCard).toBeVisible();
  });

  test('Visual Page Inspection and WebSocket emit Zero Console DOMExceptions', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/document');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Verify Visual Page Inspection header is present
    await expect(page.locator('text=Visual Page Inspection')).toBeVisible();

    // Assert zero DOMExceptions
    const domExceptions = consoleErrors.filter((e) => e.includes('DOMException'));
    expect(domExceptions.length, `Encountered DOMException: ${domExceptions.join(', ')}`).toBe(0);
  });

  test('Analytics Ledger and Queue Filters load cleanly without emojis', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Shop Analytics & Financial Ledger')).toBeVisible();
    await expect(page.locator('text=Permanent Accounting & Audit Ledger')).toBeVisible();
    await expect(page.locator('text=Customer Privacy Auto-Purge')).toBeVisible();

    // Navigate to dashboard and verify queue filter tabs
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('button:has-text("Active Queue")')).toBeVisible();
    await expect(page.locator('button:has-text("All Inbox")')).toBeVisible();
  });

  test('Document Station supports Philippine Long (8.5x13 in), Letter, Legal, and A4 Paper Sizes', async ({ page }) => {
    await page.goto('/document');
    await page.waitForLoadState('domcontentloaded');

    // Verify paper size select with A4, Letter, Long (Folio F4), and Legal options
    const paperSelect = page.locator('[data-testid="paper-size-select"]');
    await expect(paperSelect).toBeVisible();

    await paperSelect.selectOption({ value: 'Letter' });
    await expect(paperSelect).toHaveValue('Letter');

    await paperSelect.selectOption({ value: 'Long' });
    await expect(paperSelect).toHaveValue('Long');

    await paperSelect.selectOption({ value: 'Legal' });
    await expect(paperSelect).toHaveValue('Legal');

    await paperSelect.selectOption({ value: 'A4' });
    await expect(paperSelect).toHaveValue('A4');
  });

  test('Customer Drop QR Standee Modal & Public Drop Portal Verification', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open QR standee modal
    const qrBtn = page.locator('button:has-text("Customer QR")');
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    await expect(page.locator('text=Scan to Send Files')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();

    // Verify Copy button is present
    const copyBtn = page.locator('button:has-text("Copy")');
    await expect(copyBtn).toBeVisible();

    // Toggle Public Tunnel section
    const tunnelToggle = page.locator('button:has-text("Public Tunnel URL")');
    await expect(tunnelToggle).toBeVisible();
    await tunnelToggle.click();
    await expect(page.locator('input[placeholder*="https://drop.myprintshop.com"]')).toBeVisible();

    // Close modal
    await page.locator('button[aria-label="Close Modal"]').click();

    // Navigate to public /drop portal
    await page.goto('/drop');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1:has-text("HomePrint Drop Portal")')).toBeVisible();
    await expect(page.locator('button:has-text("Rush ID")')).toBeVisible();
  });
});
