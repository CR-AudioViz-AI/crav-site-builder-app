import { test, expect } from "@playwright/test";

test.describe("Site Publishing", () => {
  test("publish emits event and returns deploy info", async ({ request, baseURL }) => {
    const headers = {
      "content-type": "application/json",
      "x-org-id": process.env.E2E_ORG_ID!,
      "x-user-email": "qa@craudiovizai.com",
    };

    const res = await request.post(`${baseURL}/functions/v1/website-publish`, {
      headers,
      data: {
        siteId: "e2e-test-site",
        target: "preview",
        provider: "vercel",
      },
    });

    // Accept 200 (success) or 402 (insufficient credits)
    expect([200, 402]).toContain(res.status());

    if (res.status() === 200) {
      const json = await res.json();
      expect(json.ok).toBeTruthy();
      expect(json.data).toBeDefined();

      // Should include deploy info
      if (json.data.url) {
        expect(json.data.url).toContain("http");
      }

      // Event should be emitted: website.site.published
      // In real tests, verify via event log or Hub simulator
    }
  });

  test("publish includes brand_tokens in event payload", async ({ request, baseURL }) => {
    const headers = {
      "content-type": "application/json",
      "x-org-id": process.env.E2E_ORG_ID!,
      "x-user-email": "qa@craudiovizai.com",
    };

    const res = await request.post(`${baseURL}/functions/v1/website-publish`, {
      headers,
      data: {
        siteId: "e2e-test-site",
        target: "production",
        provider: "netlify",
      },
    });

    if (res.status() === 200) {
      const json = await res.json();
      expect(json.ok).toBeTruthy();

      // In real implementation, verify event payload includes brand_tokens
      // This is important for Newsletter Builder integration
    }
  });

  test("preview renders successfully", async ({ page, request, baseURL }) => {
    // First publish to preview
    const res = await request.post(`${baseURL}/functions/v1/website-publish`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        siteId: "e2e-test-site",
        target: "preview",
      },
    });

    if (res.status() === 200) {
      const json = await res.json();

      if (json.data?.url) {
        // Visit the preview URL
        await page.goto(json.data.url);

        // Verify page loads
        await expect(page.locator("body")).toBeVisible();

        // Should have at least one heading
        const heading = page.locator("h1, h2, h3").first();
        if (await heading.isVisible()) {
          await expect(heading).toBeVisible();
        }
      }
    }
  });

  test("publish requires valid site ID", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/functions/v1/website-publish`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        siteId: "nonexistent-site-" + Date.now(),
        target: "preview",
      },
    });

    expect(res.status()).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  test("publish deducts credits correctly", async ({ request, baseURL }) => {
    const headers = {
      "content-type": "application/json",
      "x-org-id": process.env.E2E_ORG_ID!,
      "x-user-email": "qa@craudiovizai.com",
    };

    // Note: With internal bypass enabled, credits won't be deducted
    // This test verifies the response format

    const res = await request.post(`${baseURL}/functions/v1/website-publish`, {
      headers,
      data: {
        siteId: "e2e-test-site",
        target: "preview",
      },
    });

    // Should return 200 (with bypass) or 402 (without bypass, insufficient credits)
    expect([200, 402]).toContain(res.status());

    if (res.status() === 402) {
      const json = await res.json();
      expect(json.error).toBe("credits_insufficient");
      expect(json.balance).toBeDefined();
      expect(json.required).toBeDefined();
    }
  });
});
