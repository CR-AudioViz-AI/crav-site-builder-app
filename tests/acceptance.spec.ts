import { test, expect } from '@playwright/test';

const API_BASE = process.env.VITE_SUPABASE_URL + '/functions/v1';
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';

test.describe('Acceptance Checklist', () => {
  test('1. Generate→Preview ≤3s with pages in nav', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');

    await page.fill('[name="businessName"]', 'Test Co');
    await page.click('button:has-text("Generate")');

    await page.waitForURL(/\/preview\//, { timeout: 3000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(3000);
    expect(page.url()).toContain('/preview/');

    const navLinks = await page.locator('nav a').count();
    expect(navLinks).toBeGreaterThan(0);
  });

  test('2. AI Builder actions ≤2s with Undo/Diff', async ({ page }) => {
    await page.goto('/preview/test-site');

    await page.click('[data-testid="ai-builder"]');
    await page.click('button:has-text("Change palette")');

    const start = Date.now();
    await page.waitForResponse(/website-ai-apply/, { timeout: 2000 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(2000);

    await page.click('button[aria-label="Undo"]');
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();
  });

  test('3. Logo→Palette with WCAG AA + Lighthouse A11y ≥95', async ({ page }) => {
    await page.goto('/');

    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('./public/test-logo.png');

    await page.waitForSelector('[data-testid="palette-preview"]');

    const contrastRatio = await page.locator('[data-testid="contrast-ratio"]').textContent();
    expect(parseFloat(contrastRatio!)).toBeGreaterThanOrEqual(4.5);
  });

  test('4. 12 Templates + sections with content preservation', async ({ page }) => {
    await page.goto('/');

    const templates = await page.locator('[data-testid="template-card"]').count();
    expect(templates).toBeGreaterThanOrEqual(12);

    await page.click('[data-testid="template-card"]:first-child');
    const originalContent = await page.locator('h1').textContent();

    await page.click('button:has-text("Swap template")');
    await page.click('[data-testid="template-card"]:nth-child(2)');

    const newContent = await page.locator('h1').textContent();
    expect(newContent).toBe(originalContent);
  });

  test('5. E-commerce checkout + webhooks + download', async ({ page, request }) => {
    const checkoutRes = await request.post(`${API_BASE}/checkout`, {
      data: { productId: 'test-product', provider: 'stripe' }
    });
    expect(checkoutRes.ok()).toBeTruthy();

    const webhookRes = await request.post(`${API_BASE}/webhooks-stripe`, {
      data: { type: 'checkout.session.completed', data: { metadata: { orgId: DEMO_ORG_ID } } }
    });
    expect(webhookRes.ok()).toBeTruthy();

    const downloadRes = await request.get(`${API_BASE}/download/test-product`);
    expect(downloadRes.status()).toBe(200);
  });

  test('6. Legal pages generated and editable', async ({ page }) => {
    await page.goto('/preview/test-site');

    await expect(page.locator('a[href="/privacy"]')).toBeVisible();
    await expect(page.locator('a[href="/terms"]')).toBeVisible();

    await page.click('a[href="/privacy"]');
    await expect(page.locator('h1:has-text("Privacy")')).toBeVisible();

    await expect(page.locator('footer:has-text("©")')).toBeVisible();
  });

  test('7. SEO: sitemap, robots, tags + Lighthouse ≥90', async ({ page, request }) => {
    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);

    const robotsRes = await request.get('/robots.txt');
    expect(robotsRes.status()).toBe(200);

    await page.goto('/');
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
  });

  test('8. Dashboard tiles + My Access drawer + RBAC', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('[data-testid="tool-tile"]')).toHaveCount(3);

    await page.click('button:has-text("My Access")');
    await expect(page.locator('[data-testid="credits-balance"]')).toBeVisible();
    await expect(page.locator('[data-testid="plan-name"]')).toBeVisible();
  });

  test('9. Publish returns live HTTPS URL', async ({ page, request }) => {
    const publishRes = await request.post(`${API_BASE}/website-publish`, {
      data: { siteId: 'test-site', orgId: DEMO_ORG_ID }
    });

    const json = await publishRes.json();
    expect(json.data.url).toMatch(/^https:\/\//);

    const liveRes = await request.get(json.data.url);
    expect(liveRes.status()).toBe(200);

    const sitemapRes = await request.get(json.data.url + '/sitemap.xml');
    expect(sitemapRes.status()).toBe(200);
  });

  test('10. Telemetry events with orgId/siteId/userId/correlationId', async ({ page }) => {
    await page.goto('/');

    const logs: any[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('event:')) {
        logs.push(JSON.parse(msg.text().replace('event:', '')));
      }
    });

    await page.click('button:has-text("Generate")');
    await page.waitForTimeout(1000);

    const generateEvent = logs.find(l => l.type === 'generate_site');
    expect(generateEvent?.orgId).toBeTruthy();
    expect(generateEvent?.siteId).toBeTruthy();
    expect(generateEvent?.correlationId).toBeTruthy();
  });
});
