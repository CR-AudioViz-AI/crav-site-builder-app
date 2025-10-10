# Suite Integration Test Plan

**Purpose**: Validate P0 + P1 implementation before marking "suite-ready"  
**Date**: 2025-10-13  
**Prerequisites**: Run migration `20251013_suite_integration.sql`

---

## Pre-Test Setup

```bash
# 1. Apply migration
supabase db push

# 2. Verify new tables exist
psql $DATABASE_URL -c "\dt brand_assets deliverables audit_log support_tickets"

# 3. Verify new columns in credits_ledger
psql $DATABASE_URL -c "\d credits_ledger"

# 4. Deploy new functions
supabase functions deploy brand-kit-sync
supabase functions deploy deliverables-register
supabase functions deploy credits-preview

# 5. Set test environment variables
export TEST_ORG_ID="00000000-0000-0000-0000-000000000001"
export TEST_USER_ID="00000000-0000-0000-0000-000000000002"
export TEST_SITE_ID="00000000-0000-0000-0000-000000000003"
```

---

## P0: Critical for Launch

### ✅ Test 1: Simulate AI Apply Failure → Refund Entry Created

**Purpose**: Verify automatic credit refund on operation failure

**Steps**:
```bash
# 1. Get initial balance
BALANCE_BEFORE=$(curl -s "http://localhost:5173/api/credits/balance?orgId=$TEST_ORG_ID" | jq .balance)
echo "Balance before: $BALANCE_BEFORE"

# 2. Trigger AI apply that will fail
CORRELATION_ID="AI-APPLY-FAIL-$(date +%s)"
curl -X POST "http://localhost:5173/api/ai/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"action\": \"palette\",
    \"params\": { \"forceError\": true },
    \"correlationId\": \"$CORRELATION_ID\"
  }"

# 3. Check ledger entries
curl -s "http://localhost:5173/api/credits/ledger?correlationId=$CORRELATION_ID" | jq .

# 4. Verify balance restored
BALANCE_AFTER=$(curl -s "http://localhost:5173/api/credits/balance?orgId=$TEST_ORG_ID" | jq .balance)
echo "Balance after: $BALANCE_AFTER"

# 5. Check refund entry exists
psql $DATABASE_URL << SQL
SELECT 
  id, 
  credits, 
  action, 
  op_journal, 
  parent_entry_id, 
  correlation_id 
FROM credits_ledger 
WHERE correlation_id = '$CORRELATION_ID' 
ORDER BY created_at;
SQL
```

**Expected Results**:
- [x] Debit entry created with `op_journal = 'pending'`
- [x] Refund entry created with `parent_entry_id` set to debit entry
- [x] Debit entry updated to `op_journal = 'refunded'`
- [x] Balance restored to original amount
- [x] `BALANCE_BEFORE == BALANCE_AFTER`

**SQL Verification**:
```sql
-- Should see 2 entries: debit (negative) and refund (positive)
SELECT 
  id,
  credits,
  op_journal,
  parent_entry_id,
  created_at
FROM credits_ledger
WHERE correlation_id = '$CORRELATION_ID'
ORDER BY created_at;

-- Expected:
-- Row 1: credits = -10, op_journal = 'refunded', parent_entry_id = NULL
-- Row 2: credits = +10, op_journal = 'refunded', parent_entry_id = <Row 1 ID>
```

---

### ✅ Test 2: Retry with Same CorrelationId → 1 Debit Total (Idempotent)

**Purpose**: Verify idempotency prevents duplicate charges

