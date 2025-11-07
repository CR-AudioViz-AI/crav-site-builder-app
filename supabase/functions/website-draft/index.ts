import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getAuthContext,
  requireEntitlement,
  requireLicenseIfSelfHosted,
  emitEvent,
  getIdempotencyResult,
  storeIdempotencyResult,
} from "../core-mini/auth.ts";
import { debitCredits, markServerError } from "../core-mini/credits.ts";
import { createLogger } from "../core-mini/log.ts";
import { generate } from "../core-mini/ai-router.ts";
import { SUPABASE } from "../core-mini/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Idempotency-Key",
};

const CREDIT_COST = 2;

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

interface DraftRequest {
  siteId?: string;
  brief?: {
    businessName?: string;
    industry?: string;
    offerings?: string[];
    targetAudience?: string;
    tone?: string;
    goals?: string[];
    pages?: string[];
    cta?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const idempotencyKey = req.headers.get("X-Idempotency-Key");
    if (!idempotencyKey) {
      return new Response(
        JSON.stringify({ ok: false, error: "X-Idempotency-Key header required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DraftRequest = await req.json();
    let { siteId, brief } = body;

    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    // Auto-initialize: ensure org has settings and a default site
    try {
      const initRes = await fetch(`${new URL(req.url).origin}/functions/v1/website-init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": req.headers.get("Authorization") || "",
        },
      });
      if (initRes.ok) {
        const initData = await initRes.json();
        if (!siteId && initData.data?.site_id) {
          siteId = initData.data.site_id;
        }
      }
    } catch (e) {
      // Non-blocking, continue with defaults
    }

    // Use safe defaults for missing brief fields
    const safeBrief = {
      businessName: brief?.businessName || "Your Business",
      industry: brief?.industry || "general",
      offerings: brief?.offerings?.length ? brief.offerings : ["Great products and services"],
      targetAudience: brief?.targetAudience || "Everyone",
      tone: brief?.tone || "friendly",
      goals: brief?.goals?.length ? brief.goals : ["Generate leads"],
      pages: brief?.pages?.length ? brief.pages : ["Home"],
      cta: brief?.cta || "Get Started",
    };
    const log = createLogger({
      request_id: ctx.requestId,
      org_id: ctx.orgId,
      action: "website-draft",
    });

    // Check idempotency cache
    const cached = await getIdempotencyResult(idempotencyKey, ctx.orgId);
    if (cached) {
      log.info("Returning cached result");
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check entitlement
    await requireEntitlement(ctx.orgId, "website");

    // Check license
    await requireLicenseIfSelfHosted();

    // Debit credits
    const debitResult = await debitCredits(
      supabase,
      ctx.orgId,
      "website.draft",
      CREDIT_COST,
      idempotencyKey,
      { email: ctx.user?.email, site_id: siteId }
    );

    // Handle insufficient credits
    if (!debitResult.ok) {
      log.warn("Insufficient credits", { error: debitResult.error });
      return new Response(
        JSON.stringify({
          ok: false,
          error: debitResult.error,
          offers: debitResult.offers || [],
          request_id: ctx.requestId,
        }),
        { status: debitResult.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (debitResult.bypass) {
      log.info("Internal bypass: credits not debited");
    }
    if (debitResult.waived) {
      log.info("Goodwill waived: retry after server error");
    }

    log.info("Generating site draft via AI");

    // Generate site structure via AI
    const aiResponse = await generate(
      [
        {
          role: "system",
          content:
            "You are a professional web designer. Generate a website structure with SEO metadata and content sections in JSON format.",
        },
        {
          role: "user",
          content: `Create a website draft for:
Business: ${safeBrief.businessName}
Industry: ${safeBrief.industry}
Offerings: ${safeBrief.offerings.join(", ")}
Target Audience: ${safeBrief.targetAudience}
Tone: ${safeBrief.tone}
Goals: ${safeBrief.goals.join(", ")}
Pages: ${safeBrief.pages.join(", ")}
CTA: ${safeBrief.cta}

Return JSON with: {pages: [{slug, name, seo: {title, description}, sections: [{kind, headline, subhead, cta, items}]}]}
Section kinds: hero, features, services, testimonials, faq, contact, cta, footer`,
        },
      ],
      { requestId: ctx.requestId }
    );

    const draftData = JSON.parse(aiResponse.content);

    // Delete existing pages for this site
    await supabase
      .from("pages")
      .delete()
      .eq("site_id", siteId)
      .eq("org_id", ctx.orgId);

    // Store pages with new schema
    const pageInserts = draftData.pages.map((page: any) => ({
      org_id: ctx.orgId,
      site_id: siteId,
      slug: page.slug || page.path?.replace(/^\//, '') || 'home',
      name: page.name || page.title,
      seo: page.seo || { title: page.title || page.name },
      sections: page.sections || page.blocks || [],
    }));

    await supabase.from("pages").insert(pageInserts);

    const result = {
      ok: true,
      data: {
        seo: draftData.seo,
        pages: draftData.pages,
        page_count: draftData.pages.length,
      },
      request_id: ctx.requestId,
    };

    // Emit event
    await emitEvent("website.site.draft.created", ctx.orgId, {
      site_id: siteId,
      page_count: draftData.pages.length,
      request_id: ctx.requestId,
    });

    // Store in cache
    await storeIdempotencyResult(idempotencyKey, ctx.orgId, result);

    log.info("Site draft generated", { page_count: draftData.pages.length });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const status =
      error.message === "entitlement_required" || error.message === "license_invalid"
        ? 403
        : 500;

    const requestId = crypto.randomUUID();

    if (status >= 500) {
      try {
        const idempotencyKey = req.headers.get("X-Idempotency-Key") || requestId;
        const ctx = await getAuthContext(req);
        const supabase = getSupabaseClient();
        await markServerError(supabase, ctx.orgId, "website.draft", idempotencyKey, String(error?.message || error));
      } catch (e) {
        console.error("Failed to mark server error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        request_id: requestId,
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
