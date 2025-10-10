import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthContext } from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";
import { SUPABASE } from "../core-mini/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
  const log = createLogger({ request_id: requestId, action: "download" });

  try {
    const ctx = await getAuthContext(req);
    const url = new URL(req.url);
    const productId = url.pathname.split("/").pop();

    if (!productId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Product ID required", request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseClient();

    const { data: entitlement, error: entitlementError } = await supabase
      .from("download_entitlements")
      .select("*")
      .eq("product_id", productId)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (entitlementError || !entitlement) {
      log.warn("Download attempted without entitlement", {
        product_id: productId,
        user_id: ctx.userId,
      });
      return new Response(
        JSON.stringify({
          ok: false,
          error: "You don't have access to this product",
          request_id: requestId,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product || !product.file_url) {
      log.error("Product file not found", { product_id: productId });
      return new Response(
        JSON.stringify({ ok: false, error: "Product file not found", request_id: requestId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info("Download authorized", { product_id: productId, user_id: ctx.userId });

    await supabase.from("events").insert({
      org_id: ctx.orgId,
      type: "product_downloaded",
      payload: { product_id: productId, user_id: ctx.userId },
      correlation_id: requestId,
    });

    if (product.file_url.startsWith("http")) {
      return Response.redirect(product.file_url, 302);
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("products")
      .download(product.file_url);

    if (downloadError || !fileData) {
      log.error("File download failed", { error: downloadError?.message });
      return new Response(
        JSON.stringify({ ok: false, error: "File download failed", request_id: requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(fileData, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": product.content_type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${product.name || "download"}"`,
      },
    });
  } catch (error) {
    log.error("Download failed", { error: error.message });
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