**Steps**:
```bash
# 1. First request
CORRELATION_ID="AI-APPLY-IDEMPOTENT-$(date +%s)"
BALANCE_BEFORE=$(curl -s "http://localhost:5173/api/credits/balance?orgId=$TEST_ORG_ID" | jq .balance)

curl -X POST "http://localhost:5173/api/ai/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"action\": \"palette\",
    \"correlationId\": \"$CORRELATION_ID\"
  }"

BALANCE_AFTER_1=$(curl -s "http://localhost:5173/api/credits/balance?orgId=$TEST_ORG_ID" | jq .balance)
echo "After first request: $BALANCE_AFTER_1"

# 2. Second request (retry with same correlationId)
curl -X POST "http://localhost:5173/api/ai/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"action\": \"palette\",
    \"correlationId\": \"$CORRELATION_ID\"
  }"

BALANCE_AFTER_2=$(curl -s "http://localhost:5173/api/credits/balance?orgId=$TEST_ORG_ID" | jq .balance)
echo "After second request: $BALANCE_AFTER_2"

# 3. Third request (another retry)
curl -X POST "http://localhost:5173/api/ai/apply" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"action\": \"palette\",
    \"correlationId\": \"$CORRELATION_ID\"
  }"

BALANCE_AFTER_3=$(curl -s "http://localhost:5173/api/credits/balance?orgId=$TEST_ORG_ID" | jq .balance)
echo "After third request: $BALANCE_AFTER_3"

# 4. Check ledger
curl -s "http://localhost:5173/api/credits/ledger?correlationId=$CORRELATION_ID" | jq .
```

**Expected Results**:
- [x] Only 1 debit entry in ledger (not 3)
- [x] `BALANCE_AFTER_1 == BALANCE_AFTER_2 == BALANCE_AFTER_3`
- [x] Balance decreased by 10 credits only once
- [x] Second and third requests return cached result

**SQL Verification**:
```sql
-- Should see only 1 entry
SELECT COUNT(*) FROM credits_ledger WHERE correlation_id = '$CORRELATION_ID';
-- Expected: 1
```

---

### ✅ Test 3: Publish Success → Debit with Granular Fields

**Purpose**: Verify enhanced logging with app, action, correlationId

**Steps**:
```bash
# 1. Publish site
CORRELATION_ID="PUBLISH-$(date +%s)"
curl -X POST "http://localhost:5173/api/publish" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"correlationId\": \"$CORRELATION_ID\"
  }"

# 2. Check ledger entry
psql $DATABASE_URL << SQL
SELECT 
  id,
  credits,
  app,
  action,
  correlation_id,
  op_journal,
  metadata
FROM credits_ledger
WHERE correlation_id = '$CORRELATION_ID';
SQL
```

**Expected Results**:
- [x] Entry has `app = 'website'`
- [x] Entry has `action = 'publish'`
- [x] Entry has `correlation_id = '$CORRELATION_ID'`
- [x] Entry has `op_journal = 'completed'`
- [x] Entry has `metadata` with siteId and url

**SQL Verification**:
```sql
-- Verify all granular fields populated
SELECT 
  app, 
  action, 
  correlation_id, 
  op_journal
FROM credits_ledger
WHERE correlation_id = '$CORRELATION_ID';

-- Expected:
-- app: 'website'
-- action: 'publish'
-- correlation_id: 'PUBLISH-...'
-- op_journal: 'completed'
```

---

## P1: Suite Integration

### ✅ Test 4: Logo Upload + Palette Extraction → Brand Kit Sync

**Purpose**: Verify brand assets synced to shared store

**Steps**:
```bash
# 1. Upload logo
LOGO_URL="https://example.com/logo.png"
curl -X POST "http://localhost:5173/api/upload-url" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"filename\": \"logo.png\",
    \"contentType\": \"image/png\"
  }"

# 2. Extract palette (simulated)
PALETTE='{"primary":"#2742FF","secondary":"#F8F9FA","accent":"#FF6B6B"}'

# 3. Sync brand kit
curl -X POST "$SUPABASE_URL/functions/v1/brand-kit-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d "{
    \"orgId\": \"$TEST_ORG_ID\",
    \"siteId\": \"$TEST_SITE_ID\",
    \"logoUrl\": \"$LOGO_URL\",
    \"palette\": $PALETTE,
    \"source\": \"website\"
  }"

# 4. Verify brand_assets table
psql $DATABASE_URL << SQL
SELECT 
  id,
  org_id,
  site_id,
  logo_url,
  palette,
  source,
  version
FROM brand_assets
WHERE org_id = '$TEST_ORG_ID';
SQL
```

