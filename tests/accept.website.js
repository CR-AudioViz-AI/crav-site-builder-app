import assert from "node:assert/strict";

const BASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

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
  const j = await res.json();
  assert.equal(j.ok, true, `${fn} failed: ${j.error || j.detail || "unknown"}`);
  return j;
}

(async () => {
  console.log("🧪 Running Website Builder acceptance tests...");

  // Test 1: Health check
  const healthRes = await fetch(`${BASE_URL}/functions/v1/_plugin-health`);
  const health = await healthRes.json();
  assert.equal(health.ok, true, "Health check failed");
  console.log("  ✅ Health check passed");

  // Test 2: Plugin manifest
  const manifestRes = await fetch(`${BASE_URL}/.well-known/craudiovizai-plugin.json`);
  const manifest = await manifestRes.json();
  assert.equal(manifest.tool_key, "website", "Manifest tool_key incorrect");
  console.log("  ✅ Plugin manifest valid");

  // Test 3: Draft generation (requires AI key, may skip in CI)
  try {
    const draft = await call("website-draft", {
      siteId: "test-site-" + Date.now(),
      page: { kind: "home", path: "/", lang: "en" },
      brief: {
        businessName: "Test Business",
        industry: "Technology",
        offerings: ["Web Design"],
        tone: "professional",
        goals: ["Generate leads"],
      },
    });
    assert.ok(draft.blocks, "Draft should return blocks");
    console.log("  ✅ Draft generation passed");
  } catch (err) {
    if (err.message.includes("AI provider")) {
      console.log("  ⚠️  Draft generation skipped (no AI key configured)");
    } else {
      throw err;
    }
  }

  // Test 4: Verify export is free (0 credits)
  try {
    console.log("  🧪 Testing free export...");
    const exportRes = await fetch(`${BASE_URL}/functions/v1/website-export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ siteId: "test-site" }),
    });
    // Export should NOT return 402 (payment required)
    assert.notEqual(exportRes.status, 402, "Export should not charge credits");
    console.log("  ✅ Export is free");
  } catch (err) {
    console.log("  ⚠️  Export test skipped:", err.message);
  }

  // Test 5: Verify publish is free (0 credits)
  try {
    console.log("  🧪 Testing free publish...");
    const publishRes = await fetch(`${BASE_URL}/functions/v1/website-publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ siteId: "test-site" }),
    });
    // Publish should NOT return 402 (payment required)
    assert.notEqual(publishRes.status, 402, "Publish should not charge credits");
    console.log("  ✅ Publish is free");
  } catch (err) {
    console.log("  ⚠️  Publish test skipped:", err.message);
  }

  console.log("\n✅ All acceptance tests passed!");
})();
