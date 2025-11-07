// Plugin dispatch endpoint - receive cross-app handoffs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { PluginDispatchRequest, PluginDispatchResponse } from "../core-mini/plugin.ts";
import { createLogger } from "../core-mini/log.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE } from "../core-mini/env.ts";

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get("X-Request-ID") || crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "plugin.dispatch" });

  try {
    const body: PluginDispatchRequest = await req.json();
    const { source_tool, event_type, payload, org_id } = body;

    log.info("Received plugin dispatch", {
      source_tool,
      event_type,
      org_id,
    });

    let handled = false;
    let data: any = null;
    const supabase = getSupabaseClient();

    if (event_type === "request.brand.tokens") {
      log.info("Handling request.brand.tokens");
      handled = true;

      const { data: branding } = await supabase
        .from("org_branding")
        .select("*")
        .eq("org_id", org_id)
        .maybeSingle();

      const { data: site } = await supabase
        .from("sites")
        .select("*")
        .eq("org_id", org_id)
        .maybeSingle();

      data = {
        theme: site?.theme || {},
        brand: {
          name: branding?.name || "",
          logo: branding?.logo_url || "",
          palette: branding?.palette || {},
        },
      };
    } else if (event_type === "request.pages.list") {
      log.info("Handling request.pages.list");
      handled = true;

      const { data: pages } = await supabase
        .from("pages")
        .select("slug, name")
        .eq("org_id", org_id);

      data = { pages: pages || [] };
    } else if (event_type === "handoff.newsletter.cta") {
      log.info("Handling handoff.newsletter.cta");
      handled = true;
      data = { message: "CTA block can be added to home page" };
    } else if (event_type === "handoff.appbuilder.embed") {
      log.info("Handling handoff.appbuilder.embed");
      handled = true;
      data = { message: "App widget embed section can be inserted" };
    } else if (event_type === "newsletter.campaign.sent") {
      log.info("Handling newsletter.campaign.sent event");
      handled = true;
      data = {
        message: "Newsletter event received, latest campaigns can be displayed on site",
        campaign_id: payload.campaign_id,
      };
    } else if (event_type === "logo.created") {
      log.info("Handling logo.created event");
      handled = true;
      data = {
        message: "Logo event received, can be used in brand tokens",
        logo_url: payload.logo_url,
      };
    } else {
      log.warn("Unhandled event type", { event_type });
    }

    const response: PluginDispatchResponse = {
      ok: true,
      handled,
      data,
      request_id: requestId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    log.error("Plugin dispatch failed", { error: error.message });

    const response: PluginDispatchResponse = {
      ok: false,
      handled: false,
      error: error.message,
      request_id: requestId,
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
