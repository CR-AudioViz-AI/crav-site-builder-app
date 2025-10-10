import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSupabaseClient } from "../_shared/platform.ts";
import { corsHeaders } from "../_shared/csp.ts";

/**
 * Deliverables Register - Catalog of published sites, exports, assets
 *
 * Records deliverables for cross-app discovery and reuse
 */

Deno.serve(async (req: Request) => {
  // Handle OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseClient();

    const {
      orgId,
      app,
      kind,
      label,
      url,
      refId,
      metadata,
      tags,
    } = await req.json();

    // Validate required fields
    if (!orgId || !app || !kind || !label) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: orgId, app, kind, label",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Register deliverable using RPC
    const { data: deliverableId, error: registerError } = await supabase.rpc(
      "register_deliverable",
      {
        p_org_id: orgId,
        p_app: app,
        p_kind: kind,
        p_label: label,
        p_url: url || null,
        p_ref_id: refId || null,
        p_metadata: metadata || null,
        p_tags: tags || null,
      }
    );

    if (registerError) {
      console.error("Deliverable registration error:", registerError);
      return new Response(
        JSON.stringify({ error: registerError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          deliverableId,
          registered: {
            app,
            kind,
            label,
            url,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Deliverable registration error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
