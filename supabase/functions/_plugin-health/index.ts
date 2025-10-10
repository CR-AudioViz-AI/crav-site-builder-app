// Plugin health check endpoint
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import type { PluginHealthResponse } from "../core-mini/plugin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const response: PluginHealthResponse = {
    ok: true,
    tool_key: "website",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
