import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE } from "../core-mini/env.ts";

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

export interface Event {
  type: string;
  org_id: string;
  payload: Record<string, any>;
  source?: string;
  timestamp?: string;
}

export async function emitEvent(event: Event): Promise<void> {
  const supabase = getSupabaseClient();

  try {
    await supabase.from("events").insert({
      type: event.type,
      org_id: event.org_id,
      payload: event.payload,
      source: event.source || "website",
      timestamp: event.timestamp || new Date().toISOString(),
    });

    const { data: webhooks } = await supabase
      .from("org_webhooks")
      .select("*")
      .eq("org_id", event.org_id)
      .eq("active", true);

    if (webhooks && webhooks.length > 0) {
      for (const webhook of webhooks) {
        try {
          await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": await generateSignature(event, webhook.secret),
            },
            body: JSON.stringify(event),
          });
        } catch (error: unknown) {
          console.error(`Failed to deliver webhook to ${webhook.url}:`, error);
        }
      }
    }
  } catch (error: unknown) {
    console.error("Failed to emit event:", error);
  }
}

async function generateSignature(event: Event, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(event));
  const keyData = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
