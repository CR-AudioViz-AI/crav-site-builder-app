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
  const log = createLogger({ request_id: requestId, action: "website-apply-template" });

  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    const { template_id, site_id } = await req.json().catch(() => ({}));

    if (!template_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "template_id_required",
          request_id: requestId,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get template spec
    const { data: template, error: templateError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      log.error("Template not found", { template_id, error: templateError?.message });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "template_not_found",
          request_id: requestId,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine target site
    let targetSiteId = site_id;
    if (!targetSiteId) {
      const { data: defaultSiteId } = await supabase.rpc("ensure_default_site", {
        pid: ctx.orgId,
      });
      targetSiteId = defaultSiteId;
    }

    log.info("Applying template", {
      template_id,
      template_name: template.name,
      site_id: targetSiteId,
    });

    // Update site theme and template_id
    const theme = template.spec?.theme || {};
    await supabase
      .from("sites")
      .update({ template_id, theme })
      .eq("id", targetSiteId)
      .eq("org_id", ctx.orgId);

    // Get pages from template spec
    const pages = template.spec?.pages || [];

    // Delete existing pages
    await supabase
      .from("pages")
      .delete()
      .eq("site_id", targetSiteId)
      .eq("org_id", ctx.orgId);

    // Insert new pages from template
    if (pages.length > 0) {
      const pagesToInsert = pages.map((p: any) => ({
        org_id: ctx.orgId,
        site_id: targetSiteId,
        slug: p.slug,
        name: p.name,
        sections: p.sections || [],
        seo: p.seo || {},
      }));

      const { error: insertError } = await supabase.from("pages").insert(pagesToInsert);

      if (insertError) {
        log.error("Failed to insert pages", { error: insertError.message });
        return new Response(
          JSON.stringify({
            ok: false,
            error: insertError.message,
            request_id: requestId,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    log.info("Template applied successfully", {
      site_id: targetSiteId,
      pages_created: pages.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: { site_id: targetSiteId },
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    log.error("Apply template failed", { error: error.message });
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
