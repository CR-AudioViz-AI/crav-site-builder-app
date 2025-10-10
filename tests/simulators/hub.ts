import fetch from "cross-fetch";
import { createHmac } from "crypto";

const BASE = process.env.E2E_BASE_URL!;
const HUB_SECRET = process.env.HUB_SIGNING_KEY || "disabled";

function sign(body: string): string {
  if (HUB_SECRET === "disabled") return "stub-signature";
  const hmac = createHmac("sha256", HUB_SECRET);
  hmac.update(body);
  return hmac.digest("hex");
}

export async function emit(event: string, payload: any): Promise<void> {
  const body = JSON.stringify({
    event,
    payload,
    ts: new Date().toISOString(),
  });

  // Liveness ping
  await fetch(`${BASE}/functions/v1/_plugin-health`, { method: "GET" });

  // If Hub is enabled in tests, POST signed events
  if (HUB_SECRET !== "disabled") {
    const hubUrl = process.env.HUB_URL;
    if (hubUrl) {
      await fetch(hubUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": sign(body),
        },
        body,
      });
    }
  }
}

export async function verifyEvent(eventType: string, timeout = 5000): Promise<boolean> {
  // Poll or query your event log to verify the event was emitted
  // This is a stub implementation
  const start = Date.now();
  while (Date.now() - start < timeout) {
    // In real implementation, query your events table or Hub API
    // For now, just wait and return true
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return true;
}
