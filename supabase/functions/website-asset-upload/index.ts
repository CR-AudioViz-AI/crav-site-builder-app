import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthContext } from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";
import { SUPABASE } from "../core-mini/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "website-asset-upload" });

  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const siteId = formData.get("site_id") as string;

    if (!file) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_file", request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!siteId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_site_id", request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify site belongs to org
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, org_id")
      .eq("id", siteId)
      .eq("org_id", ctx.orgId)
      .single();

    if (siteError || !site) {
      return new Response(
        JSON.stringify({ ok: false, error: "site_not_found", request_id: requestId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine file extension
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const kind = ["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext) ? "image" : "file";

    // Generate storage key
    const storageKey = `${ctx.orgId}/${siteId}/logo-${crypto.randomUUID()}.${ext}`;

    log.info("Uploading asset", { file_name: file.name, size: file.size, type: file.type });

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("site-assets")
      .upload(storageKey, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      log.error("Storage upload failed", { error: uploadError.message });
      return new Response(
        JSON.stringify({
          ok: false,
          error: uploadError.message,
          request_id: requestId,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("site-assets")
      .getPublicUrl(storageKey);

    const publicUrl = publicUrlData.publicUrl;

    // Record in assets table
    const { error: assetError } = await supabase.from("assets").insert({
      org_id: ctx.orgId,
      site_id: siteId,
      kind,
      name: file.name,
      url: publicUrl,
      meta: {
        role: "brand_logo",
        size: file.size,
        content_type: file.type,
        uploaded_by: ctx.user?.email,
      },
    });

    if (assetError) {
      log.warn("Asset record failed", { error: assetError.message });
    }

    // Update site theme with logo URL
    const { data: currentSite } = await supabase
      .from("sites")
      .select("theme")
      .eq("id", siteId)
      .single();

    const currentTheme = currentSite?.theme || {};
    const updatedTheme = {
      ...currentTheme,
      brand: {
        ...(currentTheme.brand || {}),
        logo: publicUrl,
      },
    };

    await supabase
      .from("sites")
      .update({ theme: updatedTheme })
      .eq("id", siteId)
      .eq("org_id", ctx.orgId);

    log.info("Asset uploaded successfully", { url: publicUrl });

    return new Response(
      JSON.stringify({
        ok: true,
        data: { url: publicUrl, asset_id: null },
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log.error("Asset upload failed", { error: error.message });
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message || "server_error",
        request_id: requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
