import { supabase } from '../../lib/supabase';
import { trackPublish } from '../../lib/telemetry';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const NETLIFY_TOKEN = import.meta.env.VITE_NETLIFY_TOKEN;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId, orgId } = body;

    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Missing siteId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: site } = await supabase
      .from('websites')
      .select('*')
      .eq('id', siteId)
      .single();

    if (!site) {
      return new Response(JSON.stringify({ error: 'Site not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/website-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ siteId, orgId }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();

    if (NETLIFY_TOKEN && result.data.deployUrl) {
      const netlifyResponse = await fetch('https://api.netlify.com/api/v1/sites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NETLIFY_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `site-${siteId}`,
          custom_domain: site.custom_domain || undefined
        })
      });

      if (netlifyResponse.ok) {
        const netlifyData = await netlifyResponse.json();
        result.data.liveUrl = `https://${netlifyData.ssl_url || netlifyData.url}`;
      }
    }

    await supabase
      .from('websites')
      .update({
        status: 'published',
        published_url: result.data.liveUrl || result.data.url,
        published_at: new Date().toISOString()
      })
      .eq('id', siteId);

    trackPublish(orgId || 'unknown', siteId, result.data.liveUrl || result.data.url);

    return new Response(JSON.stringify({
      data: {
        url: result.data.liveUrl || result.data.url,
        siteId,
        publishedAt: new Date().toISOString()
      }
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
