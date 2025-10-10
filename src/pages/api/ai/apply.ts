import { supabase } from '../../../lib/supabase';
import { trackAIApply } from '../../../lib/telemetry';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId, action, params, orgId } = body;

    if (!siteId || !action) {
      return new Response(JSON.stringify({ error: 'Missing siteId or action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: currentSite } = await supabase
      .from('websites')
      .select('spec, version')
      .eq('id', siteId)
      .single();

    if (!currentSite) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const versionNumber = (currentSite.version || 0) + 1;

    await supabase.from('site_versions').insert({
      site_id: siteId,
      version: currentSite.version || 0,
      spec: currentSite.spec,
      created_at: new Date().toISOString()
    });

    const response = await fetch(`${SUPABASE_URL}/functions/v1/website-ai-apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ siteId, action, params }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();

    await supabase
      .from('websites')
      .update({
        spec: result.data.spec,
        version: versionNumber,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId);

    trackAIApply(orgId || 'unknown', siteId, action, params);

    return new Response(JSON.stringify({
      data: result.data,
      version: versionNumber,
      previousVersion: currentSite.version || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