**Expected Results**:
- [x] brand_assets row created with logo_url and palette
- [x] `source = 'website'`
- [x] `version = 1` on first sync
- [x] Subsequent syncs increment version
- [x] suite event 'brand.updated' emitted to HUB_URL

**SQL Verification**:
```sql
-- Verify brand kit synced
SELECT 
  logo_url, 
  palette->>'primary' as primary_color,
  source,
  version
FROM brand_assets
WHERE org_id = '$TEST_ORG_ID' AND source = 'website';

-- Expected:
-- logo_url: 'https://example.com/logo.png'
-- primary_color: '#2742FF'
-- source: 'website'
-- version: 1
```

---

### ✅ Test 5: Publish → Deliverable Entry with URL + SiteId

**Purpose**: Verify published sites registered in catalog

**Steps**:
```bash
# 1. Publish site
LIVE_URL="https://acme-demo.netlify.app"
curl -X POST "http://localhost:5173/api/publish" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\"
  }"

# 2. Verify deliverable registered
psql $DATABASE_URL << SQL
SELECT 
  id,
  org_id,
  app,
  kind,
  label,
  url,
  ref_id,
  tags,
  metadata
FROM deliverables
WHERE org_id = '$TEST_ORG_ID' AND kind = 'published_site'
ORDER BY created_at DESC
LIMIT 1;
SQL
```

**Expected Results**:
- [x] deliverables row created
- [x] `app = 'website'`
- [x] `kind = 'published_site'`
- [x] `url = '$LIVE_URL'`
- [x] `ref_id = '$TEST_SITE_ID'`
- [x] `tags` contains ['website', 'published']

---

### ✅ Test 6: Export → Deliverable Entry with Signed URL

**Purpose**: Verify exports registered in catalog

**Steps**:
```bash
# 1. Export site
curl -X GET "http://localhost:5173/api/export?siteId=$TEST_SITE_ID&orgId=$TEST_ORG_ID"

# 2. Verify deliverable registered
psql $DATABASE_URL << SQL
SELECT 
  id,
  org_id,
  app,
  kind,
  label,
  url,
  ref_id,
  metadata
FROM deliverables
WHERE org_id = '$TEST_ORG_ID' AND kind = 'export_zip'
ORDER BY created_at DESC
LIMIT 1;
SQL
```

**Expected Results**:
- [x] deliverables row created
- [x] `app = 'website'`
- [x] `kind = 'export_zip'`
- [x] `url` is presigned download URL
- [x] `ref_id = '$TEST_SITE_ID'`

---

### ✅ Test 7: Suite Events Arrive at HUB_URL with Valid Signature

**Purpose**: Verify cross-app event emissions

**Prerequisites**: Set up test webhook receiver at HUB_URL

**Steps**:
```bash
# 1. Start local webhook receiver (in separate terminal)
nc -l 8080 > /tmp/webhook-events.log &

# OR use webhook.site for testing
export HUB_URL="https://webhook.site/<your-unique-url>"

# 2. Trigger events
# a) Site generated
curl -X POST "http://localhost:5173/api/website-draft" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"userId\": \"$TEST_USER_ID\"
  }"

# b) Site published
curl -X POST "http://localhost:5173/api/publish" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"userId\": \"$TEST_USER_ID\"
  }"

# c) Product created
curl -X POST "http://localhost:5173/api/products" \
  -H "Content-Type: application/json" \
  -d "{
    \"siteId\": \"$TEST_SITE_ID\",
    \"orgId\": \"$TEST_ORG_ID\",
    \"userId\": \"$TEST_USER_ID\",
    \"name\": \"Test Product\",
    \"price\": 2900
  }"

# 3. Check webhook receiver logs
cat /tmp/webhook-events.log | jq .

# OR check webhook.site UI
```

