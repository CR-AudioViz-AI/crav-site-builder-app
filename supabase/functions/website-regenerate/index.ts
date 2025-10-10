import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RUNTIME, SUPABASE } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Idempotency-Key",
};

const CREDIT_COST = 1;

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

async function requireLicenseIfSelfHosted(): Promise<void> {
  if (RUNTIME.mode !== "self_hosted") return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("check_license_status");
  if (error || !data || data.status !== "valid") throw new Error("license_invalid");
}

interface RegenerateRequest {
  siteId: string;
  pageId: string;
  blockIndex: number;
  block: any;
  brief?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const idempotencyKey = req.headers.get('X-Idempotency-Key');
    if (!idempotencyKey) {
      return new Response(
        JSON.stringify({ error: 'X-Idempotency-Key header required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    const body: RegenerateRequest = await req.json();
    const { siteId, pageId, blockIndex, block, brief } = body;

    const { data: site } = await supabase
      .from('sites')
      .select('org_id')
      .eq('id', siteId)
      .maybeSingle();

    if (!site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = site.org_id;

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

    const { data: hasEntitlement } = await supabase.rpc('has_tool_entitlement', {
      p_org_id: orgId,
      p_tool: 'website',
    });

    if (!hasEntitlement) {
      return new Response(
        JSON.stringify({ error: 'entitlement_required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await requireLicenseIfSelfHosted();

    const cachedResult = await supabase.rpc('get_idempotency_result', {
      p_key: idempotencyKey,
      p_org_id: orgId,
    });

    if (cachedResult.data) {
      return new Response(
        JSON.stringify(cachedResult.data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check balance before attempting debit
    const { data: balanceData } = await supabase.rpc('get_credit_balance', {
      p_org_id: orgId,
    });
    const currentBalance = balanceData || 0;

    if (currentBalance < CREDIT_COST) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'credits_insufficient',
          balance: currentBalance,
          required: CREDIT_COST,
          request_id: crypto.randomUUID(),
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: debitError } = await supabase.rpc('debit_credits', {
      p_org_id: orgId,
      p_action: 'website-regenerate',
      p_amount: CREDIT_COST,
      p_idempotency_key: idempotencyKey,
      p_metadata: { site_id: siteId, page_id: pageId, block_index: blockIndex },
    });

    if (debitError) {
      if (debitError.message?.includes('insufficient')) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'credits_insufficient',
            balance: currentBalance,
            required: CREDIT_COST,
            request_id: crypto.randomUUID(),
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw debitError;
    }

    const rewrittenBlock = {
      ...block,
      headline: block.headline ? `${block.headline} (Enhanced)` : block.headline,
      subhead: block.subhead ? `${block.subhead} - Optimized for engagement` : block.subhead,
    };

    await supabase.rpc('emit_event', {
      p_event_type: 'website.block.regenerated',
      p_org_id: orgId,
      p_payload: {
        site_id: siteId,
        page_id: pageId,
        block_index: blockIndex,
      },
    });

    await supabase.rpc('store_idempotency_result', {
      p_key: idempotencyKey,
      p_org_id: orgId,
      p_result: rewrittenBlock,
    });

    return new Response(
      JSON.stringify(rewrittenBlock),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in website-regenerate:', error);
    const status = error.message === 'license_invalid' ? 403 : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
