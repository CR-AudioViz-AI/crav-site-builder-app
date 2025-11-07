import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
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
  const log = createLogger({ request_id: requestId, action: "webhooks-paypal" });

  try {
    const body = await req.json();

    log.info("PayPal webhook received", { event_type: body.event_type });

    if (body.event_type === "PAYMENT.CAPTURE.COMPLETED" || body.event_type === "CHECKOUT.ORDER.APPROVED") {
      const supabase = getSupabaseClient();
      const resource = body.resource;

      const productId = resource.custom_id || resource.purchase_units?.[0]?.custom_id;
      const orgId = resource.metadata?.org_id;
      const userId = resource.metadata?.user_id;

      if (!productId || !orgId || !userId) {
        log.warn("Missing metadata in webhook", { event_type: body.event_type });
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("product_id", productId)
        .eq("org_id", orgId)
        .eq("status", "pending");

      if (orderError) {
        log.error("Failed to update order", { error: orderError.message });
      }

      const { error: entitlementError } = await supabase
        .from("download_entitlements")
        .insert({
          org_id: orgId,
          user_id: userId,
          product_id: productId,
          granted_at: new Date().toISOString(),
        });

      if (entitlementError) {
        log.error("Failed to grant entitlement", { error: entitlementError.message });
      } else {
        log.info("Entitlement granted", { product_id: productId, user_id: userId });
      }

      await supabase.from("events").insert({
        org_id: orgId,
        type: "checkout_completed",
        payload: { product_id: productId, provider: "paypal" },
        correlation_id: requestId,
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    log.error("Webhook processing failed", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