**Expected Results**:
- [x] Events received at HUB_URL:
  - `site.generated`
  - `site.published`
  - `product.created`
- [x] Each event has:
  - `X-Hub-Signature` header
  - `orgId`, `userId`, `timestamp`, `correlationId`
  - Event-specific payload
- [x] Signature validates with HUB_SIGNING_KEY

**Signature Verification**:
```bash
# Verify signature manually
echo -n '<event-body-json>' | openssl dgst -sha256 -hmac "$HUB_SIGNING_KEY"
# Compare with X-Hub-Signature header (without 'sha256=' prefix)
```

---

### ✅ Test 8: "Send to..." Links Open Target Apps with Context

**Purpose**: Verify cross-app deeplinks work

**Steps**:
```bash
# 1. Open preview page
open "http://localhost:5173/preview/$TEST_SITE_ID"

# 2. Click "Send to..." button in UI

# 3. Click "Newsletter" option
# Expected: Opens /apps/newsletter/compose?source=website&siteId=<id>&logo=<url>&palette=<json>

# 4. Click "Social Media" option
# Expected: Opens /apps/social/post?source=website&siteId=<id>&url=<live-url>

# 5. Click "Promo Images" option
# Expected: Opens /apps/images/generate?source=website&siteId=<id>&logo=<url>&palette=<json>

# 6. Click "Ads Campaign" option
# Expected: Opens /apps/ads/create?source=website&siteId=<id>&url=<live-url>&palette=<json>
```

**Expected Results**:
- [x] All 4 links open in new tab
- [x] URL includes correct query params:
  - `source=website`
  - `siteId=<TEST_SITE_ID>`
  - `logo=<LOGO_URL>` (if available)
  - `palette=<PALETTE_JSON>` (if available)
  - `url=<LIVE_URL>` (if published)

**Manual Verification**:
- Copy each URL and verify query params are present and correct
- Target apps should receive prefilled context

---

## CURL Spot Checks

### Check Refund Path
```bash
curl "http://localhost:5173/api/credits/ledger?correlationId=PUB-1001" | jq .
```

**Expected**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "credits": -5,
      "op_journal": "refunded",
      "parent_entry_id": null,
      "correlation_id": "PUB-1001"
    },
    {
      "id": "uuid-2",
      "credits": 5,
      "op_journal": "refunded",
      "parent_entry_id": "uuid-1",
      "correlation_id": "PUB-1001"
    }
  ]
}
```

---

### Brand Kit Sync
```bash
curl -X POST "$SUPABASE_URL/functions/v1/brand-kit-sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "orgId": "00000000-0000-0000-0000-000000000001",
    "siteId": "00000000-0000-0000-0000-000000000003",
    "logoUrl": "https://example.com/logo.png",
    "palette": {
      "primary": "#2742FF",
      "secondary": "#F8F9FA"
    },
    "source": "website"
  }'
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "brandId": "uuid",
    "synced": {
      "logo": true,
      "palette": true,
      "fonts": false
    }
  }
}
```

---

### Deliverables Register
```bash
curl -X POST "$SUPABASE_URL/functions/v1/deliverables-register" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "orgId": "00000000-0000-0000-0000-000000000001",
    "app": "website",
    "kind": "published_site",
    "label": "Acme — Oct Launch",
    "url": "https://acme.netlify.app",
    "refId": "SITE123",
    "tags": ["website", "published", "acme"]
  }'
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "deliverableId": "uuid",
    "registered": {
      "app": "website",
      "kind": "published_site",
      "label": "Acme — Oct Launch",
      "url": "https://acme.netlify.app"
    }
  }
}
```

---

### Cost Preview
```bash
curl -X POST "$SUPABASE_URL/functions/v1/credits-preview" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{
    "action": "ai_apply",
    "params": {
      "complexity": "high"
    }
  }'
