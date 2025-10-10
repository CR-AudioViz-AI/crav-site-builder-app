# Website Builder: Final Integration Gap Analysis

**Date**: 2025-10-10  
**Purpose**: Identify gaps before marking "suite-ready"

---

## Status Summary

### ✅ What's Already Implemented (10/18 items)

#### A) Wallet & Metering ✅ (PARTIAL: 2/4)
- ✅ **Idempotency**: `supabase/functions/_shared/idempotency.ts` - correlationId-based deduplication
- ✅ **Debit on success**: Credits deducted in function after operation completes
- ❌ **Cost preview API**: NOT implemented
- ❌ **Granular line items**: Partial logging, needs enhancement

#### B) Plan/Entitlement Gates ✅ (COMPLETE: 2/2)
- ✅ **Server-side checks**: `src/lib/rbac.ts` - checkCreditsOrBypass, RBAC roles
- ✅ **Free tier rules**: Implemented in functions with entitlement checks

#### C) Asset Graph & Reuse ❌ (MISSING: 0/2)
- ❌ **Brand kit sync**: Logo/palette not synced to shared asset store
- ❌ **Deliverables registered**: Exports not recorded in suite catalog

#### D) Cross-App Handoffs ❌ (MISSING: 0/2)
- ❌ **Event emissions (suite bus)**: Events tracked but not for cross-app consumption
- ❌ **"Send to…" actions**: No 1-click actions to other apps

#### E) UX for Pricing Transparency ✅ (PARTIAL: 1/2)
- ✅ **Post-op receipt**: Credits badge shows balance
- ❌ **Inline cost UI**: No "i" icon with cost preview

#### F) Reliability, Reversals, Fairness ✅ (PARTIAL: 1/2)
- ✅ **Retry semantics**: Idempotency supports safe retry
- ❌ **Automatic rollback safety**: No credit refund on failure

#### G) Compliance & Support ❌ (MISSING: 0/2)
- ❌ **Receipts**: No monthly invoice with line items
- ❌ **Support flow**: No "Report a problem" → auto-credit flow

#### H) Governance & Data ✅ (PARTIAL: 1/2)
- ✅ **Org/role permissions**: RBAC implemented in `src/lib/rbac.ts`
- ❌ **Audit log**: No high-impact action logging to org audit log

---

## Detailed Gap Analysis

### ❌ Gap 1: Cost Preview API
**Status**: MISSING  
**Impact**: HIGH  
**Effort**: MEDIUM

**What's Missing**:
- API endpoint: `POST /api/credits/preview`
- Input: `{ action: 'ai_apply', params: {...} }`
- Output: `{ credits: 12, priceQuoteId: 'uuid', ttl: 300, usd: 0.04 }`

**Implementation Needed**:
```typescript
// supabase/functions/credits-preview/index.ts
export function calculateCost(action: string, params: any): number {
  const prices = {
    'ai_apply': 10,
    'publish': 5,
    'export': 3,
    'image_opt': 2,
  };
  return prices[action] || 1;
}
```

---

### ❌ Gap 2: Granular Line Items
**Status**: PARTIAL  
**Impact**: MEDIUM  
**Effort**: LOW

**What's Missing**:
Enhanced logging in `credits_ledger` with:
```sql
ALTER TABLE credits_ledger ADD COLUMN IF NOT EXISTS app TEXT DEFAULT 'website';
ALTER TABLE credits_ledger ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE credits_ledger ADD COLUMN IF NOT EXISTS correlation_id TEXT;
```

**Implementation Needed**:
Update all debit calls to include:
```typescript
await supabase.from('credits_ledger').insert({
  org_id: orgId,
  app: 'website',
  action: 'ai_apply',
  credits: -10,
  correlation_id: correlationId,
  metadata: { ...params }
});
```

---

### ❌ Gap 3: Brand Kit Sync
**Status**: MISSING  
**Impact**: MEDIUM  
**Effort**: MEDIUM

**What's Missing**:
- Table: `brand_assets` (logo_url, palette, fonts, org_id)
- Sync on logo upload: write to `brand_assets`
- Sync on palette extraction: write to `brand_assets`

