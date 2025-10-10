import { supabase } from '../../../lib/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    const versionId = url.searchParams.get('versionId');

    if (!siteId || !versionId) {
      return new Response(JSON.stringify({ error: 'Missing siteId or versionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: currentSite } = await supabase
      .from('websites')
      .select('spec')
      .eq('id', siteId)
      .single();

    const { data: targetVersion } = await supabase
      .from('site_versions')
      .select('spec')
      .eq('id', versionId)
      .single();

    if (!currentSite || !targetVersion) {
      return new Response(JSON.stringify({ error: 'Site or version not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const diff = {
      current: currentSite.spec,
      target: targetVersion.spec,
      changes: compareSpecs(currentSite.spec, targetVersion.spec)
    };

    return new Response(JSON.stringify({ diff }), {
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

function compareSpecs(current: any, target: any): string[] {
  const changes: string[] = [];

  if (JSON.stringify(current) === JSON.stringify(target)) {
    changes.push('No changes');
    return changes;
  }

  if (current?.theme !== target?.theme) {
    changes.push('Theme changed');
  }

  if (current?.pages?.length !== target?.pages?.length) {
    changes.push(`Pages changed: ${target?.pages?.length || 0} → ${current?.pages?.length || 0}`);
  }

  return changes.length > 0 ? changes : ['Content modified'];
}
