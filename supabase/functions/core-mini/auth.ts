// Org auth, license & entitlement checks, idempotency+credits helpers
import { createClient } from "npm:@supabase/supabase-js@2";
import { RUNTIME, SUPABASE, env, INTERNAL_ORG_IDS } from "./env.ts";

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

export interface User {
  id?: string;
  email?: string;
  roles?: string[];
}

export function isInternalUser(user: User | null | undefined, orgId: string): boolean {
  if (env.internalKillSwitch) return false;
  const inOrg = INTERNAL_ORG_IDS.has(orgId);
  const isStaffEmail = !!user?.email && user.email.toLowerCase().endsWith('@' + env.internalEmailDomain);
  const hasRole = (user?.roles || []).includes('internal') || (user?.roles || []).includes('admin');
  return inOrg && (isStaffEmail || hasRole);
}

export async function requireEntitlement(
  orgId: string,
  tool: string,
  user?: User
): Promise<void> {
  // Bypass if internal mode = 'all'
  if (!env.internalKillSwitch && env.internalBypassMode === 'all' && isInternalUser(user, orgId)) {
    return;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("has_tool_entitlement", {
    p_org_id: orgId,
    p_tool: tool,
  });
  if (error || !data) {
    throw new Error("entitlement_required");
  }
}

export async function requireLicenseIfSelfHosted(): Promise<void> {
  if (RUNTIME.mode !== "self_hosted") return;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("check_license_status");
  if (error || !data || data.status !== "valid") {
    throw new Error("license_invalid");
  }
}

export async function getIdempotencyResult(
  key: string,
  orgId: string
): Promise<any | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.rpc("get_idempotency_result", {
    p_key: key,
    p_org_id: orgId,
  });
  return data;
}

export async function storeIdempotencyResult(
  key: string,
  orgId: string,
  result: any
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.rpc("store_idempotency_result", {
    p_key: key,
    p_org_id: orgId,
    p_result: result,
  });
}

export { debitCredits, markServerError } from "./credits.ts";

export async function emitEvent(
  eventType: string,
  orgId: string,
  payload: Record<string, any>
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.rpc("emit_event", {
    p_event_type: eventType,
    p_org_id: orgId,
    p_payload: payload,
  });
}

export async function hashBody(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface AuthContext {
  orgId: string;
  userId?: string;
  user?: User;
  requestId: string;
}

export async function getAuthContext(
  req: Request,
  requireAuth = true
): Promise<AuthContext> {
  const requestId = crypto.randomUUID();

  // Extract org_id and user from headers or JWT
  const orgId = req.headers.get("x-org-id") || "";
  const userEmail = req.headers.get("x-user-email");
  const userId = req.headers.get("x-user-id");

  if (requireAuth && !orgId) {
    throw new Error("authentication_required");
  }

  const user: User = {
    id: userId || undefined,
    email: userEmail || undefined,
    roles: [], // Extract from JWT if needed
  };

  return { orgId, userId: userId || undefined, user, requestId };
}
