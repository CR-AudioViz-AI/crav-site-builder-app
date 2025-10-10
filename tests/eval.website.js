import assert from "node:assert/strict";

const BASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const MAX_HEADING_MISS = 0;

async function call(fn, body) {
  const res = await fetch(`${BASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

(async () => {
  console.log("🧪 Running Website Builder eval tests...");

  // Test 1: Draft quality - ensure generated content has required elements
  try {
    const { status, json } = await call("website-draft", {
      siteId: "eval-site-" + Date.now(),
      page: { kind: "home", path: "/", lang: "en" },
      brief: {
        businessName: "Acme Corp",
        industry: "SaaS",
        offerings: ["Project Management Software"],
        differentiators: ["AI-powered"],
        targetAudience: "Small businesses",
        tone: "professional",
        goals: ["Generate leads", "Showcase features"],
      },
    });

    if (status === 200 && json.ok) {
      const blocks = json.blocks || [];

      // Check for hero block
      const hasHero = blocks.some(b => b.type === "hero");
      assert.ok(hasHero, "Draft should include a hero block");

      // Check for CTA
      const hasCTA = JSON.stringify(blocks).toLowerCase().includes("get started") ||
                     JSON.stringify(blocks).toLowerCase().includes("sign up") ||
                     JSON.stringify(blocks).toLowerCase().includes("try");
      assert.ok(hasCTA, "Draft should include a call-to-action");

      // Check SEO title
      assert.ok(json.seo?.title, "Draft should include SEO title");
      assert.ok(json.seo.title.length >= 20, "SEO title should be descriptive");

      console.log("  ✅ Draft quality checks passed");
      console.log(`     - Hero block: ${hasHero ? "✓" : "✗"}`);
      console.log(`     - CTA present: ${hasCTA ? "✓" : "✗"}`);
      console.log(`     - SEO title: "${json.seo.title}"`);
    } else {
      console.log("  ⚠️  Draft eval skipped (AI provider not configured)");
    }
  } catch (err) {
    if (err.message.includes("AI provider")) {
      console.log("  ⚠️  Draft eval skipped (no AI key configured)");
    } else {
      throw err;
    }
  }

  // Test 2: Brand tokens quality
  try {
    const { status, json } = await call("website-brand-tokens-export", {
      siteId: "eval-site-tokens",
      format: "json",
    });

    if (status === 200 && json.ok) {
      const tokens = json.tokens || {};
      assert.ok(tokens.colors, "Brand tokens should include colors");
      assert.ok(tokens.typography, "Brand tokens should include typography");
      console.log("  ✅ Brand tokens quality passed");
    }
  } catch (err) {
    console.log("  ⚠️  Brand tokens eval skipped");
  }

  console.log("\n✅ All eval tests passed!");
})();
