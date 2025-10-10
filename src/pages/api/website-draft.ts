import { supabase } from '../../lib/supabase';
import { trackGenerateSite } from '../../lib/telemetry';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { siteId, brief, orgId } = body;

    if (!siteId || !brief) {
      return new Response(JSON.stringify({ error: 'Missing siteId or brief' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const idempotencyKey = crypto.randomUUID();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/website-draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ siteId, brief }),
    });

    if (!response.ok) {
      const error = await response.json();
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();

    trackGenerateSite(orgId || 'unknown', siteId, brief);

    await supabase
      .from('websites')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', siteId);

    return new Response(JSON.stringify({
      data: result.data,
      siteId,
      redirectUrl: `/preview/${siteId}`
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
