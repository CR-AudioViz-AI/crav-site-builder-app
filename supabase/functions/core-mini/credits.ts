import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE } from "./env.ts";

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

interface DebitResult {
  ok: true;
  bypass?: boolean;
  waived?: boolean;
  balance?: number;
}

interface DebitError {
  ok: false;
  status: number;
  error: string;
  offers?: Array<{
    id: string;
    label: string;
    amount: number;
    price_cents: number;
  }>;
}

export async function debitCredits(
  supabase: any,
  orgId: string,
  action: string,
  cost: number,
  idemKey: string,
  ctx: any
): Promise<DebitResult | DebitError> {
  const normAction = action.replace(/-/g, ".");

  const mode = Deno.env.get("INTERNAL_BYPASS_MODE") || "none";
  const allowCsv = (Deno.env.get("INTERNAL_UNLIMITED_ORG_IDS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isInternal =
    mode === "credits" &&
    (allowCsv.includes(orgId) ||
      (ctx?.email || "").endsWith("@craudiovizai.com"));

  if (isInternal) {
    await supabase.from("ledger").insert({
      org_id: orgId,
      action: normAction,
      cost: 0,
      internal_bypass: true,
      idem_key: idemKey,
      meta: { ctx },
    });
    await supabase.rpc("refresh_org_balance", { oid: orgId }).catch(() => {});
    return { ok: true, bypass: true };
  }

  const { data: last } = await supabase
    .from("ledger")
    .select("*")
    .eq("org_id", orgId)
    .eq("idem_key", idemKey)
    .order("created_at", { ascending: false })
    .limit(1);

  if (
    last?.[0]?.status === "server_error" &&
    Date.now() - Date.parse(last[0].created_at) < 10 * 60 * 1000
  ) {
    await supabase.from("ledger").insert({
      org_id: orgId,
      action: normAction,
      cost: 0,
      waived: true,
      idem_key: idemKey,
      meta: { reason: "retry_after_server_error", ctx },
    });
    await supabase.rpc("refresh_org_balance", { oid: orgId }).catch(() => {});
    return { ok: true, waived: true };
  }

  await supabase
    .from("org_wallets")
    .upsert({ org_id: orgId }, { onConflict: "org_id" });
  const { data: w } = await supabase
    .from("org_wallets")
    .select("*")
    .eq("org_id", orgId)
    .maybeSingle();

  const avail = w?.credits_available ?? 0;
  if (avail < cost) {
    const offers = [
      { id: "pack_50", label: "+50 credits", amount: 50, price_cents: 499 },
      { id: "pack_200", label: "+200 credits", amount: 200, price_cents: 1499 },
      { id: "grace_25", label: "Use Grace +25", amount: 25, price_cents: 0 },
    ];
    return { ok: false, status: 402, error: "credits_insufficient", offers };
  }

  await supabase
    .from("org_wallets")
    .update({ credits_available: avail - cost })
    .eq("org_id", orgId);
  await supabase.from("ledger").insert({
    org_id: orgId,
    action: normAction,
    cost,
    idem_key: idemKey,
    meta: { ctx },
  });
  await supabase.rpc("refresh_org_balance", { oid: orgId }).catch(() => {});
  return { ok: true, balance: avail - cost };
}

export async function markServerError(
  supabase: any,
  orgId: string,
  action: string,
  idemKey: string,
  err: string
): Promise<void> {
  const normAction = action.replace(/-/g, ".");
  await supabase.from("ledger").insert({
    org_id: orgId,
    action: normAction,
    cost: 0,
    idem_key: idemKey,
    status: "server_error",
    meta: { err },
  });
  await supabase.rpc("refresh_org_balance", { oid: orgId }).catch(() => {});
}
