// Brand tokens export endpoint (0 credits)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE } from "../core-mini/env.ts";
import { getAuthContext, emitEvent } from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface BrandTokens {
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
    };
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
    lineHeight: Record<string, string>;
  };
  spacing: Record<string, string>;
  motion: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");
    const format = url.searchParams.get("format") || "json";

    if (!siteId) {
      return new Response(
        JSON.stringify({ error: "siteId parameter required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ctx = await getAuthContext(req, siteId);
    const log = createLogger({ request_id: ctx.requestId, org_id: ctx.orgId, action: "brand-tokens-export" });

    const supabase = createClient(SUPABASE.url, SUPABASE.serviceKey);

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("brand_tokens, name, handle")
      .eq("id", siteId)
      .maybeSingle();

    if (siteError || !site) {
      log.error("Site not found", { site_id: siteId });
      return new Response(
        JSON.stringify({ error: "Site not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens: BrandTokens = site.brand_tokens || {
      colors: {
        primary: ["#007bff", "#0056b3", "#004085"],
        secondary: ["#6c757d", "#545b62", "#3d4246"],
        accent: ["#28a745", "#1e7e34", "#145523"],
        neutral: ["#f8f9fa", "#e9ecef", "#dee2e6", "#ced4da", "#adb5bd"],
      },
      typography: {
        fontFamily: {
          heading: "Inter, sans-serif",
          body: "Inter, sans-serif",
        },
        fontSize: {
          xs: "0.75rem",
          sm: "0.875rem",
          base: "1rem",
          lg: "1.125rem",
          xl: "1.25rem",
          "2xl": "1.5rem",
          "3xl": "1.875rem",
          "4xl": "2.25rem",
        },
        fontWeight: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeight: {
          tight: "1.25",
          normal: "1.5",
          relaxed: "1.75",
        },
      },
      spacing: {
        "1": "0.25rem",
        "2": "0.5rem",
        "3": "0.75rem",
        "4": "1rem",
        "6": "1.5rem",
        "8": "2rem",
        "12": "3rem",
        "16": "4rem",
      },
      motion: {
        duration: {
          fast: "150ms",
          base: "300ms",
          slow: "500ms",
        },
        easing: {
          ease: "ease",
          "ease-in": "ease-in",
          "ease-out": "ease-out",
          "ease-in-out": "ease-in-out",
        },
      },
    };

    const sbom = {
      bomFormat: "CycloneDX",
      specVersion: "1.4",
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        component: {
          type: "design-system",
          name: `${site.name} Brand Tokens`,
          version: "1.0.0",
        },
      },
      components: [
        { type: "design-system", name: "brand-tokens", version: "1.0.0" },
      ],
    };

    const slsa = {
      _type: "https://in-toto.io/Statement/v0.1",
      subject: [{ name: `${site.name} Brand Tokens`, digest: { sha256: `sha256-${Date.now()}` } }],
      predicateType: "https://slsa.dev/provenance/v0.2",
      predicate: {
        builder: { id: "https://craudiovizai.com/website-builder/v1" },
        buildType: "https://craudiovizai.com/brand-tokens/v1",
        metadata: {
          buildInvocationId: ctx.requestId,
          buildStartedOn: new Date().toISOString(),
          buildFinishedOn: new Date().toISOString(),
        },
        materials: [{ uri: `site:${siteId}`, digest: { sha256: `sha256-${siteId}` } }],
      },
    };

    const result = {
      tokens,
      sbom,
      slsa,
      metadata: {
        site_id: siteId,
        site_name: site.name,
        site_handle: site.handle,
        exported_at: new Date().toISOString(),
        format,
      },
    };

    await emitEvent("website.brand.exported", ctx.orgId, {
      site_id: siteId,
      format,
      request_id: ctx.requestId,
    });

    log.info("Brand tokens exported", { site_id: siteId, format });

    if (format === "css") {
      const css = generateCssVariables(tokens);
      return new Response(css, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/css" },
      });
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Brand tokens export failed:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateCssVariables(tokens: BrandTokens): string {
  let css = ":root {\n";

  tokens.colors.primary.forEach((color, i) => {
    css += `  --color-primary-${i + 1}: ${color};\n`;
  });
  tokens.colors.secondary.forEach((color, i) => {
    css += `  --color-secondary-${i + 1}: ${color};\n`;
  });
  tokens.colors.accent.forEach((color, i) => {
    css += `  --color-accent-${i + 1}: ${color};\n`;
  });
  tokens.colors.neutral.forEach((color, i) => {
    css += `  --color-neutral-${i + 1}: ${color};\n`;
  });

  css += `\n  --font-family-heading: ${tokens.typography.fontFamily.heading};\n`;
  css += `  --font-family-body: ${tokens.typography.fontFamily.body};\n`;

  Object.entries(tokens.typography.fontSize).forEach(([key, value]) => {
    css += `  --font-size-${key}: ${value};\n`;
  });

  Object.entries(tokens.typography.fontWeight).forEach(([key, value]) => {
    css += `  --font-weight-${key}: ${value};\n`;
  });

  Object.entries(tokens.typography.lineHeight).forEach(([key, value]) => {
    css += `  --line-height-${key}: ${value};\n`;
  });

  Object.entries(tokens.spacing).forEach(([key, value]) => {
    css += `  --spacing-${key}: ${value};\n`;
  });

  Object.entries(tokens.motion.duration).forEach(([key, value]) => {
    css += `  --duration-${key}: ${value};\n`;
  });

  Object.entries(tokens.motion.easing).forEach(([key, value]) => {
    css += `  --easing-${key}: ${value};\n`;
  });

  css += "}\n";
  return css;
}
