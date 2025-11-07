import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { guard } from "../_shared/authz.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generatePrivacyPolicy(companyName: string, email: string, domain: string): string {
  return `# Privacy Policy

**Last Updated:** ${new Date().toLocaleDateString()}

## Introduction

${companyName} ("we," "our," or "us") respects your privacy and is committed to protecting your personal data.

## Information We Collect

We collect information you provide directly to us, including:
- Name and contact information
- Account credentials
- Payment information
- Usage data and analytics

## How We Use Your Information

We use the information we collect to:
- Provide and maintain our services
- Process transactions
- Send administrative information
- Improve our services
- Comply with legal obligations

## Data Security

We implement appropriate technical and organizational measures to protect your personal data.

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Request deletion of your data
- Object to processing
- Data portability

## Contact Us

For privacy-related inquiries, contact us at: ${email}

**Website:** ${domain}`;
}

function generateTermsOfService(companyName: string, email: string, domain: string): string {
  return `# Terms of Service

**Last Updated:** ${new Date().toLocaleDateString()}

## Acceptance of Terms

By accessing ${domain}, you agree to be bound by these Terms of Service.

## Services Description

${companyName} provides [describe your services].

## User Responsibilities

You agree to:
- Provide accurate information
- Maintain account security
- Comply with applicable laws
- Not misuse our services

## Payment Terms

- Prices are as displayed
- Payment is required before service delivery
- All sales are final unless otherwise stated
- Refunds handled case-by-case

## Intellectual Property

All content, trademarks, and intellectual property are owned by ${companyName}.

## Limitation of Liability

${companyName} shall not be liable for any indirect, incidental, or consequential damages.

## Termination

We reserve the right to terminate accounts that violate these terms.

## Changes to Terms

We may modify these terms at any time. Continued use constitutes acceptance.

## Contact

Questions about these terms? Contact us at: ${email}

**Website:** ${domain}`;
}

function generateAIDisclaimer(companyName: string): string {
  return `# AI Usage Disclaimer

**Last Updated:** ${new Date().toLocaleDateString()}

## AI-Generated Content

${companyName} utilizes artificial intelligence (AI) technology to assist in content generation and website creation.

## Nature of AI Content

- Content may be AI-generated or AI-assisted
- We review and curate AI outputs for quality
- AI suggestions should be reviewed before use
- We do not guarantee 100% accuracy of AI content

## User Responsibility

Users are responsible for:
- Reviewing all AI-generated content
- Ensuring accuracy and appropriateness
- Compliance with applicable laws and regulations
- Not relying solely on AI outputs for critical decisions

## Limitations

AI technology has inherent limitations:
- May produce inaccurate or incomplete information
- Reflects patterns in training data
- Cannot replace human judgment
- Subject to ongoing improvement

## Liability

We are not liable for decisions made based on AI-generated content. Users should verify information independently.

## Feedback

We welcome feedback on AI-generated content to improve our services.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const g = await guard(req, "website", ['editor', 'admin', 'owner']);
  if ("error" in g) {
    return new Response(
      JSON.stringify({ ok: false, error: g.error }),
      { status: g.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { supabase, orgId } = g as any;

  try {
    const body = await req.json();
    const { siteId, pageType, companyName, email, domain } = body;

    if (!siteId || !pageType || !companyName || !email || !domain) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_required_fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let content = "";
    let title = "";
    let slug = "";

    switch (pageType) {
      case "privacy":
        content = generatePrivacyPolicy(companyName, email, domain);
        title = "Privacy Policy";
        slug = "privacy-policy";
        break;
      case "terms":
        content = generateTermsOfService(companyName, email, domain);
        title = "Terms of Service";
        slug = "terms-of-service";
        break;
      case "ai-disclaimer":
        content = generateAIDisclaimer(companyName);
        title = "AI Disclaimer";
        slug = "ai-disclaimer";
        break;
      default:
        return new Response(
          JSON.stringify({ ok: false, error: "invalid_page_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const sections = [
      {
        type: "legal",
        props: {
          content,
          markdown: true,
        },
      },
    ];

    const { data: page, error } = await supabase
      .from("pages")
      .upsert({
        org_id: orgId,
        site_id: siteId,
        slug,
        name: title,
        sections,
        seo: {
          title,
          description: `${title} for ${companyName}`,
          noindex: false,
        },
      }, {
        onConflict: "site_id,slug",
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ ok: true, data: page }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({ ok: false, error: error.message || "server_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
