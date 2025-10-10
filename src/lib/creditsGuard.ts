import { supabase } from './supabase';

/**
 * Credits Guard - Automatic rollback safety for paid operations
 *
 * Ensures credits are debited only on success and automatically refunded on failure.
 * Supports idempotent operations via correlationId.
 */

export interface CreditGuardOptions {
  orgId: string;
  credits: number;
  correlationId: string;
  app?: string;
  action: string;
  metadata?: Record<string, any>;
}

export interface CreditGuardResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  entryId?: string;
  refunded?: boolean;
}

/**
 * Check if operation already executed (idempotency)
 */
async function checkIdempotency(correlationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('get_ledger_by_correlation_id', {
      p_correlation_id: correlationId
    });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Find successful entry (not refunded)
  const successEntry = data.find((entry: any) =>
    entry.op_journal !== 'refunded' && entry.credits < 0
  );

  return successEntry?.id || null;
}

/**
 * Debit credits for operation
 */
async function debitCredits(options: CreditGuardOptions): Promise<string | null> {
  const { orgId, credits, correlationId, app = 'website', action, metadata } = options;

  // Check idempotency first
  const existingEntryId = await checkIdempotency(correlationId);
  if (existingEntryId) {
    console.log(`Operation ${correlationId} already executed (idempotent)`);
    return existingEntryId;
  }

  // Get current balance
  const { data: balanceData } = await supabase.rpc('get_credit_balance', {
    p_org_id: orgId
  });
  const currentBalance = balanceData || 0;

  // Check sufficient balance
  if (currentBalance < credits) {
    throw new Error('Insufficient credits');
  }

  // Debit credits
  const { data, error } = await supabase
    .from('credits_ledger')
    .insert({
      org_id: orgId,
      credits: -credits, // Negative for debit
      balance: currentBalance - credits,
      description: `${action} operation`,
      app,
      action,
      correlation_id: correlationId,
      op_journal: 'pending',
      metadata: metadata || {}
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to debit credits: ${error.message}`);
  }

  return data.id;
}

/**
 * Mark operation as successful
 */
async function markSuccess(entryId: string): Promise<void> {
  await supabase
    .from('credits_ledger')
    .update({ op_journal: 'completed' })
    .eq('id', entryId);
}

/**
 * Refund credits on operation failure
 */
async function refundCredits(
  orgId: string,
  entryId: string,
  correlationId: string,
  reason: string = 'operation_failed'
): Promise<void> {
  await supabase.rpc('create_refund_entry', {
    p_org_id: orgId,
    p_parent_entry_id: entryId,
    p_correlation_id: correlationId,
    p_reason: reason
  });

  console.log(`Credits refunded for ${correlationId}: ${reason}`);
}

/**
 * Execute operation with automatic credit guard
 *
 * Usage:
 * ```typescript
 * const result = await withCreditsGuard({
 *   orgId: 'uuid',
 *   credits: 10,
 *   correlationId: 'AI-APPLY-123',
 *   action: 'ai_apply',
 *   metadata: { siteId, params }
 * }, async () => {
 *   return await performAIApply(params);
 * });
 *
 * if (result.success) {
 *   console.log('Operation succeeded:', result.data);
 * } else {
 *   console.error('Operation failed:', result.error);
 *   console.log('Credits refunded:', result.refunded);
 * }
 * ```
 */
export async function withCreditsGuard<T>(
  options: CreditGuardOptions,
  operation: () => Promise<T>
): Promise<CreditGuardResult<T>> {
  let entryId: string | null = null;
  let refunded = false;

  try {
    // 1. Debit credits (idempotent)
    entryId = await debitCredits(options);

    // If operation already executed, return success
    const existingEntryId = await checkIdempotency(options.correlationId);
    if (existingEntryId && existingEntryId !== entryId) {
      return {
        success: true,
        data: undefined as T, // Can't return data for existing operation
        entryId: existingEntryId
      };
    }

    // 2. Execute operation
    const data = await operation();

    // 3. Mark as successful
    if (entryId) {
      await markSuccess(entryId);
    }

    return {
      success: true,
      data,
      entryId: entryId || undefined
    };

  } catch (error) {
    console.error(`Operation failed for ${options.correlationId}:`, error);

    // 4. Refund credits on failure
    if (entryId) {
      try {
        await refundCredits(
          options.orgId,
          entryId,
          options.correlationId,
          error instanceof Error ? error.message : 'operation_failed'
        );
        refunded = true;
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      entryId: entryId || undefined,
      refunded
    };
  }
}

/**
 * Get cost estimate for an action
 */
export function getCost(action: string, params?: any): number {
  const basePrices: Record<string, number> = {
    'ai_apply': 10,
    'publish': 5,
    'export': 3,
    'image_opt': 2,
    'legal_generate': 8,
    'regenerate': 15,
    'template_swap': 5,
    'section_add': 7,
    'copy_rewrite': 8
  };

  let cost = basePrices[action] || 1;

  // Adjust cost based on params (e.g., complexity)
  if (params?.complexity === 'high') {
    cost *= 1.5;
  }

  return Math.ceil(cost);
}

/**
 * Get cost preview with USD estimate
 */
export interface CostPreview {
  credits: number;
  usd: number;
  tokens: number;
  priceQuoteId: string;
  ttl: number;
}

export async function getCostPreview(
  action: string,
  params?: any
): Promise<CostPreview> {
  const credits = getCost(action, params);
  const CREDIT_PRICE = 0.004; // $0.004 per credit
  const TOKENS_PER_CREDIT = 200; // ~200 tokens per credit

  return {
    credits,
    usd: credits * CREDIT_PRICE,
    tokens: credits * TOKENS_PER_CREDIT,
    priceQuoteId: `QUOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ttl: 300 // 5 minutes
  };
}
