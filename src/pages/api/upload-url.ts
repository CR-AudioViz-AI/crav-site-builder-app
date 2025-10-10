import { supabase } from '../../lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileName, fileType, siteId } = body;

    if (!fileName || !fileType) {
      return new Response(JSON.stringify({ error: 'Missing fileName or fileType' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filePath = `${siteId || 'temp'}/${Date.now()}-${fileName}`;

    const { data, error } = await supabase.storage
      .from('website-assets')
      .createSignedUploadUrl(filePath);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('website-assets')
      .getPublicUrl(filePath);

    return new Response(JSON.stringify({
      uploadUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      filePath,
      expiresIn: 3600
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
