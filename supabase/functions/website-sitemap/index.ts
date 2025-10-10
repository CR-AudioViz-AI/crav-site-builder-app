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
      .select("domain, updated_at")
      .eq("id", siteId)
      .maybeSingle();

    if (!site) {
      return new Response("Site not found", { status: 404 });
    }

    const { data: pages } = await supabase
      .from("pages")
      .select("slug, updated_at")
      .eq("site_id", siteId)
      .eq("status", "published");

    const baseUrl = site.domain || `https://preview.craudiovizai.com/${siteId}`;

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(pages || [])
  .map(
    (page: any) => `  <url>
    <loc>${baseUrl}/${page.slug === "home" ? "" : page.slug}</loc>
    <lastmod>${page.updated_at || site.updated_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.slug === "home" ? "1.0" : "0.8"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return new Response(`Error generating sitemap: ${error.message}`, {
      status: 500,
    });
  }
});
