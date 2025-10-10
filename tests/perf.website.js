import assert from "node:assert/strict";

const BASE_URL = process.env.SUPABASE_URL || "http://localhost:54321";
const RUNS = 5;
const P50_BUDGET_MS = 250;
const P95_BUDGET_MS = 900;

async function measureLatency(url, options = {}) {
  const latencies = [];
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    const res = await fetch(url, options);
    await res.text();
    latencies.push(performance.now() - t0);
  }
  return latencies;
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * p);
  return sorted[idx] || sorted[sorted.length - 1];
}

(async () => {
  console.log("🧪 Running Website Builder perf smoke tests...");

  // Test 1: Health endpoint
  console.log("\n  Testing health endpoint...");
  const healthLatencies = await measureLatency(`${BASE_URL}/functions/v1/_plugin-health`);
  const healthP50 = percentile(healthLatencies, 0.5);
  const healthP95 = percentile(healthLatencies, 0.95);

  console.log(`    P50: ${Math.round(healthP50)}ms`);
  console.log(`    P95: ${Math.round(healthP95)}ms`);

  assert.ok(healthP50 < P50_BUDGET_MS, `Health P50 too high: ${healthP50}ms > ${P50_BUDGET_MS}ms`);
  assert.ok(healthP95 < P95_BUDGET_MS, `Health P95 too high: ${healthP95}ms > ${P95_BUDGET_MS}ms`);
  console.log("  ✅ Health endpoint within budget");

  // Test 2: Manifest endpoint
  console.log("\n  Testing manifest endpoint...");
  const manifestLatencies = await measureLatency(`${BASE_URL}/.well-known/craudiovizai-plugin.json`);
  const manifestP50 = percentile(manifestLatencies, 0.5);
  const manifestP95 = percentile(manifestLatencies, 0.95);

  console.log(`    P50: ${Math.round(manifestP50)}ms`);
  console.log(`    P95: ${Math.round(manifestP95)}ms`);

  assert.ok(manifestP50 < P50_BUDGET_MS, `Manifest P50 too high: ${manifestP50}ms > ${P50_BUDGET_MS}ms`);
  assert.ok(manifestP95 < P95_BUDGET_MS, `Manifest P95 too high: ${manifestP95}ms > ${P95_BUDGET_MS}ms`);
  console.log("  ✅ Manifest endpoint within budget");

  // Test 3: Dispatch endpoint (OPTIONS request)
  console.log("\n  Testing dispatch OPTIONS...");
  const dispatchLatencies = await measureLatency(`${BASE_URL}/functions/v1/_plugin-dispatch`, {
    method: "OPTIONS",
  });
  const dispatchP50 = percentile(dispatchLatencies, 0.5);
  const dispatchP95 = percentile(dispatchLatencies, 0.95);

  console.log(`    P50: ${Math.round(dispatchP50)}ms`);
  console.log(`    P95: ${Math.round(dispatchP95)}ms`);

  assert.ok(dispatchP50 < P50_BUDGET_MS, `Dispatch P50 too high: ${dispatchP50}ms > ${P50_BUDGET_MS}ms`);
  assert.ok(dispatchP95 < P95_BUDGET_MS, `Dispatch P95 too high: ${dispatchP95}ms > ${P95_BUDGET_MS}ms`);
  console.log("  ✅ Dispatch endpoint within budget");

  console.log("\n✅ All perf smoke tests passed!");
  console.log(`\nSummary:`);
  console.log(`  Health:   P50=${Math.round(healthP50)}ms, P95=${Math.round(healthP95)}ms`);
  console.log(`  Manifest: P50=${Math.round(manifestP50)}ms, P95=${Math.round(manifestP95)}ms`);
  console.log(`  Dispatch: P50=${Math.round(dispatchP50)}ms, P95=${Math.round(dispatchP95)}ms`);
})();
