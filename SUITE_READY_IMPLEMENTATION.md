# Suite Integration Implementation Complete

**Date**: 2025-10-13  
**Status**: ✅ **P0 + P1 IMPLEMENTED** → Ready for Testing

---

## What Was Implemented

### P0: Critical for Launch (2 items) ✅

#### 1. Automatic Rollback Safety ✅
**File**: `src/lib/creditsGuard.ts`

- `withCreditsGuard()` - Wrapper for paid operations
- Automatic credit refund on operation failure
- Debit → Execute → Success OR Refund
- Prevents credit leakage on errors

**Usage**:
```typescript
const result = await withCreditsGuard({
  orgId,
  credits: 10,
  correlationId: 'AI-APPLY-123',
  action: 'ai_apply'
}, async () => {
  return await performAIApply(params);
});

if (result.success) {
  console.log('Success, credits debited');
} else {
  console.log('Failed, credits refunded:', result.refunded);
}
```

---

#### 2. Granular Line Items ✅
**Files**: 
- `supabase/migrations/20251013_suite_integration.sql`
- `src/lib/creditsGuard.ts`

- Enhanced `credits_ledger` table with:
  - `app` - Which app (e.g., 'website')
  - `action` - Which action (e.g., 'ai_apply', 'publish')
  - `correlation_id` - Idempotency key
  - `parent_entry_id` - Links refunds to original debit
  - `op_journal` - Operation status ('pending', 'completed', 'refunded')

**Migration**:
```sql
ALTER TABLE credits_ledger
  ADD COLUMN app TEXT DEFAULT 'website',
  ADD COLUMN action TEXT,
  ADD COLUMN correlation_id TEXT,
  ADD COLUMN parent_entry_id UUID,
  ADD COLUMN op_journal TEXT DEFAULT 'pending';
```

---

### P1: Suite Integration (4 items) ✅

#### 3. Brand Kit Sync ✅
**Files**:
- `supabase/migrations/20251013_suite_integration.sql` (brand_assets table)
- `supabase/functions/brand-kit-sync/index.ts`

- New `brand_assets` table for shared brand storage
- Syncs logo, palette, fonts from Website Builder
- Other apps can query for org brand assets
- RPC: `sync_brand_kit(orgId, siteId, logoUrl, palette, fonts)`

**Usage**:
```typescript
await supabase.rpc('sync_brand_kit', {
  p_org_id: orgId,
  p_logo_url: logoUrl,
  p_palette: { primary: '#2742FF', secondary: '#F8F9FA' }
});
```

---

#### 4. Deliverables Registered ✅
**Files**:
- `supabase/migrations/20251013_suite_integration.sql` (deliverables table)
- `supabase/functions/deliverables-register/index.ts`

- New `deliverables` table for catalog of outputs
- Registers published sites, exports, assets
- Cross-app discovery and reuse
- RPC: `register_deliverable(orgId, app, kind, label, url, refId, tags)`

**Usage**:
```typescript
await supabase.rpc('register_deliverable', {
  p_org_id: orgId,
  p_app: 'website',
  p_kind: 'published_site',
  p_label: 'Acme — Oct Launch',
  p_url: 'https://acme.netlify.app',
  p_ref_id: siteId,
  p_tags: ['website', 'published']
});
```

---

#### 5. Event Emissions (Suite Bus) ✅
**File**: `src/lib/suiteBus.ts`

- Emits structured events to HUB_URL
- Events include: `site.generated`, `site.published`, `product.created`, `brand.updated`
- HMAC-SHA256 signed for verification
- Consumed by other apps for integration workflows

**Usage**:
```typescript
await emitSitePublished({
  orgId,
  userId,
  siteId,
  url: liveUrl,
  pages: ['Home', 'About', 'Pricing'],
  brand: { logo, palette },
  correlationId: 'PUB-123'
});
```

---

#### 6. "Send to..." Actions ✅
**File**: `src/components/website/SendToMenu.tsx`

- 1-click deeplinks to other apps with context
- "Open in Newsletter" → prefills logo, palette, site URL
- "Post to Social" → prefills site URL
- "Create Promo Images" → prefills logo, palette
- "Create Ads Campaign" → prefills all brand assets

**Usage in Preview Page**:
```tsx
<SendToMenu
  siteId={siteId}
  siteUrl={liveUrl}
  brandAssets={{ logo, palette }}
/>
```

---

### Bonus: Cost Preview API ✅
**File**: `supabase/functions/credits-preview/index.ts`

- Endpoint: `POST /api/credits/preview`
- Input: `{ action, params }`
- Output: `{ credits, usd, tokens, priceQuoteId, ttl }`
- Used for inline cost UI (future P2 item)

**Usage**:
```typescript
const preview = await fetch('/api/credits/preview', {
  method: 'POST',
  body: JSON.stringify({ action: 'ai_apply', params: { complexity: 'high' } })
});

// { credits: 15, usd: 0.06, tokens: 3000, ttl: 300 }
```

---

## Database Schema Changes

### New Tables (5)

1. **brand_assets** - Shared brand kit storage
2. **deliverables** - Catalog of published outputs
3. **audit_log** - High-impact action tracking
4. **support_tickets** - Dispute flow for refunds
5. *(Enhanced)* **credits_ledger** - 5 new columns

### New RPCs (7)

1. `sync_brand_kit` - Sync brand assets from Website Builder
2. `register_deliverable` - Register published outputs
3. `log_audit_event` - Log high-impact actions
4. `create_refund_entry` - Create credit refund
5. `create_dispute_ticket` - Handle credit disputes
6. `get_ledger_by_correlation_id` - Query ledger by correlationId
7. *(Existing)* `get_credit_balance` - Get current balance

---

## New Edge Functions (3)

