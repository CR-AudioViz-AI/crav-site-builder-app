import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guard } from "../_shared/authz.ts";
import { audit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const g = await guard(req, "website", ['admin', 'owner']);

  if ("error" in g) {
    return new Response(
      JSON.stringify({ ok: false, error: g.error }),
      { status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { supabase, orgId, user } = g as any;

  try {
    const body = await req.json();
    const next = { org_id: orgId, ...body };

    await supabase
      .from("org_branding")
      .upsert(next, { onConflict: "org_id" });

    await audit(supabase, orgId, "branding.updated", body, user?.email);

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_input" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
