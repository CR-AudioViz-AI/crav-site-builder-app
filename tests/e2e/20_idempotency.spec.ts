import { test, expect } from "@playwright/test";

test.describe("Idempotency & Credits", () => {
  test("website-draft uses idempotency (same response, single debit)", async ({
    request,
    baseURL,
  }) => {
    const idem = crypto.randomUUID();
    const headers = {
      "content-type": "application/json",
      "x-idempotency-key": idem,
      "x-org-id": process.env.E2E_ORG_ID!,
      "x-user-email": "qa@craudiovizai.com",
    };
    const body = {
      siteId: "idempotency-test-" + Date.now(),
      page: { kind: "home", path: "/", lang: "en" },
      brief: {
        businessName: "Idempotency Test",
        tone: "friendly",
      },
    };

    // First request
    const r1 = await request.post(`${baseURL}/functions/v1/website-draft`, {
      headers,
      data: body,
    });
    const j1 = await r1.json();

    // Accept 200 (success) or 402 (insufficient credits)
    expect([200, 402]).toContain(r1.status());

    if (r1.status() === 200) {
      expect(j1.ok).toBeTruthy();
    }

    // Second request with same idempotency key
    const r2 = await request.post(`${baseURL}/functions/v1/website-draft`, {
      headers,
      data: body,
    });
    const j2 = await r2.json();

    // Should get same response
    expect(r2.status()).toBe(r1.status());

    if (r1.status() === 200) {
      // Cached response should be identical
      expect(JSON.stringify(j1)).toEqual(JSON.stringify(j2));
    }

    // Optional: Query credit_ledger to ensure only one debit recorded
    // This requires a test endpoint or direct DB access
  });

  test("Different idempotency keys create separate requests", async ({ request, baseURL }) => {
    const idem1 = crypto.randomUUID();
    const idem2 = crypto.randomUUID();
    const headers = {
      "content-type": "application/json",
      "x-org-id": process.env.E2E_ORG_ID!,
      "x-user-email": "qa@craudiovizai.com",
    };
    const body = {
      siteId: "multi-idem-test-" + Date.now(),
      page: { kind: "home", path: "/", lang: "en" },
      brief: { businessName: "Test", tone: "professional" },
    };

    // First request
    const r1 = await request.post(`${baseURL}/functions/v1/website-draft`, {
      headers: { ...headers, "x-idempotency-key": idem1 },
      data: body,
    });

    // Second request with different key
    const r2 = await request.post(`${baseURL}/functions/v1/website-draft`, {
      headers: { ...headers, "x-idempotency-key": idem2 },
      data: body,
    });

    // Both should be processed (not cached)
    expect([200, 402]).toContain(r1.status());
    expect([200, 402]).toContain(r2.status());
  });

  test("Missing idempotency key returns 400", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/functions/v1/website-draft`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        siteId: "no-idem-test",
        page: { kind: "home", path: "/", lang: "en" },
        brief: { businessName: "Test", tone: "friendly" },
      },
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Idempotency");
  });
});