1. **brand-kit-sync** - Sync brand assets to shared store
2. **deliverables-register** - Register deliverables in catalog
3. **credits-preview** - Cost estimation before operation

---

## File Changes

### New Files (7)
- `supabase/migrations/20251013_suite_integration.sql` - Complete schema
- `src/lib/creditsGuard.ts` - Credits guard with rollback
- `src/lib/suiteBus.ts` - Suite event emissions
- `src/components/website/SendToMenu.tsx` - Cross-app deeplinks
- `supabase/functions/brand-kit-sync/index.ts` - Brand sync function
- `supabase/functions/deliverables-register/index.ts` - Deliverables function
- `supabase/functions/credits-preview/index.ts` - Cost preview function

### Documentation (2)
- `INTEGRATION_GAP_ANALYSIS.md` - Complete gap analysis
- `SUITE_INTEGRATION_TEST_PLAN.md` - 8-test validation plan

---

## Testing Required

See `SUITE_INTEGRATION_TEST_PLAN.md` for complete test plan.

**P0 Tests** (Critical):
1. ✅ Simulate AI apply failure → refund entry created
2. ✅ Retry with same correlationId → 1 debit total
3. ✅ Publish success → debit with app/action/correlationId

**P1 Tests** (Suite Integration):
4. ✅ Logo upload → brand_assets row created
5. ✅ Publish → deliverable entry with URL
6. ✅ Export → deliverable entry with signed URL
7. ✅ Events arrive at HUB_URL with valid signature
8. ✅ "Send to..." links open with context

**Success Criteria**: All 8 tests pass → Mark **SUITE-READY** ✅

---

## Deployment Steps

### 1. Apply Migration
```bash
supabase db push
```

### 2. Deploy Functions
```bash
supabase functions deploy brand-kit-sync
supabase functions deploy deliverables-register
supabase functions deploy credits-preview
```

### 3. Verify Schema
```bash
psql $DATABASE_URL -c "\dt brand_assets deliverables audit_log"
psql $DATABASE_URL -c "\d credits_ledger"
```

### 4. Run Tests
Follow `SUITE_INTEGRATION_TEST_PLAN.md` to run all 8 tests.

### 5. Integrate into Existing Functions
Update these functions to use new features:

**website-ai-apply/index.ts**:
```typescript
import { withCreditsGuard } from '../../src/lib/creditsGuard.ts';

const result = await withCreditsGuard({
  orgId,
  credits: 10,
  correlationId,
  action: 'ai_apply'
}, async () => {
  // Existing AI apply logic
  return await performAIApply(params);
});
```

**website-publish/index.ts**:
```typescript
import { emitSitePublished } from '../../src/lib/suiteBus.ts';

// After publish succeeds
await emitSitePublished({ orgId, userId, siteId, url, pages, brand, correlationId });

await supabase.rpc('register_deliverable', {
  p_org_id: orgId,
  p_app: 'website',
  p_kind: 'published_site',
  p_label: `${siteName} — ${date}`,
  p_url: liveUrl,
  p_ref_id: siteId,
  p_tags: ['website', 'published']
});
```

**website-asset-upload/index.ts**:
```typescript
// After logo upload and palette extraction
await supabase.rpc('sync_brand_kit', {
  p_org_id: orgId,
  p_site_id: siteId,
  p_logo_url: uploadedUrl,
  p_palette: extractedPalette
});
```

---

## Integration Points

### Where to Add creditsGuard

**Before**:
```typescript
// Old: Direct debit without safety
await debitCredits(orgId, 10);
const result = await performAIApply(params);
```

**After**:
```typescript
// New: Automatic rollback on failure
const result = await withCreditsGuard({
  orgId,
  credits: 10,
  correlationId,
  action: 'ai_apply'
}, async () => {
  return await performAIApply(params);
});

if (!result.success) {
  // Credits already refunded automatically
  return { error: result.error };
}
```

---

### Where to Emit Suite Events

Add after successful operations:

1. **website-draft/index.ts**: `emitSiteGenerated()`
2. **website-publish/index.ts**: `emitSitePublished()`
3. **store-product-create/index.ts**: `emitProductCreated()`
4. **website-asset-upload/index.ts**: `emitBrandUpdated()`

---

### Where to Register Deliverables

Add after publish/export:

1. **website-publish/index.ts**: Register published_site
2. **website-export/index.ts**: Register export_zip

---

### Where to Sync Brand Kit

Add after logo upload and palette extraction:

1. **website-asset-upload/index.ts**: After upload completes
2. **website-ai-apply/index.ts**: After palette extraction

---

## Summary

**Implemented**: 6/6 critical items (P0 + P1)  
**Testing**: 8-test plan ready to run  
**Deployment**: Migration + 3 functions  
**Integration**: 5 existing functions need updates  

**Next Steps**:
1. Apply migration
2. Deploy functions
3. Run test plan
4. Integrate into existing functions
5. Mark SUITE-READY ✅

---

## Files to Review

**Core Implementation**:
- `supabase/migrations/20251013_suite_integration.sql`
- `src/lib/creditsGuard.ts`
- `src/lib/suiteBus.ts`

**Edge Functions**:
- `supabase/functions/brand-kit-sync/index.ts`
- `supabase/functions/deliverables-register/index.ts`
- `supabase/functions/credits-preview/index.ts`

**UI Component**:
- `src/components/website/SendToMenu.tsx`

**Documentation**:
- `INTEGRATION_GAP_ANALYSIS.md` - Gap analysis with priorities
- `SUITE_INTEGRATION_TEST_PLAN.md` - 8-test validation plan
- `SUITE_READY_IMPLEMENTATION.md` - This document

---

**Status**: ✅ Implementation complete → Ready for testing → Suite-ready pending validation
