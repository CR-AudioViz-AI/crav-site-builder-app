export async function audit(
  supabase: any,
  orgId: string,
  action: string,
  meta: any = {},
  user_email?: string,
  target?: string
): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      org_id: orgId,
      action,
      meta,
      user_email,
      target,
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
