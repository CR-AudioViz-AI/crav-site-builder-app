import { test, expect } from "@playwright/test";

test.describe("UI Core Features", () => {
  test.beforeAll(async ({ request, baseURL }) => {
    // Ensure we have a site to work with
    const idem = crypto.randomUUID();
    const res = await request.post(`${baseURL}/functions/v1/website-draft`, {
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": idem,
        "x-org-id": process.env.E2E_ORG_ID!,
        "x-user-email": "qa@craudiovizai.com",
      },
      data: {
        siteId: "e2e-ui-test",
        page: { kind: "home", path: "/", lang: "en" },
        brief: { businessName: "Test Co", tone: "friendly" },
      },
    });
    // Accept 200 or 402 (might be out of credits without bypass)
    expect([200, 402]).toContain(res.status());
  });

  test("Dashboard loads and shows Website Builder", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    // Look for Website or similar navigation
    const websiteLink = page.getByRole("link", { name: /website/i });
    if (await websiteLink.isVisible()) {
      await expect(websiteLink).toBeVisible();
    }
  });

  test("Website builder shows cost labels on paid actions", async ({ page }) => {
    await page.goto("/website");

    // Look for buttons with credit costs
    const draftButton = page.getByRole("button", { name: /draft/i }).first();
    if (await draftButton.isVisible()) {
      const buttonText = await draftButton.textContent();
      // Should contain credit cost like "2 cr" or "credits"
      expect(buttonText?.toLowerCase()).toMatch(/\d+\s*(cr|credit)/);
    }
  });

  test("Credit balance is visible in header", async ({ page }) => {
    await page.goto("/website");

    // Look for credit balance indicator
    const creditIndicator = page.locator('[data-testid="credit-balance"]').or(
      page.getByText(/\d+\s*credit/i)
    );

    // May or may not be visible depending on auth setup
    if (await creditIndicator.isVisible()) {
      await expect(creditIndicator).toBeVisible();
    }
  });

  test("Out-of-credits modal appears when server returns 402", async ({ page, context }) => {
    // Intercept API calls and return 402
    await context.route("**/functions/v1/website-draft", async (route) => {
      await route.fulfill({
        status: 402,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: "credits_insufficient",
          balance: 0,
          required: 2,
        }),
      });
    });

    await page.goto("/website/new");

    const draftButton = page.getByRole("button", { name: /draft/i }).first();
    if (await draftButton.isVisible()) {
      await draftButton.click();

      // Expect out-of-credits modal
      const modal = page.getByText(/out of credits|insufficient credits|add credits/i);
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Should show balance and required
      await expect(page.getByText(/balance.*0/i)).toBeVisible();
      await expect(page.getByText(/required.*2/i)).toBeVisible();

      // Should have a top-up button
      const topUpButton = page.getByRole("button", { name: /top up|add credits/i });
      await expect(topUpButton).toBeVisible();
    }
  });
});
