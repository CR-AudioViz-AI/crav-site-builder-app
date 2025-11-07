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

interface PageUpsertRequest {
  op: "add" | "rename" | "delete" | "duplicate";
  site_id?: string;
  id?: string;
  name?: string;
  slug?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "website-page-upsert" });

  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    const body: PageUpsertRequest = await req.json();
    const { op, site_id, id, name, slug } = body;

    log.info("Page operation", { op, site_id, id, name, slug });

    // ADD operation
    if (op === "add") {
      if (!site_id || !slug || !name) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "missing_required_fields",
            request_id: requestId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("pages")
        .insert({
          org_id: ctx.orgId,
          site_id,
          slug,
          name,
          sections: [],
          seo: { title: name },
        })
        .select("id, slug, name")
        .single();

      if (error) {
        log.error("Add page failed", { error: error.message });
        return new Response(
          JSON.stringify({ ok: false, error: error.message, request_id: requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, data, request_id: requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RENAME operation
    if (op === "rename") {
      if (!id || !name || !slug) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "missing_required_fields",
            request_id: requestId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("pages")
        .update({ name, slug })
        .eq("id", id)
        .eq("org_id", ctx.orgId);

      if (error) {
        log.error("Rename page failed", { error: error.message });
        return new Response(
          JSON.stringify({ ok: false, error: error.message, request_id: requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, request_id: requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE operation
    if (op === "delete") {
      if (!id) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "missing_id",
            request_id: requestId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("pages")
        .delete()
        .eq("id", id)
        .eq("org_id", ctx.orgId);

      if (error) {
        log.error("Delete page failed", { error: error.message });
        return new Response(
          JSON.stringify({ ok: false, error: error.message, request_id: requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, request_id: requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DUPLICATE operation
    if (op === "duplicate") {
      if (!id || !name || !slug) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "missing_required_fields",
            request_id: requestId,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get source page
      const { data: sourcePage } = await supabase
        .from("pages")
        .select("*")
        .eq("id", id)
        .eq("org_id", ctx.orgId)
        .single();

      if (!sourcePage) {
        return new Response(
          JSON.stringify({ ok: false, error: "page_not_found", request_id: requestId }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Duplicate it
      const { data, error } = await supabase
        .from("pages")
        .insert({
          org_id: ctx.orgId,
          site_id: sourcePage.site_id,
          slug,
          name,
          sections: sourcePage.sections,
          seo: sourcePage.seo,
        })
        .select("id, slug, name")
        .single();

      if (error) {
        log.error("Duplicate page failed", { error: error.message });
        return new Response(
          JSON.stringify({ ok: false, error: error.message, request_id: requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, data, request_id: requestId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalid operation
    return new Response(
      JSON.stringify({ ok: false, error: "invalid_operation", request_id: requestId }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const log = createLogger({ request_id: requestId, action: "website-page-upsert" });
    log.error("Page upsert failed", { error: error.message });
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
