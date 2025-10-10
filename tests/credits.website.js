import assert from "node:assert/strict";

const BASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

async function testCreditsTransparency() {
  console.log("🧪 Testing Credits Transparency...");

  // Test 1: Balance endpoint
  console.log("  Testing balance endpoint...");
  const balanceRes = await fetch(`${BASE_URL}/functions/v1/credits-balance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
  });

  const balanceJson = await balanceRes.json();
  assert.equal(balanceJson.ok, true, "Balance endpoint should return ok");
  assert.equal(
    typeof balanceJson.data.credits_remaining,
    "number",
    "credits_remaining should be a number"
  );
  assert.equal(
    typeof balanceJson.data.credits_total,
    "number",
    "credits_total should be a number"
  );
  assert.equal(
    typeof balanceJson.data.credits_spent,
    "number",
    "credits_spent should be a number"
  );
  console.log("  ✅ Balance endpoint works");
  console.log(`     Credits: ${balanceJson.data.credits_remaining} remaining of ${balanceJson.data.credits_total}`);

  // Test 2: Ledger endpoint
  console.log("  Testing ledger endpoint...");
  const ledgerRes = await fetch(`${BASE_URL}/functions/v1/credits-ledger?limit=10`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
    },
  });

  const ledgerJson = await ledgerRes.json();
  assert.equal(ledgerJson.ok, true, "Ledger endpoint should return ok");
  assert.ok(Array.isArray(ledgerJson.data), "Ledger should return an array");
  console.log("  ✅ Ledger endpoint works");
  console.log(`     Entries: ${ledgerJson.data.length} records returned`);

  // Test 3: Ledger filtering
  if (ledgerJson.data.length > 0) {
    const firstEntry = ledgerJson.data[0];
    console.log("  Testing ledger filtering by action...");
    const filteredRes = await fetch(
      `${BASE_URL}/functions/v1/credits-ledger?action=${firstEntry.action}&limit=5`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${ANON_KEY}`,
        },
      }
    );

    const filteredJson = await filteredRes.json();
    assert.equal(filteredJson.ok, true, "Filtered ledger should return ok");
    console.log("  ✅ Ledger filtering works");

    // Verify ledger entry structure
    console.log("  Verifying ledger entry structure...");
    const entry = filteredJson.data[0];
    if (entry) {
      assert.ok(entry.id, "Entry should have id");
      assert.ok(entry.org_id, "Entry should have org_id");
      assert.ok(entry.action, "Entry should have action");
      assert.equal(typeof entry.cost, "number", "Entry cost should be a number");
      assert.equal(typeof entry.waived, "boolean", "Entry waived should be boolean");
      assert.equal(typeof entry.internal_bypass, "boolean", "Entry internal_bypass should be boolean");
      console.log("  ✅ Ledger entry structure valid");
    }
  }

  console.log("\n✅ All credits transparency tests passed!");
}

// Run tests
testCreditsTransparency().catch((err) => {
  console.error("\n❌ Credits transparency tests failed:");
  console.error(err);
  process.exit(1);
});
