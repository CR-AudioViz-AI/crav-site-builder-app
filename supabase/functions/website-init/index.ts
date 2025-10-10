import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthContext } from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";
import { SUPABASE } from "../core-mini/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  const log = createLogger({ request_id: requestId, action: "website-init" });

  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    log.info("Initializing website for org", { org_id: ctx.orgId });

    // Upsert blank org_settings if missing (non-blocking defaults)
    const { error: settingsError } = await supabase
      .from("org_settings")
      .upsert(
        { org_id: ctx.orgId, business: {} },
        { onConflict: "org_id", ignoreDuplicates: true }
      );

    if (settingsError) {
      log.warn("Failed to upsert org_settings", { error: settingsError.message });
    }

    // Ensure default site exists
    const { data: siteId, error: siteError } = await supabase.rpc("ensure_default_site", {
      pid: ctx.orgId,
    });

    if (siteError) {
      log.warn("Failed to ensure default site", { error: siteError.message });
    }

    log.info("Website initialized", { org_id: ctx.orgId, site_id: siteId });

    return new Response(
      JSON.stringify({
        ok: true,
        data: { site_id: siteId || null },
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log.error("Initialization failed", { error: error.message });
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
