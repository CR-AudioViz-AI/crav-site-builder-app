import { getAuthContext } from "../core-mini/auth.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { SUPABASE } from "../core-mini/env.ts";

function getSupabaseClient() {
  return createClient(SUPABASE.url, SUPABASE.serviceKey);
}

type Role = 'owner' | 'admin' | 'editor' | 'viewer';

interface GuardResult {
  supabase: any;
  orgId: string;
  user: any;
}

interface GuardError {
  error: string;
  status: number;
}

export async function guard(
  req: Request,
  tool_key: string,
  allowedRoles: Role[] = ['viewer', 'editor', 'admin', 'owner']
): Promise<GuardResult | GuardError> {
  try {
    const ctx = await getAuthContext(req);
    const supabase = getSupabaseClient();
    const orgId = ctx.orgId;
    const user = ctx.user;

    if (!orgId) {
      return { error: 'authentication_required', status: 401 };
    }

    const { data: ent } = await supabase
      .from('org_entitlements')
      .select('*')
      .eq('org_id', orgId)
      .eq('tool_key', tool_key)
      .maybeSingle();

    if (!ent) {
      return { error: 'entitlement_required', status: 403 };
    }

    const { data: mem } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user?.id)
      .maybeSingle();

    if (mem && !allowedRoles.includes(mem.role as Role)) {
      return { error: 'forbidden', status: 403 };
    }

    return { supabase, orgId, user };
  } catch (error) {
    return { error: error.message || 'server_error', status: 500 };
  }
}
