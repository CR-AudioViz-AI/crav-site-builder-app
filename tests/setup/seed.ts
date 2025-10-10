import fetch from "cross-fetch";
import { faker } from "@faker-js/faker";

const ORG_ID = process.env.E2E_ORG_ID!;
const BASE = process.env.E2E_BASE_URL!;
const FUN = (f: string) => `${BASE}/functions/v1/${f}`;

async function call(fn: string, body: any, headers: Record<string, string> = {}) {
  const res = await fetch(FUN(fn), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-org-id": ORG_ID,
      "x-user-email": "qa@craudiovizai.com",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${fn} ${res.status} ${JSON.stringify(j)}`);
  }
  return j;
}

async function main() {
  console.log("🌱 Seeding E2E test data...");
  console.log(`   Org ID: ${ORG_ID}`);
  console.log(`   Base URL: ${BASE}`);

  // Note: Internal bypass should be ON for E2E to avoid credit consumption
  // Set: INTERNAL_BYPASS_MODE=credits
  //      INTERNAL_UNLIMITED_ORG_IDS includes ORG_ID

  console.log("\n1️⃣  Creating baseline site via draft (idempotent)...");
  const idem = crypto.randomUUID();
  const draftResult = await call(
    "website-draft",
    {
      siteId: "e2e-test-site",
      page: { kind: "home", path: "/", lang: "en" },
      brief: {
        businessName: faker.company.name(),
        industry: "Technology",
        offerings: ["E2E Testing", "Quality Assurance"],
        targetAudience: "Developers",
        tone: "friendly",
        goals: ["Verify functionality"],
      },
    },
    { "x-idempotency-key": idem }
  );
  console.log(`   ✅ Draft created: ${draftResult.ok ? "success" : "failed"}`);

  console.log("\n2️⃣  Saving a page with fake HTML...");
  const pageHtml = `
    <h1>${faker.company.name()}</h1>
    <p>${faker.company.catchPhrase()}</p>
    <button>Get Started</button>
  `;
  const saveResult = await call("website-save-page", {
    siteId: "e2e-test-site",
    page: {
      id: "home",
      path: "/",
      title: "Home",
      html: pageHtml,
      blocks: [
        { type: "hero", content: { heading: faker.company.name() } },
        { type: "cta", content: { text: "Get Started" } },
      ],
    },
  });
  console.log(`   ✅ Page saved: ${saveResult.ok ? "success" : "failed"}`);

  console.log("\n3️⃣  Creating a test form...");
  // Forms are typically created via UI, but we can seed via DB if needed
  // For now, just log that forms should be tested via the form-submit endpoint

  console.log("\n4️⃣  Publishing to preview...");
  const publishResult = await call("website-publish", {
    siteId: "e2e-test-site",
    target: "preview",
    provider: "vercel",
  });
  console.log(`   ✅ Published: ${publishResult.ok ? "success" : "failed"}`);

  console.log("\n✅ Seed complete!");
  console.log(
    JSON.stringify(
      {
        ok: true,
        orgId: ORG_ID,
        siteId: "e2e-test-site",
        testData: {
          businessName: faker.company.name(),
          email: faker.internet.email(),
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