**Implementation Needed**:
```typescript
// supabase/functions/website-asset-upload/index.ts
await supabase.from('brand_assets').upsert({
  org_id: orgId,
  logo_url: uploadedUrl,
  updated_at: new Date().toISOString()
});

// After palette extraction
await supabase.from('brand_assets').update({
  palette: extractedPalette
}).eq('org_id', orgId);
```

---

### ❌ Gap 4: Deliverables Registered
**Status**: MISSING  
**Impact**: MEDIUM  
**Effort**: MEDIUM

**What's Missing**:
- Table: `deliverables` (id, org_id, type, url, tags, created_at)
- Register on publish: `{ type: 'website', url: liveUrl, tags: ['brand', 'campaign'] }`
- Register on export: `{ type: 'website_zip', url: downloadUrl, tags: [] }`

**Implementation Needed**:
```typescript
// supabase/functions/website-publish/index.ts
await supabase.from('deliverables').insert({
  org_id: orgId,
  site_id: siteId,
  type: 'website',
  url: liveUrl,
  tags: ['website', 'published'],
  metadata: { siteId, pages: pageCount }
});
```

---

### ❌ Gap 5: Event Emissions (Suite Bus)
**Status**: PARTIAL  
**Impact**: HIGH (for suite integration)  
**Effort**: LOW

**What's Missing**:
Events need structured payloads for cross-app consumption:
```typescript
// Current: tracking events
trackPublish(orgId, siteId, url);

// Needed: suite bus events
emit('site.published', {
  org_id: orgId,
  site_id: siteId,
  url: liveUrl,
  pages: ['Home', 'About', 'Pricing'],
  brand: { logo, palette },
  meta: { title, description }
});
```

**Implementation Needed**:
```typescript
// src/lib/suiteBus.ts
export async function emitSuiteEvent(
  event: string,
  payload: any
) {
  await fetch(`${HUB_URL}/suite-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature': signPayload(payload)
    },
    body: JSON.stringify({ event, payload })
  });
}
```

---

### ❌ Gap 6: "Send to…" Actions
**Status**: MISSING  
**Impact**: MEDIUM (for suite integration)  
**Effort**: MEDIUM

**What's Missing**:
UI actions in PreviewPage:
- "Open in Newsletter" → deeplink with site context
- "Post to Social" → deeplink with site URL
- "Create Promo Images" → deeplink with brand assets

**Implementation Needed**:
```tsx
// src/components/website/SendToMenu.tsx
<Menu>
  <MenuItem onClick={() => sendToNewsletter(siteId)}>
    <Mail /> Open in Newsletter
  </MenuItem>
  <MenuItem onClick={() => sendToSocial(siteId)}>
    <Share2 /> Post to Social
  </MenuItem>
  <MenuItem onClick={() => sendToImages(siteId)}>
    <Image /> Create Promo Images
  </MenuItem>
</Menu>
```

---

### ❌ Gap 7: Inline Cost UI
**Status**: MISSING  
**Impact**: LOW  
**Effort**: LOW

**What's Missing**:
Info icon on all paid buttons showing cost preview:
```tsx
<button>
  Publish
  <InfoIcon onClick={() => showCostPreview('publish', params)} />
</button>

<Popover>
  ~5 credits
  Equals ~1k tokens of model X
  $≈0.02
