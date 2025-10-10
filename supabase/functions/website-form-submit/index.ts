import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getAuthContext, emitEvent } from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";
import { CAPTCHA, SUPABASE, HUB } from "../core-mini/env.ts";
import { sanitizeHtml, verifySignature } from "../core-mini/tracking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

async function verifyCaptcha(token: string): Promise<boolean> {
  if (CAPTCHA.provider === "none") return true;

  const secret = CAPTCHA.secret();
  if (!secret) return true;

  let verifyUrl = "";
  if (CAPTCHA.provider === "hcaptcha") {
    verifyUrl = "https://hcaptcha.com/siteverify";
  } else if (CAPTCHA.provider === "recaptcha") {
    verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
  }

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${secret}&response=${token}`,
  });

  const data = await response.json();
  return data.success === true;
}

interface FormSubmitRequest {
  formId: string;
  data: Record<string, any>;
  captchaToken?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "form-submit" });

  try {
    // Verify webhook signature if present
    const signature = req.headers.get("X-Webhook-Signature");
    if (signature && HUB.enabled()) {
      const bodyText = await req.text();
      const isValid = verifySignature(bodyText, signature, HUB.signingKey);
      if (!isValid) {
        log.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ ok: false, error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      var body: FormSubmitRequest = JSON.parse(bodyText);
    } else {
      var body: FormSubmitRequest = await req.json();
    }

    const { formId, data, captchaToken } = body;

    // Verify CAPTCHA
    if (CAPTCHA.provider !== "none") {
      if (!captchaToken) {
        return new Response(
          JSON.stringify({ ok: false, error: "CAPTCHA token required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const valid = await verifyCaptcha(captchaToken);
      if (!valid) {
        return new Response(
          JSON.stringify({ ok: false, error: "CAPTCHA verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = getSupabaseClient();

    // Get form and site
    const { data: form } = await supabase
      .from("forms")
      .select("*, sites!inner(org_id)")
      .eq("id", formId)
      .maybeSingle();

    if (!form) {
      return new Response(
        JSON.stringify({ ok: false, error: "Form not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId = form.sites.org_id;

    // Sanitize HTML in data
    const sanitizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        sanitizedData[key] = sanitizeHtml(value);
      } else {
        sanitizedData[key] = value;
      }
    }

    // Store submission
    const { data: submission } = await supabase
      .from("form_submissions")
      .insert({
        form_id: formId,
        data: sanitizedData,
        ip_address: req.headers.get("x-forwarded-for") || "unknown",
        user_agent: req.headers.get("user-agent") || "unknown",
      })
      .select()
      .single();

    log.info("Form submitted", { form_id: formId, org_id: orgId });

    const result = {
      ok: true,
      data: {
        submission_id: submission.id,
        submitted_at: submission.created_at,
      },
      request_id: requestId,
    };

    // Emit event
    await emitEvent("website.form.submitted", orgId, {
      form_id: formId,
      submission_id: submission.id,
      email: sanitizedData.email || null,
      request_id: requestId,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Form submission failed", { error: error.message });
    return new Response(
      JSON.stringify({
        ok: false,
        error: error.message,
        request_id: requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
