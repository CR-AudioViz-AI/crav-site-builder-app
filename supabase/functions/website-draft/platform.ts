import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function getSupabaseClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getOrgIdFromSite(siteId: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sites")
    .select("org_id")
    .eq("id", siteId)
    .single();

  if (error || !data) {
    throw new Error("Site not found");
  }

  return data.org_id;
}

export async function requireEntitlement(orgId: string, tool: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("has_tool_entitlement", {
    p_org_id: orgId,
    p_tool: tool,
  });

  if (error || !data) {
    throw new Error("entitlement_required");
  }
}

export async function requireLicenseIfSelfHosted(): Promise<void> {
  const runtimeMode = Deno.env.get("VITE_RUNTIME_MODE") || "cloud";
  if (runtimeMode !== "self_hosted") return;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("check_license_status");

  if (error || !data || data.status !== "valid") {
    throw new Error("license_invalid");
  }
}

export async function debitCredits(
  orgId: string,
  amount: number,
  metadata: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseClient();
  const idempotencyKey = metadata.idempotency_key || crypto.randomUUID();

  const { error } = await supabase.rpc("debit_credits", {
    p_org_id: orgId,
    p_action: metadata.reason || "unknown",
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(`insufficient_credits: ${error.message}`);
  }
}

export async function emitEvent(
  orgId: string,
  eventType: string,
  payload: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.rpc("emit_event", {
    p_event_type: eventType,
    p_org_id: orgId,
    p_payload: payload,
  });
}

export async function pushEvent(
  eventType: string,
  payload: Record<string, any>
): Promise<void> {
  const hubUrl = Deno.env.get("HUB_URL");
  const hubKey = Deno.env.get("HUB_SIGNING_KEY");

  if (!hubUrl || !hubKey) {
    console.log("Hub disabled - skipping push");
    return;
  }

  try {
    const response = await fetch(`${hubUrl}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature": hubKey,
      },
      body: JSON.stringify({
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("Hub push failed:", await response.text());
    }
  } catch (error: unknown) {
    console.error("Hub push error:", error);
  }
}