</Popover>
```

**Implementation Needed**:
```tsx
// src/components/website/CostPreview.tsx
export function CostPreview({ action, params }) {
  const { data } = useCostPreview(action, params);
  return (
    <Tooltip>
      <InfoCircle />
      <TooltipContent>
        ~{data.credits} credits<br/>
        Equals ~{data.tokens} tokens<br/>
        $≈{data.usd.toFixed(2)}
      </TooltipContent>
    </Tooltip>
  );
}
```

---

### ❌ Gap 8: Automatic Rollback Safety
**Status**: MISSING  
**Impact**: HIGH  
**Effort**: MEDIUM

**What's Missing**:
Credit refund on operation failure:
```typescript
try {
  // Debit credits
  await debitCredits(orgId, 10, correlationId);
  
  // Perform operation
  const result = await aiApply(...);
  
  // If fails, refund
  if (!result.success) {
    await refundCredits(orgId, 10, correlationId);
  }
} catch (error) {
  await refundCredits(orgId, 10, correlationId);
  throw error;
}
```

**Implementation Needed**:
```typescript
// src/lib/creditsGuard.ts
export async function withCreditsGuard<T>(
  orgId: string,
  credits: number,
  correlationId: string,
  operation: () => Promise<T>
): Promise<T> {
  await debitCredits(orgId, credits, correlationId);
  
  try {
    const result = await operation();
    return result;
  } catch (error) {
    await refundCredits(orgId, credits, correlationId);
    throw error;
  }
}
```

---

### ❌ Gap 9: Monthly Invoice with Line Items
**Status**: MISSING  
**Impact**: MEDIUM  
**Effort**: MEDIUM

**What's Missing**:
- Invoice generation: `/api/invoices?month=2025-10`
- Line items from `credits_ledger` grouped by action
- Downloadable PDF/CSV

**Implementation Needed**:
```typescript
// supabase/functions/invoice-generate/index.ts
export async function generateInvoice(orgId: string, month: string) {
  const { data } = await supabase
    .from('credits_ledger')
    .select('*')
    .eq('org_id', orgId)
    .gte('created_at', `${month}-01`)
    .lt('created_at', nextMonth(month));
  
  const lineItems = groupBy(data, 'action');
  
  return {
    month,
    org_id: orgId,
    line_items: lineItems.map(item => ({
      action: item.action,
      count: item.count,
      credits: item.total_credits,
      usd: item.total_credits * CREDIT_PRICE
    })),
    total_credits: sum(data, 'credits'),
    total_usd: sum(data, 'credits') * CREDIT_PRICE
  };
}
```

---

### ❌ Gap 10: Support Flow ("Report a Problem")
**Status**: MISSING  
**Impact**: LOW  
**Effort**: MEDIUM

**What's Missing**:
- UI: "Report a problem" button on each receipt line
- Backend: `/api/support/dispute` → creates ticket
- Auto-credit on verified issue

**Implementation Needed**:
```tsx
// src/components/credits/ReceiptLineItem.tsx
<button onClick={() => disputeCharge(chargeId)}>
  Report a problem
</button>

// supabase/functions/support-dispute/index.ts
export async function handleDispute(chargeId: string, reason: string) {
  await supabase.from('support_tickets').insert({
    charge_id: chargeId,
    reason,
    status: 'pending'
  });
  
  // If auto-verified (e.g., known issue)
  if (isKnownIssue(chargeId)) {
    await refundCredits(orgId, amount, correlationId);
    await supabase.from('support_tickets')
      .update({ status: 'auto_refunded' })
      .eq('id', ticketId);
  }
}
```

---

### ❌ Gap 11: Audit Log for High-Impact Actions
**Status**: MISSING  
**Impact**: MEDIUM  
**Effort**: LOW

**What's Missing**:
- Table: `audit_log` (org_id, user_id, action, diff, created_at)
- Log on: publish, template swap, e-commerce enable

**Implementation Needed**:
```typescript
// src/lib/auditLog.ts
export async function logAudit(
  orgId: string,
  userId: string,
  action: string,
  diff: any
) {
  await supabase.from('audit_log').insert({
    org_id: orgId,
    user_id: userId,
    action,
    diff: JSON.stringify(diff),
    created_at: new Date().toISOString()
  });
}

