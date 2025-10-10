import { supabase } from './supabase';

const INTERNAL_BYPASS_MODE = import.meta.env.INTERNAL_BYPASS_MODE === 'true';
const INTERNAL_UNLIMITED_ORG_IDS = (
  import.meta.env.INTERNAL_UNLIMITED_ORG_IDS || ''
)
  .split(',')
  .filter(Boolean);

export interface RBACContext {
  userId?: string;
  orgId?: string;
  role?: string;
  email?: string;
}

export async function checkBypassMode(context: RBACContext): Promise<boolean> {
  if (!INTERNAL_BYPASS_MODE) {
    return false;
  }

  if (!context.userId || !context.email) {
    return false;
  }

  const { data: user } = await supabase
    .from('users')
    .select('email, role')
    .eq('id', context.userId)
    .single();

  if (!user) {
    return false;
  }

  const emailDomain = import.meta.env.INTERNAL_EMAIL_DOMAIN || 'craudiovizai.com';
  const isInternalEmail = user.email.endsWith(`@${emailDomain}`);
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  return isInternalEmail && isAdmin;
}

export async function isUnlimitedOrg(orgId: string): Promise<boolean> {
  if (INTERNAL_UNLIMITED_ORG_IDS.includes(orgId)) {
    return true;
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('unlimited')
    .eq('id', orgId)
    .single();

  return org?.unlimited === true;
}

export async function checkCreditsOrBypass(
  context: RBACContext,
  requiredCredits: number
): Promise<{ allowed: boolean; reason?: string }> {
  const bypass = await checkBypassMode(context);
  if (bypass) {
    return { allowed: true, reason: 'bypass_mode' };
  }

  if (!context.orgId) {
    return { allowed: false, reason: 'missing_org' };
  }

  const unlimited = await isUnlimitedOrg(context.orgId);
  if (unlimited) {
    return { allowed: true, reason: 'unlimited_org' };
  }

  const { data: credits } = await supabase
    .from('credits_ledger')
    .select('balance')
    .eq('org_id', context.orgId)
    .single();

  const balance = credits?.balance || 0;
  if (balance >= requiredCredits) {
    return { allowed: true, reason: 'sufficient_credits' };
  }

  return { allowed: false, reason: 'insufficient_credits' };
}
