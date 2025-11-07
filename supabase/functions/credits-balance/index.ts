import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthContext } from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";
import { SUPABASE } from "../core-mini/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "credits-balance" });

  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    // Get actual balance from org_wallets
    const { data: wallet } = await supabase
      .from("org_wallets")
      .select("*")
      .eq("org_id", ctx.orgId)
      .maybeSingle();

    const credits_remaining = wallet?.credits_available ?? 0;
    const plan = wallet?.plan || "starter";

    // Get spent credits from materialized view
    const { data: balanceData } = await supabase
      .from("ledger_balance")
      .select("*")
      .eq("org_id", ctx.orgId)
      .maybeSingle();

    const credits_spent = balanceData?.credits_spent ?? 0;
    const total_operations = balanceData?.total_operations ?? 0;
    const waived_count = balanceData?.waived_count ?? 0;
    const internal_count = balanceData?.internal_count ?? 0;

    log.info("Balance retrieved", {
      org_id: ctx.orgId,
      spent: credits_spent,
      remaining: credits_remaining,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          credits_remaining,
          credits_spent,
          plan,
          total_operations,
          waived_count,
          internal_count,
          last_operation: balanceData?.last_operation,
        },
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const log = createLogger({ request_id: requestId, action: "credits-balance" });
    log.error("Balance query failed", { error: error.message });
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "server_error",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