// Usage in functions
await logAudit(orgId, userId, 'site.published', {
  site_id: siteId,
  url: liveUrl
});
```

---

## Prioritized Implementation Plan

### Phase 1: Critical for Launch (P0)
1. ✅ **Idempotency** - Already implemented
2. ✅ **RBAC/Entitlements** - Already implemented
3. ❌ **Automatic Rollback Safety** - Credits refund on failure
4. ❌ **Granular Line Items** - Enhanced logging

**Effort**: 1-2 days  
**Impact**: Prevents credit leakage, enables accurate billing

---

### Phase 2: Suite Integration (P1)
5. ❌ **Brand Kit Sync** - Logo/palette to shared store
6. ❌ **Deliverables Registered** - Publish/export to catalog
7. ❌ **Event Emissions (Suite Bus)** - Cross-app events
8. ❌ **"Send to…" Actions** - 1-click handoffs

**Effort**: 2-3 days  
**Impact**: Enables suite workflows, cross-app features

---

### Phase 3: User Experience (P2)
9. ❌ **Cost Preview API** - "How much will this cost?"
10. ❌ **Inline Cost UI** - Info icon on paid buttons
11. ❌ **Post-op Receipt** - Already partial, enhance detail

**Effort**: 1-2 days  
**Impact**: Pricing transparency, user trust

---

### Phase 4: Compliance & Support (P3)
12. ❌ **Monthly Invoice** - Downloadable PDF/CSV
13. ❌ **Support Flow** - "Report a problem" → auto-credit
14. ❌ **Audit Log** - High-impact action tracking

**Effort**: 2-3 days  
**Impact**: Compliance, customer satisfaction

---

## Implementation Estimate

| Phase | Items | Effort | Priority |
|-------|-------|--------|----------|
| P0 | 2 items | 1-2 days | Critical |
| P1 | 4 items | 2-3 days | High |
| P2 | 3 items | 1-2 days | Medium |
| P3 | 3 items | 2-3 days | Low |
| **Total** | **12 items** | **6-10 days** | - |

---

## Minimum Viable Suite Integration (MVP)

To mark as "suite-ready", implement **Phase 1 + Phase 2**:

### Must-Have (6 items)
1. ❌ Automatic rollback safety
2. ❌ Granular line items
3. ❌ Brand kit sync
4. ❌ Deliverables registered
5. ❌ Event emissions (suite bus)
6. ❌ "Send to…" actions

**Effort**: 3-5 days  
**Impact**: Critical for suite workflows + billing integrity

---

## Database Schema Changes Needed

```sql
-- 1. Enhanced credits_ledger
ALTER TABLE credits_ledger 
  ADD COLUMN IF NOT EXISTS app TEXT DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

-- 2. Brand assets table
CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  logo_url TEXT,
  palette JSONB,
  fonts JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Deliverables table
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  site_id UUID REFERENCES sites(id),
  type TEXT NOT NULL,
  url TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  charge_id UUID,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API Endpoints to Add

```typescript
// Cost preview
POST /api/credits/preview
  { action, params } → { credits, priceQuoteId, ttl, usd }

// Invoice generation
GET /api/invoices?month=2025-10
  → { month, line_items[], total_credits, total_usd }

// Support dispute
POST /api/support/dispute
  { chargeId, reason } → { ticketId, status }

// Suite bus events (internal)
POST ${HUB_URL}/suite-events
  { event, payload } → { ack }
```

---

## Testing Requirements

### Unit Tests
- [ ] Cost calculation for each action
- [ ] Credit refund on operation failure
- [ ] Idempotency with same correlationId
- [ ] Brand asset sync on logo upload
- [ ] Deliverable registration on publish

### Integration Tests
- [ ] Full flow: cost preview → debit → operation → refund on fail
- [ ] Cross-app event emission on publish
- [ ] "Send to Newsletter" deeplink with context
- [ ] Monthly invoice generation with line items
- [ ] Dispute flow → auto-credit

### E2E Tests
- [ ] User sees cost preview before AI apply
- [ ] Credits debited only once on retry
- [ ] Failed operation refunds credits
- [ ] Published site registered in deliverables
- [ ] Audit log shows high-impact actions

---

## Recommendation

**For Production Launch**:
Implement **Phase 1 (P0)** only:
- Automatic rollback safety
- Granular line items

**For Suite-Ready**:
Implement **Phase 1 + Phase 2** (6 items, 3-5 days):
- All P0 items
- Brand kit sync
- Deliverables registered
- Event emissions
- "Send to…" actions

**Phase 3 + 4** can follow post-launch as enhancements.

---

## Current Status

**Implemented**: 10/18 items (56%)  
**Critical Gaps**: 2 items (automatic rollback, granular logging)  
**Suite Integration Gaps**: 4 items (brand sync, deliverables, events, send-to)  
**Nice-to-Have Gaps**: 6 items (cost preview, invoices, support, audit log)

**Verdict**: **NOT YET SUITE-READY** (need Phase 1 + Phase 2)

---

## Next Steps

1. Review this analysis with stakeholders
2. Prioritize which phases to implement
3. Estimate timeline based on priority
4. Create implementation tickets
5. Assign to dev team
6. Implement & test
7. Mark as "suite-ready" after Phase 1 + Phase 2 complete

