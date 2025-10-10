import { getSupabaseClient } from "./platform.ts";

export async function hashBody(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getIdempotencyResult(
  key: string,
  hash: string
): Promise<any | null> {
  const supabase = getSupabaseClient();
  const compositeKey = `${key}:${hash}`;

  const { data, error } = await supabase
    .from("idempotency_results")
    .select("result")
    .eq("key", compositeKey)
    .single();

  if (error || !data) return null;

  return data.result;
}

export async function upsertIdempotencyKey(
  key: string,
  hash: string,
  result: any
): Promise<void> {
  const supabase = getSupabaseClient();
  const compositeKey = `${key}:${hash}`;

  await supabase.from("idempotency_results").upsert({
    key: compositeKey,
    org_id: result.org_id || "00000000-0000-0000-0000-000000000000",
    result,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}
