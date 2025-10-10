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

  const g = await guard(req, "website", ['editor', 'admin', 'owner']);
  if ("error" in g) {
    return new Response(
      JSON.stringify({ ok: false, error: g.error }),
      { status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { supabase, orgId, user } = g as any;

  try {
    const body = await req.json();
    const { siteId, name, description, price, currency = 'USD', fileUrl, images = [], status = 'active' } = body;

    if (!name || price === undefined) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_required_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        org_id: orgId,
        site_id: siteId,
        name,
        description,
        price,
        currency,
        file_url: fileUrl,
        images,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    await audit(supabase, orgId, "product.created", { product_id: product.id, name }, user?.email, product.id);

    return new Response(
      JSON.stringify({ ok: true, data: product }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message || "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
