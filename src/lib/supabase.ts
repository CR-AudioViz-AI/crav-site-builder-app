import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const getCurrentOrgId = (): string => {
  return 'demo-org-123';
};

export const hasToolEntitlement = async (toolKey: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc('has_tool_entitlement', {
    p_org_id: getCurrentOrgId(),
    p_tool: toolKey,
  });

  if (error) {
    console.error('Error checking entitlement:', error);
    return false;
  }

  return data === true;
};

export const getIdempotencyResult = async (key: string): Promise<unknown | null> => {
  const { data, error } = await supabase.rpc('get_idempotency_result', {
    p_key: key,
    p_org_id: getCurrentOrgId(),
  });

  if (error) {
    console.error('Error getting idempotency result:', error);
    return null;
  }

  return data;
};

export const debitCredits = async (
  action: string,
  amount: number,
  idempotencyKey: string,
  metadata: Record<string, unknown> = {}
): Promise<{ success: boolean; debited: number; action: string }> => {
  const { data, error } = await supabase.rpc('debit_credits', {
    p_org_id: getCurrentOrgId(),
    p_action: action,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(`Failed to debit credits: ${error.message}`);
  }

  return data as { success: boolean; debited: number; action: string };
};

export const emitEvent = async (
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> => {
  const { error } = await supabase.rpc('emit_event', {
    p_event_type: eventType,
    p_org_id: getCurrentOrgId(),
    p_payload: payload,
  });

  if (error) {
    console.error('Error emitting event:', error);
  }
};
