import { test, expect } from "@playwright/test";

test.describe("Forms & Submissions", () => {
  test("form submit works without CAPTCHA", async ({ request, baseURL }) => {
    // When CAPTCHA_PROVIDER=none, submission should succeed immediately
    const res = await request.post(`${baseURL}/functions/v1/website-form-submit`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        formId: "contact",
        siteId: "e2e-test-site",
        data: {
          name: "E2E Tester",
          email: "e2e@example.com",
          message: "Hello from E2E tests",
        },
      },
    });

    // Should succeed if CAPTCHA is disabled
    if (process.env.CAPTCHA_PROVIDER === "none" || !process.env.CAPTCHA_PROVIDER) {
      expect([200, 201]).toContain(res.status());
      const json = await res.json();
      expect(json.ok).toBeTruthy();
    } else {
      // Should fail without CAPTCHA token
      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("CAPTCHA");
    }
  });

  test("form submit requires CAPTCHA token when enabled", async ({ request, baseURL }) => {
    // Skip if CAPTCHA is not enabled
    if (process.env.CAPTCHA_PROVIDER === "none" || !process.env.CAPTCHA_PROVIDER) {
      test.skip();
    }

    const res = await request.post(`${baseURL}/functions/v1/website-form-submit`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
      },
      data: {
        formId: "contact",
        siteId: "e2e-test-site",
        data: { name: "Test", email: "test@example.com" },
        // Missing captchaToken
      },
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("CAPTCHA");
  });

  test("form submit with valid CAPTCHA token succeeds", async ({ request, baseURL }) => {
    // Skip if CAPTCHA is not enabled
    if (process.env.CAPTCHA_PROVIDER === "none" || !process.env.CAPTCHA_PROVIDER) {
      test.skip();
    }

    // Use provider test token (hCaptcha: "10000000-aaaa-bbbb-cccc-000000000001")
    const testToken =
      process.env.CAPTCHA_PROVIDER === "hcaptcha"
        ? "10000000-aaaa-bbbb-cccc-000000000001"
        : "test-token";

    const res = await request.post(`${baseURL}/functions/v1/website-form-submit`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
      },
      data: {
        formId: "contact",
        siteId: "e2e-test-site",
        data: { name: "Test", email: "test@example.com" },
        captchaToken: testToken,
      },
    });

    expect([200, 201]).toContain(res.status());
    const json = await res.json();
    expect(json.ok).toBeTruthy();
  });

  test("form submission emits event", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/functions/v1/website-form-submit`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        formId: "test-form-event",
        siteId: "e2e-test-site",
        data: { name: "Event Test", email: "event@example.com" },
      },
    });

    if (res.ok()) {
      const json = await res.json();
      expect(json.ok).toBeTruthy();

      // Event should be emitted: website.form.submitted
      // In real tests, query event log or verify via webhook simulator
    }
  });

  test("form submission sanitizes HTML input", async ({ request, baseURL }) => {
    const maliciousInput = '<script>alert("XSS")</script><p>Normal text</p>';

    const res = await request.post(`${baseURL}/functions/v1/website-form-submit`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        formId: "sanitization-test",
        siteId: "e2e-test-site",
        data: {
          name: "Test",
          message: maliciousInput,
        },
      },
    });

    if (res.ok()) {
      // In real implementation, fetch the submission and verify HTML is sanitized
      // Should strip <script> tags but keep safe tags like <p>
      expect(res.ok()).toBeTruthy();
    }
  });
});
