import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE } from "../core-mini/env.ts";

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");

  if (!siteId) {
    return new Response("Missing siteId parameter", { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();

    const { data: site } = await supabase
      .from("sites")
      .select("domain, seo_settings")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) {
      return new Response("Site not found", { status: 404 });
    }

    const baseUrl = site.domain || `https://preview.craudiovizai.com/${siteId}`;
    const allowCrawling = site.seo_settings?.allow_crawling !== false;

    const robots = `User-agent: *
${allowCrawling ? "Allow: /" : "Disallow: /"}

Sitemap: ${baseUrl}/sitemap.xml`;

    return new Response(robots, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    return new Response(`Error generating robots.txt: ${error.message}`, {
      status: 500,
    });
  }
});
