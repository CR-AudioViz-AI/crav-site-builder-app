import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSupabaseClient } from "../_shared/platform.ts";
import { corsHeaders } from "../_shared/csp.ts";

/**
 * Brand Kit Sync - Shared brand asset storage
 *
 * Syncs logo, palette, and fonts from Website Builder to shared asset store
 * for consumption by other apps (Newsletter, Social, etc.)
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
      siteId,
      logoUrl,
      logoDarkUrl,
      faviconUrl,
      palette,
      fonts,
      source = "website",
    } = await req.json();

    // Validate required fields
    if (!orgId) {
      return new Response(
        JSON.stringify({ error: "Missing orgId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sync brand kit using RPC
    const { data: brandId, error: syncError } = await supabase.rpc(
      "sync_brand_kit",
      {
        p_org_id: orgId,
        p_site_id: siteId || null,
        p_logo_url: logoUrl || null,
        p_palette: palette || null,
        p_fonts: fonts || null,
      }
    );

    if (syncError) {
      console.error("Brand kit sync error:", syncError);
      return new Response(
        JSON.stringify({ error: syncError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Emit suite event
    const eventPayload = {
      orgId,
      siteId,
      brandId,
      logo: logoUrl,
      palette,
      fonts,
      source,
    };

    const HUB_URL = Deno.env.get("HUB_URL");
    if (HUB_URL) {
      try {
        await fetch(`${HUB_URL}/suite-events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "brand.updated",
            orgId,
            timestamp: new Date().toISOString(),
            payload: eventPayload,
          }),
        });
      } catch (error) {
        console.error("Failed to emit brand.updated event:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          brandId,
          synced: {
            logo: !!logoUrl,
            palette: !!palette,
            fonts: !!fonts,
          },
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Brand kit sync error:", error);
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
