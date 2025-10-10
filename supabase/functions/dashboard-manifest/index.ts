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

  const { data: tiles } = await supabase
    .from("dashboard_apps")
    .select("*")
    .eq("org_id", orgId);

  const base = tiles || [];

  if (!base.find((t: any) => t.tool_key === 'website')) {
    base.push({
      tool_key: 'website',
      title: 'Website Builder',
      url: '/website',
      icon: 'globe',
      installed: true,
    });
  }

  const available = ['website', 'app_builder', 'newsletter'];
  const installed = new Set(base.filter((t: any) => t.installed).map((t: any) => t.tool_key));
  const missing = available.filter((k) => !installed.has(k));

  const upsell = missing.length
    ? {
        headline: "Unlock more with the full suite",
        missing,
      }
    : null;

  return new Response(
    JSON.stringify({ ok: true, data: { tiles: base, upsell } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
