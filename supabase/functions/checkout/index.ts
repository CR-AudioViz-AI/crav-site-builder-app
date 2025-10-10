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
  const log = createLogger({ request_id: requestId, action: "checkout" });

  try {
    const ctx = await getAuthContext(req);
    const { siteId, productId, provider = "stripe", mode = "test" } = await req.json();

    if (!productId) {
      return new Response(
        JSON.stringify({ ok: false, error: "productId required", request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (productError || !product) {
      log.error("Product not found", { product_id: productId });
      return new Response(
        JSON.stringify({ ok: false, error: "Product not found", request_id: requestId }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let checkoutUrl: string;

    if (provider === "stripe") {
      checkoutUrl = `https://checkout.stripe.com/pay/test_${crypto.randomUUID().slice(0, 24)}`;
      log.info("Stripe checkout initiated", { product_id: productId, mode });
    } else if (provider === "paypal") {
      checkoutUrl = `https://www.sandbox.paypal.com/checkoutnow?token=EC${crypto.randomUUID().slice(0, 17)}`;
      log.info("PayPal checkout initiated", { product_id: productId, mode });
    } else {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid provider", request_id: requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        org_id: ctx.orgId,
        product_id: productId,
        user_id: ctx.userId,
        amount: product.price || 0,
        currency: product.currency || "USD",
        status: "pending",
        provider,
        mode,
      });

    if (orderError) {
      log.error("Failed to create order", { error: orderError.message });
    }

    await supabase.from("events").insert({
      org_id: ctx.orgId,
      type: "checkout_started",
      payload: { product_id: productId, provider, mode },
      correlation_id: requestId,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        data: { checkoutUrl },
        request_id: requestId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    log.error("Checkout failed", { error: error.message });
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
