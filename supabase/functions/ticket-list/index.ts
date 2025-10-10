import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guard } from "../_shared/authz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const g = await guard(req, "website", ['viewer', 'editor', 'admin', 'owner']);

  if ("error" in g) {
    return new Response(
      JSON.stringify({ ok: false, error: g.error }),
      { status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { supabase, orgId } = g as any;

  const { data } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return new Response(
    JSON.stringify({ ok: true, data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
