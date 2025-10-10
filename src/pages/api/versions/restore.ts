import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId, versionId } = body;

    if (!siteId || !versionId) {
      return new Response(JSON.stringify({ error: 'Missing siteId or versionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: targetVersion } = await supabase
      .from('site_versions')
      .select('*')
      .eq('id', versionId)
      .eq('site_id', siteId)
      .single();

    if (!targetVersion) {
      return new Response(JSON.stringify({ error: 'Version not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await supabase
      .from('websites')
      .update({
        spec: targetVersion.spec,
        version: targetVersion.version,
        updated_at: new Date().toISOString()
      })
      .eq('id', siteId);

    return new Response(JSON.stringify({
      success: true,
      version: targetVersion.version
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