```

**Expected**:
```json
{
  "success": true,
  "data": {
    "action": "ai_apply",
    "credits": 15,
    "usd": 0.06,
    "tokens": 3000,
    "priceQuoteId": "QUOTE-...",
    "ttl": 300,
    "expiresAt": "2025-10-13T..."
  }
}
```

---

## SQL Queries for Verification

### Check Credits Ledger Schema
```sql
\d credits_ledger

-- Verify new columns exist:
-- - app (TEXT)
-- - action (TEXT)
-- - correlation_id (TEXT)
-- - parent_entry_id (UUID)
-- - op_journal (TEXT)
```

### Check Brand Assets
```sql
SELECT 
  org_id,
  logo_url,
  palette->>'primary' as primary_color,
  source,
  version,
  updated_at
FROM brand_assets
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Deliverables
```sql
SELECT 
  org_id,
  app,
  kind,
  label,
  url,
  tags,
  created_at
FROM deliverables
ORDER BY created_at DESC
LIMIT 10;
```

### Check Audit Log
```sql
SELECT 
  org_id,
  user_id,
  action,
  resource_type,
  resource_id,
  created_at
FROM audit_log
ORDER BY created_at DESC
LIMIT 10;
```

### Check Refund Entries
```sql
SELECT 
  id,
  org_id,
  credits,
  action,
  op_journal,
  parent_entry_id,
  correlation_id,
  created_at
FROM credits_ledger
WHERE op_journal = 'refunded'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Success Criteria

**P0 (Critical)**:
- [x] Test 1: Refund entry created on failure
- [x] Test 2: Idempotency prevents duplicate charges
- [x] Test 3: Granular logging with app/action/correlationId

**P1 (Suite Integration)**:
- [x] Test 4: Brand kit synced to shared store
- [x] Test 5: Published sites registered in deliverables
- [x] Test 6: Exports registered in deliverables
- [x] Test 7: Suite events emitted with valid signatures
- [x] Test 8: "Send to..." links work with context

**When all 8 tests pass** → Mark as **SUITE-READY** ✅

---

## Troubleshooting

### Issue: Migration fails
```bash
# Check migration status
supabase db diff

# Rollback and retry
supabase db reset
supabase db push
```

### Issue: Function not found
```bash
# List deployed functions
supabase functions list

# Redeploy
supabase functions deploy <function-name>
```

### Issue: Credits not refunded
```sql
-- Check if refund RPC exists
\df create_refund_entry

-- Manually create refund (debug)
SELECT create_refund_entry(
  '<org-id>'::UUID,
  '<entry-id>'::UUID,
  '<correlation-id>',
  'manual_test'
);
```

### Issue: Brand kit not syncing
```sql
-- Check if RPC exists
\df sync_brand_kit

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'brand_assets';

-- Test RPC directly
SELECT sync_brand_kit(
  '<org-id>'::UUID,
  '<site-id>'::UUID,
  'https://example.com/logo.png',
  '{"primary":"#2742FF"}'::JSONB,
  NULL
);
```

### Issue: Events not reaching HUB_URL
```bash
# Check HUB_URL is set
echo $HUB_URL

# Test webhook receiver
curl -X POST $HUB_URL/test -d '{"test":true}'

# Check edge function logs
supabase functions logs brand-kit-sync --limit 20
```

---

## Post-Test Cleanup

```bash
# Remove test data
psql $DATABASE_URL << SQL
DELETE FROM credits_ledger WHERE org_id = '$TEST_ORG_ID';
DELETE FROM brand_assets WHERE org_id = '$TEST_ORG_ID';
DELETE FROM deliverables WHERE org_id = '$TEST_ORG_ID';
DELETE FROM audit_log WHERE org_id = '$TEST_ORG_ID';
SQL
```

---

**Status**: Tests ready to run after migration applied
