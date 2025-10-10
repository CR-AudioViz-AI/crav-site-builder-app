import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId } = body;

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Missing siteId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: currentSite } = await supabase
      .from('websites')
      .select('version, spec')
      .eq('id', siteId)
      .single();

    if (!currentSite || currentSite.version <= 1) {
      return new Response(JSON.stringify({ error: 'No previous version' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: previousVersion } = await supabase
      .from('site_versions')
      .select('*')
      .eq('site_id', siteId)
      .eq('version', currentSite.version - 1)
      .single();

    if (!previousVersion) {
      return new Response(JSON.stringify({ error: 'Previous version not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await supabase
      .from('websites')
      .update({
        spec: previousVersion.spec,
        version: previousVersion.version,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId);

    return new Response(JSON.stringify({
      success: true,
      version: previousVersion.version
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
