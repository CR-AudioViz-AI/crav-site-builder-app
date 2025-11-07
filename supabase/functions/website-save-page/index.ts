import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SavePageRequest {
  siteId: string;
  path: string;
  lang?: string;
  title: string;
  seo: any;
  blocks: any[];
  status?: 'draft' | 'published';
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SavePageRequest = await req.json();
    const { siteId, path, lang = 'en', title, seo, blocks, status = 'draft' } = body;

    const { data: site } = await supabase
      .from('sites')
      .select('org_id')
      .eq('id', siteId)
      .maybeSingle();

    if (!site) {
      return new Response(
        JSON.stringify({ error: 'Site not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
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
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: existingPage } = await supabase
      .from('pages')
      .select('*')
      .eq('site_id', siteId)
      .eq('path', path)
      .eq('lang', lang)
      .maybeSingle();

    let page;
    if (existingPage) {
      const { data: updatedPage, error: updateError } = await supabase
        .from('pages')
        .update({
          title,
          seo,
          blocks,
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPage.id)
        .select()
        .single();

      if (updateError) throw updateError;
      page = updatedPage;
    } else {
      const { data: newPage, error: insertError } = await supabase
        .from('pages')
        .insert({
          org_id: orgId,
          site_id: siteId,
          path,
          lang,
          title,
          seo,
          blocks,
          status,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      page = newPage;
    }

    await supabase.rpc('emit_event', {
      p_event_type: 'website.page.saved',
      p_org_id: orgId,
      p_payload: {
        site_id: siteId,
        page_id: page.id,
        version: page.version,
        path: page.path,
      },
    });

    return new Response(
      JSON.stringify({ ok: true, page }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    console.error('Error in website-save-page:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
