import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/csp.ts";

/**
 * Credits Preview - Cost estimation before operation
 *
 * Returns credit cost, USD estimate, and quote ID with TTL
 */

const CREDIT_PRICE = 0.004; // $0.004 per credit
const TOKENS_PER_CREDIT = 200; // ~200 tokens per credit
const QUOTE_TTL = 300; // 5 minutes

interface CostParams {
  complexity?: "low" | "medium" | "high";
  imageCount?: number;
  pageCount?: number;
  [key: string]: any;
}

function calculateCost(action: string, params?: CostParams): number {
  const basePrices: Record<string, number> = {
    // AI operations
    ai_apply: 10,
    regenerate: 15,
    template_swap: 5,
    section_add: 7,
    copy_rewrite: 8,
    palette_extract: 3,

    // Publishing
    publish: 5,
    export: 3,

    // Asset operations
    image_opt: 2,
    logo_upload: 1,

    // Legal
    legal_generate: 8,

    // E-commerce
    product_create: 2,
    checkout_process: 1,
  };

  let cost = basePrices[action] || 1;

  // Adjust cost based on params
  if (params) {
    // Complexity multiplier
    if (params.complexity === "high") {
      cost *= 1.5;
    } else if (params.complexity === "medium") {
      cost *= 1.2;
    }

    // Image count
    if (params.imageCount) {
      cost += params.imageCount * 0.5;
    }

    // Page count
    if (params.pageCount) {
      cost += params.pageCount * 2;
    }
  }

  return Math.ceil(cost);
}

Deno.serve(async (req: Request) => {
  // Handle OPTIONS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    // Validate required fields
    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing action" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate cost
    const credits = calculateCost(action, params);
    const usd = credits * CREDIT_PRICE;
    const tokens = credits * TOKENS_PER_CREDIT;

    // Generate quote ID
    const priceQuoteId = `QUOTE-${Date.now()}-${
      Math.random().toString(36).substr(2, 9)
    }`;

    // Store quote with TTL (optional - can cache in Redis/KV)
    const expiresAt = new Date(Date.now() + QUOTE_TTL * 1000).toISOString();

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          action,
          credits,
          usd: parseFloat(usd.toFixed(4)),
          tokens,
          priceQuoteId,
          ttl: QUOTE_TTL,
          expiresAt,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Cost preview error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
