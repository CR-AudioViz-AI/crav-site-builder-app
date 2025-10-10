import { supabase } from '../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orgId, name } = body;

    if (!orgId || !name) {
      return new Response(JSON.stringify({ error: 'Missing orgId or name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await supabase
      .from('websites')
      .insert({
        org_id: orgId,
        name,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
