# Website Builder - E2E Testing Guide

Complete end-to-end testing setup with Playwright.

---

## 📦 Test Infrastructure

### Components
1. **Playwright** - Browser automation and testing
2. **@faker-js/faker** - Generate realistic test data
3. **cross-fetch** - HTTP requests in Node.js
4. **ts-node** - Run TypeScript scripts

### Test Structure
```
tests/
├── setup/
│   └── seed.ts           # Seed test data (idempotent)
├── simulators/
│   └── hub.ts            # Hub webhook simulator
├── e2e/
│   ├── 00_plugin_manifest.spec.ts  # Plugin discovery
│   ├── 10_ui_core.spec.ts          # UI walkthrough
│   ├── 20_idempotency.spec.ts      # API idempotency
│   ├── 30_forms.spec.ts            # Forms & CAPTCHA
│   └── 40_publish.spec.ts          # Publishing & events
├── accept.website.js     # Acceptance tests (fast)
├── eval.website.js       # LLM quality tests
└── perf.website.js       # Performance smoke tests
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

Playwright browsers will be installed automatically on first run, or manually:

```bash
npx playwright install --with-deps
```

### 2. Configure Environment

Copy the example and fill in your values:

```bash
cp .env.e2e.example .env.e2e
```

**Required Variables:**
```bash
E2E_BASE_URL=https://website.dev.yourcompany.com
E2E_APP_URL=https://website.dev.yourcompany.com
E2E_ORG_ID=your-test-org-uuid
```

**Important:** Ensure internal bypass is enabled for your test org:
```bash
INTERNAL_BYPASS_MODE=credits
INTERNAL_UNLIMITED_ORG_IDS=your-test-org-uuid
INTERNAL_EMAIL_DOMAIN=craudiovizai.com
```

### 3. Seed Test Data

```bash
npm run e2e:seed
```

This creates:
- Baseline site via draft
- Test pages with fake content
- Published preview

### 4. Run Tests

```bash
# Run all E2E tests (headless)
npm run e2e

# Run with UI mode (interactive)
npm run e2e:ui

# Run in headed mode (see browser)
npm run e2e:headed

# Run specific test file
npx playwright test 00_plugin_manifest

# View test report
npm run e2e:report
```

---

## 📋 Test Coverage

### 1. Plugin Discovery (00_plugin_manifest.spec.ts)

Tests plugin architecture compliance:

- ✅ Manifest is accessible at `/.well-known/craudiovizai-plugin.json`
- ✅ Manifest contains correct tool_key, API URLs, events
- ✅ Health endpoint returns 200 with `{ok: true}`
- ✅ Dispatch endpoint handles OPTIONS preflight
- ✅ Dispatch endpoint validates payload

**Run:**
```bash
npx playwright test 00_plugin_manifest
```

### 2. UI Core Features (10_ui_core.spec.ts)

Tests user interface and interactions:

- ✅ Dashboard loads and shows Website Builder
- ✅ Cost labels visible on paid action buttons (e.g., "Draft (2 cr)")
- ✅ Credit balance visible in header
- ✅ Out-of-credits modal appears on 402 response
- ✅ Modal shows balance, required, and top-up button

**Run:**
```bash
npx playwright test 10_ui_core
```

### 3. Idempotency & Credits (20_idempotency.spec.ts)

Tests API idempotency and credit handling:

- ✅ Same idempotency key returns cached response
- ✅ Same idempotency key results in single credit debit
- ✅ Different keys create separate requests
- ✅ Missing idempotency key returns 400 error

**Run:**
```bash
npx playwright test 20_idempotency
```

### 4. Forms & Submissions (30_forms.spec.ts)

Tests form functionality and CAPTCHA:

- ✅ Form submit works without CAPTCHA (when disabled)
- ✅ Form submit requires CAPTCHA token (when enabled)
- ✅ Valid CAPTCHA token allows submission
- ✅ Form submission emits `website.form.submitted` event
- ✅ HTML input is sanitized (XSS prevention)

**Run:**
```bash
npx playwright test 30_forms
```

### 5. Publishing & Events (40_publish.spec.ts)

Tests site publishing and event emission:

- ✅ Publish emits `website.site.published` event
- ✅ Publish includes brand_tokens in event payload
- ✅ Preview renders successfully
- ✅ Invalid site ID returns 404
- ✅ Credits deducted correctly (or 402 on insufficient)

**Run:**
```bash
npx playwright test 40_publish
```

---

## 🔧 Configuration

### Playwright Config (playwright.config.ts)

```typescript
export default defineConfig({
  timeout: 60_000,              // Test timeout
  testDir: "tests/e2e",         // Test directory
  fullyParallel: true,          // Run tests in parallel
  retries: process.env.CI ? 2 : 0,  // Retry on CI
  use: {
    baseURL: process.env.E2E_APP_URL || "http://localhost:5173",
    trace: "on-first-retry",    // Trace on failure
    video: "on-first-retry",    // Video on failure
    screenshot: "only-on-failure",
  },
});
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `E2E_BASE_URL` | Base URL for API calls | Yes |
| `E2E_APP_URL` | Base URL for UI tests | Yes |
| `E2E_ORG_ID` | Test organization UUID | Yes |
| `INTERNAL_BYPASS_MODE` | Enable internal bypass | Recommended |
| `INTERNAL_UNLIMITED_ORG_IDS` | Bypass org IDs | Recommended |
| `CAPTCHA_PROVIDER` | CAPTCHA provider (none/hcaptcha/recaptcha) | No |
| `SUPABASE_URL` | Supabase project URL | Yes (for seed) |
| `SUPABASE_ANON_KEY` | Supabase anon key | Yes (for seed) |

