import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthContext, emitEvent, debitCredits } from "../core-mini/auth.ts";
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

interface PublishRequest {
  siteId: string;
  provider?: "vercel" | "netlify" | "cloudflare" | "s3";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: PublishRequest = await req.json();
    const { siteId, provider = "vercel" } = body;

    const ctx = await getAuthContext(req, siteId);
    const log = createLogger({
      request_id: ctx.requestId,
      org_id: ctx.orgId,
      action: "website-publish",
    });

    const supabase = getSupabaseClient();

    // Publish is now free - no credits charged
    log.info("Publishing site (free operation)");

    // Best-effort init call to ensure site exists (non-blocking)
    try {
      const origin = new URL(req.url).origin;
      await fetch(`${origin}/functions/v1/website-init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || "",
        },
      });
    } catch (e) {
      // Non-blocking, continue
    }

    // Get site and pages
    const { data: site } = await supabase
      .from("sites")
      .select("*, pages(*)")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) {
      return new Response(
        JSON.stringify({ ok: false, error: "Site not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info("Publishing site", { provider, page_count: site.pages.length });

    // Simulate deploy (in production, call Vercel/Netlify API)
    const deployUrl = `https://${site.handle}.example.com`;
    const deployId = crypto.randomUUID();

    // Store deploy record
    await supabase.from("deploys").insert({
      site_id: siteId,
      deploy_id: deployId,
      provider,
      url: deployUrl,
      status: "success",
    });

    // Update site status
    await supabase
      .from("sites")
      .update({ status: "published", published_url: deployUrl })
      .eq("id", siteId);

    // Get brand tokens
    const { data: brandTokens } = await supabase
      .from("sites")
      .select("brand_tokens")
      .eq("id", siteId)
      .maybeSingle();

    const result = {
      ok: true,
      data: {
        deploy_id: deployId,
        url: deployUrl,
        provider,
        published_at: new Date().toISOString(),
      },
      request_id: ctx.requestId,
    };

    // Emit event with brand tokens
    await emitEvent("website.site.published", ctx.orgId, {
      site_id: siteId,
      deploy_id: deployId,
      url: deployUrl,
      provider,
      brand_tokens: brandTokens?.brand_tokens || {},
      request_id: ctx.requestId,
    });

    log.info("Site published", { url: deployUrl });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        request_id: crypto.randomUUID(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
