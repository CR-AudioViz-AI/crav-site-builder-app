import { test, expect } from "@playwright/test";

test.describe("Plugin Discovery", () => {
  test("plugin manifest is accessible and valid", async ({ request, baseURL }) => {
    const m = await request.get(`${baseURL}/.well-known/craudiovizai-plugin.json`);
    expect(m.ok()).toBeTruthy();

    const manifest = await m.json();
    expect(manifest.tool_key).toBe("website");
    expect(manifest.name).toBe("Website Builder");
    expect(manifest.api.dispatch_url).toContain("/functions/v1/_plugin-dispatch");
    expect(manifest.api.manifest_url).toContain("/.well-known/craudiovizai-plugin.json");
    expect(manifest.api.health_url).toContain("/functions/v1/_plugin-health");

    // Verify events
    expect(manifest.events_produced).toContain("website.site.draft.created");
    expect(manifest.events_produced).toContain("website.site.published");
    expect(manifest.events_produced).toContain("website.form.submitted");
    expect(manifest.events_produced).toContain("asset.created");

    // Verify capabilities
    expect(manifest.capabilities.draft).toBe(true);
    expect(manifest.capabilities.publish).toBe(true);
    expect(manifest.capabilities.forms).toBe(true);
    expect(manifest.capabilities.export).toBe(true);
  });

  test("health endpoint returns ok", async ({ request, baseURL }) => {
    const h = await request.get(`${baseURL}/functions/v1/_plugin-health`);
    expect(h.ok()).toBeTruthy();

    const health = await h.json();
    expect(health.ok).toBeTruthy();
    expect(health.tool_key).toBe("website");
  });

  test("dispatch endpoint handles OPTIONS preflight", async ({ request, baseURL }) => {
    const res = await request.fetch(`${baseURL}/functions/v1/_plugin-dispatch`, {
      method: "OPTIONS",
    });
    expect(res.ok()).toBeTruthy();
    expect(res.headers()["access-control-allow-origin"]).toBe("*");
    expect(res.headers()["access-control-allow-methods"]).toContain("POST");
  });

  test("dispatch endpoint requires valid payload", async ({ request, baseURL }) => {
    const res = await request.post(`${baseURL}/functions/v1/_plugin-dispatch`, {
      headers: {
        "content-type": "application/json",
        "x-org-id": process.env.E2E_ORG_ID || "test-org",
      },
      data: {},
    });
    // Should return 400 for invalid payload
    expect(res.status()).toBe(400);
  });
});