---

## 🎯 Running in CI

### GitHub Actions Example

```yaml
name: E2E Tests
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Seed test data
        env:
          E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
          E2E_ORG_ID: ${{ secrets.E2E_ORG_ID }}
          INTERNAL_BYPASS_MODE: credits
          INTERNAL_UNLIMITED_ORG_IDS: ${{ secrets.E2E_ORG_ID }}
        run: npm run e2e:seed
      - name: Run E2E tests
        env:
          E2E_BASE_URL: ${{ secrets.E2E_BASE_URL }}
          E2E_APP_URL: ${{ secrets.E2E_APP_URL }}
          E2E_ORG_ID: ${{ secrets.E2E_ORG_ID }}
          CI: true
        run: npm run e2e
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🐛 Debugging

### Run with UI Mode

Best for development:

```bash
npm run e2e:ui
```

Features:
- Watch tests run in real-time
- Step through each action
- Inspect DOM and network
- Time travel debugging

### Run in Headed Mode

See the actual browser:

```bash
npm run e2e:headed
```

### Debug Specific Test

```bash
npx playwright test 10_ui_core --debug
```

### View Traces

After a test failure:

```bash
npx playwright show-trace trace.zip
```

---

## 📊 Test Reports

### HTML Report

Generated automatically after test run:

```bash
npm run e2e:report
```

Opens interactive HTML report with:
- Test results and timing
- Screenshots on failure
- Video recordings
- Network activity
- Console logs

### CI Integration

Reports are uploaded as artifacts in CI for debugging failed tests.

---

## 🔒 Security Considerations

### Internal Bypass

E2E tests should use internal bypass to:
- Avoid credit consumption during testing
- Speed up test execution
- Prevent test flakiness due to credit limits

**Setup:**
```bash
INTERNAL_BYPASS_MODE=credits
INTERNAL_UNLIMITED_ORG_IDS=your-test-org-uuid
```

### Test Isolation

Each test should:
- Use unique idempotency keys
- Create unique site IDs (with timestamp)
- Clean up after itself (or use idempotent operations)

### Secrets Management

In CI:
- Store E2E credentials as GitHub Secrets
- Never commit `.env.e2e` file
- Use separate test org (not production)

---

## 🧪 Writing New Tests

### Test Template

```typescript
import { test, expect } from "@playwright/test";

test.describe("Feature Name", () => {
  test("should do something specific", async ({ page, request, baseURL }) => {
    // Arrange
    await page.goto("/feature");

    // Act
    await page.getByRole("button", { name: /action/i }).click();

    // Assert
    await expect(page.getByText(/result/i)).toBeVisible();
  });
});
```

### Best Practices

1. **Use descriptive test names**
   ```typescript
   test("form submit requires CAPTCHA token when enabled", async () => {
     // ...
   });
   ```

2. **Use Playwright locators**
   ```typescript
   // Good
   page.getByRole("button", { name: /submit/i })

   // Avoid
   page.locator("#submit-btn")
   ```

3. **Handle async properly**
   ```typescript
   await expect(page.getByText("Success")).toBeVisible();
   ```

4. **Use test.skip for conditional tests**
   ```typescript
   if (process.env.CAPTCHA_PROVIDER === "none") {
     test.skip();
   }
   ```

5. **Clean up in beforeAll/afterAll**
   ```typescript
   test.beforeAll(async () => {
     // Setup
   });

   test.afterAll(async () => {
     // Cleanup
   });
   ```

---

## 📈 Performance

### Test Execution Time

| Test Suite | Tests | Duration |
|------------|-------|----------|
| Plugin Manifest | 4 | ~2s |
| UI Core | 4 | ~15s |
| Idempotency | 3 | ~5s |
| Forms | 5 | ~10s |
| Publishing | 5 | ~15s |
| **Total** | **21** | **~47s** |

### Optimization Tips

1. **Run tests in parallel** (enabled by default)
2. **Use internal bypass** (no credit API calls)
3. **Reuse browser contexts** where possible
4. **Skip tests conditionally** (e.g., CAPTCHA tests)
5. **Use baseURL** instead of full URLs

---

## 🎓 Learn More

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Faker.js Documentation](https://fakerjs.dev)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🚀 Summary

**E2E tests verify:**
✅ Plugin architecture compliance
✅ UI flows and interactions
✅ API idempotency and credits
✅ Forms and CAPTCHA enforcement
✅ Publishing and event emission
✅ Security (RLS, sanitization, signatures)

**Run commands:**
```bash
npm run e2e:seed    # Seed test data
npm run e2e         # Run all tests
npm run e2e:ui      # Interactive mode
npm run e2e:report  # View results
```

**Ready to test! 🎉**
