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
  const log = createLogger({ request_id: requestId, action: "website-templates-list" });

  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    // List all templates (RLS allows public read)
    const { data: templates, error } = await supabase
      .from("templates")
      .select("id, name, description, category, tier, preview_url, requires_entitlement")
      .eq("is_public", true)
      .order("category", { ascending: true });

    if (error) {
      log.error("Failed to list templates", { error: error.message });
      return new Response(
        JSON.stringify({
          ok: false,
          error: error.message,
          request_id: requestId,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    log.info("Templates listed", { count: templates?.length || 0 });

    return new Response(
      JSON.stringify({
        ok: true,
        data: { templates: templates || [] },
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    log.error("Template list failed", { error: error.message });
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
