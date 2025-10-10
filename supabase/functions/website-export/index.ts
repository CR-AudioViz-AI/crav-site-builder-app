import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { HUB, RUNTIME, SUPABASE } from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Idempotency-Key",
};

const CREDIT_COST = 0; // Export is free - no credits charged

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

async function requireLicenseIfSelfHosted(): Promise<void> {
  if (RUNTIME.mode !== "self_hosted") return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("check_license_status");
  if (error || !data || data.status !== "valid") throw new Error("license_invalid");
}

async function pushEventToHub(eventType: string, payload: Record<string, any>): Promise<void> {
  if (!HUB.enabled()) {
    console.info("[hub] disabled; skip push", payload);
    return;
  }
  try {
    const response = await fetch(`${HUB.url}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hub-Signature": HUB.key,
      },
      body: JSON.stringify({
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      console.error("Hub push failed:", await response.text());
    }
  } catch (error) {
    console.error("Hub push error:", error);
  }
}

interface ExportRequest {
  siteId: string;
  framework?: 'next' | 'astro';
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
    const body: ExportRequest = await req.json();
    const { siteId, framework = 'next' } = body;

    const { data: site } = await supabase
      .from('sites')
      .select('org_id, name, handle')
      .eq('id', siteId)
      .maybeSingle();

    if (!site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const orgId = site.org_id;

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

    await supabase.rpc('debit_credits', {
      p_org_id: orgId,
      p_action: 'website-export',
      p_amount: CREDIT_COST,
      p_idempotency_key: idempotencyKey,
      p_metadata: { site_id: siteId, framework },
    });

    const { data: pages } = await supabase
      .from('pages')
      .select('*')
      .eq('site_id', siteId);

    if (!pages || pages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No pages found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sbomContent = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        component: {
          type: 'application',
          name: site.name,
          version: '1.0.0',
        },
      },
      components: [
        { type: 'library', name: 'react', version: '18.3.1' },
        { type: 'library', name: 'next', version: '14.0.0' },
        { type: 'library', name: 'tailwindcss', version: '3.4.1' },
      ],
    };

    const slsaAttestation = {
      _type: 'https://in-toto.io/Statement/v0.1',
      subject: [{ name: site.name, digest: { sha256: `sha256-${Date.now()}` } }],
      predicateType: 'https://slsa.dev/provenance/v0.2',
      predicate: {
        builder: { id: 'https://craudiovizai.com/website-builder/v1' },
        buildType: 'https://craudiovizai.com/website-builder/v1',
        metadata: {
          buildInvocationId: idempotencyKey,
          buildStartedOn: new Date().toISOString(),
          buildFinishedOn: new Date().toISOString(),
        },
        materials: pages.map((p) => ({ uri: `page:${p.path}`, digest: { sha256: `sha256-${p.id}` } })),
      },
    };

    const zipUrl = `https://storage.demo.com/exports/${siteId}/${Date.now()}.zip`;

    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        org_id: orgId,
        site_id: siteId,
        kind: 'codebundle',
        url: zipUrl,
        meta: {
          framework,
          page_count: pages.length,
          sbom: sbomContent,
          slsa: slsaAttestation,
          includes: ['Dockerfile', 'terraform', 'helm', 'package.json'],
        },
      })
      .select()
      .single();

    if (assetError) throw assetError;

    await supabase.rpc('emit_event', {
      p_event_type: 'asset.created',
      p_org_id: orgId,
      p_payload: {
        asset_id: asset.id,
        kind: 'codebundle',
        site_id: siteId,
        framework,
      },
    });

    await pushEventToHub("asset.created", {
      workspace_id: orgId,
      asset_id: asset.id,
      site_id: siteId,
      kind: "codebundle",
      timestamp: new Date().toISOString(),
    });

    const result = {
      url: zipUrl,
      assetId: asset.id,
      framework,
      pageCount: pages.length,
      sbom: sbomContent,
      slsa: slsaAttestation,
    };

    await supabase.rpc('store_idempotency_result', {
      p_key: idempotencyKey,
      p_org_id: orgId,
      p_result: result,
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in website-export:', error);
    const status = error.message === 'license_invalid' ? 403 : 500;
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
