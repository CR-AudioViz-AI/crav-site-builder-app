import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guard } from "../_shared/authz.ts";
import { debitCredits, markServerError } from "../core-mini/credits.ts";
import { createLogger } from "../core-mini/log.ts";
import { generate } from "../core-mini/ai-router.ts";
import { audit } from "../_shared/audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Idempotency-Key",
};

const CREDIT_COST = 1;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "website.ai.apply" });

  try {
    const g = await guard(req, "website", ['editor', 'admin', 'owner']);
    if ("error" in g) {
      return new Response(
        JSON.stringify({ ok: false, error: g.error }),
        { status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { supabase, orgId, user } = g as any;
    const body = await req.json();
    const { siteId, message, operations } = body;

    if (!siteId || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_required_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const idempotencyKey = req.headers.get("X-Idempotency-Key") || requestId;

    const debit = await debitCredits(
      supabase,
      orgId,
      "website.ai.apply",
      CREDIT_COST,
      idempotencyKey,
      { email: user?.email, site_id: siteId, message }
    );

    if (!debit.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: debit.error,
          offers: debit.offers || [],
          request_id: requestId,
        }),
        { status: debit.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: site } = await supabase
      .from("sites")
      .select("*")
      .eq("id", siteId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!site) {
      return new Response(
        JSON.stringify({ ok: false, error: "site_not_found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: pages } = await supabase
      .from("pages")
      .select("*")
      .eq("site_id", siteId)
      .eq("org_id", orgId);

    log.info("Processing AI edit request", { message, has_operations: !!operations });

    const systemPrompt = `You are a website editing assistant. The user wants to modify their website.
Current site theme: ${JSON.stringify(site.theme || {})}
Current pages: ${(pages || []).map((p: any) => p.slug).join(", ")}

Based on the user's request, generate a JSON response with the changes to apply.
Format: { "operations": [{ "type": "update_theme" | "add_section" | "update_section" | "remove_section" | "update_copy" | "add_page" | "remove_page", "target": "page_slug or theme", "data": {...} }] }`;

    const aiResponse = await generate(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      { requestId }
    );

    const aiOperations = operations || JSON.parse(aiResponse.content).operations;

    for (const op of aiOperations) {
      if (op.type === "update_theme") {
        await supabase
          .from("sites")
          .update({ theme: { ...site.theme, ...op.data } })
          .eq("id", siteId);
      } else if (op.type === "add_section" && op.target) {
        const targetPage = pages?.find((p: any) => p.slug === op.target);
        if (targetPage) {
          const sections = [...(targetPage.sections || []), op.data];
          await supabase
            .from("pages")
            .update({ sections })
            .eq("id", targetPage.id);
        }
      } else if (op.type === "update_section" && op.target) {
        const [pageSlug, sectionIndex] = op.target.split(":");
        const targetPage = pages?.find((p: any) => p.slug === pageSlug);
        if (targetPage && sectionIndex !== undefined) {
          const sections = [...(targetPage.sections || [])];
          sections[parseInt(sectionIndex)] = { ...sections[parseInt(sectionIndex)], ...op.data };
          await supabase
            .from("pages")
            .update({ sections })
            .eq("id", targetPage.id);
        }
      } else if (op.type === "update_copy") {
        const [pageSlug, sectionIndex, field] = op.target.split(":");
        const targetPage = pages?.find((p: any) => p.slug === pageSlug);
        if (targetPage && sectionIndex !== undefined) {
          const sections = [...(targetPage.sections || [])];
          sections[parseInt(sectionIndex)].props[field] = op.data;
          await supabase
            .from("pages")
            .update({ sections })
            .eq("id", targetPage.id);
        }
      }
    }

    const { data: currentVersion } = await supabase
      .from("site_versions")
      .select("version")
      .eq("site_id", siteId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (currentVersion?.version || 0) + 1;

    await supabase.from("site_versions").insert({
      site_id: siteId,
      org_id: orgId,
      version: nextVersion,
      snapshot: { site, pages },
      created_by: user?.id,
      change_description: message,
    });

    await audit(supabase, orgId, "website.ai.applied", { site_id: siteId, message, operations: aiOperations }, user?.email, siteId);

    log.info("AI edit applied successfully", { operations_count: aiOperations.length });

    return new Response(
      JSON.stringify({
        ok: true,
        data: { operations: aiOperations, version: nextVersion },
        request_id: requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log.error("AI apply failed", { error: error.message });

    try {
      const body = await req.json().catch(() => ({}));
      const g = await guard(req, "website", ['editor', 'admin', 'owner']);
      if (!("error" in g)) {
        const { supabase, orgId } = g as any;
        const idempotencyKey = req.headers.get("X-Idempotency-Key") || requestId;
        await markServerError(supabase, orgId, "website.ai.apply", idempotencyKey, error.message);
      }
    } catch (e) {
      console.error("Failed to mark server error:", e);
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "server_error",
        request_id: requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
