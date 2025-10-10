# Website Builder - Deployment Guide

## ✅ What's Complete

### 1. Code Complete ✅
All edge functions updated with:
- ✅ Entitlement checks (`has_tool_entitlement`)
- ✅ License validation for self-hosted mode
- ✅ Credit debiting with idempotency
- ✅ Event emission to platform event bus
- ✅ Hub push integration (no-ops gracefully if disabled)

### 2. Database Complete ✅
- ✅ All 11 tables created and RLS enabled
- ✅ Platform RPCs deployed (6 functions)
- ✅ Newsletter tables successfully dropped
- ✅ Idempotency caching infrastructure ready

### 3. Frontend Complete ✅
- ✅ Build passes: `316.71 kB bundle`
- ✅ No newsletter dependencies
- ✅ No ESP dependencies
- ✅ TypeScript compiles successfully

---

## ⚠️ What Needs Deployment

### Edge Functions Requiring Redeployment

The following 4 functions have been updated locally but need to be deployed to Supabase:

1. **website-draft** (2 credits)
   - Location: `/supabase/functions/website-draft/index.ts`
   - Added: Entitlement, license, idempotency, debit, events

2. **website-regenerate** (1 credit)
   - Location: `/supabase/functions/website-regenerate/index.ts`
   - Added: License check for self-hosted

3. **website-publish** (2 credits)
   - Location: `/supabase/functions/website-publish/index.ts`
   - Added: License check, Hub push on asset.created

4. **website-export** (2 credits)
   - Location: `/supabase/functions/website-export/index.ts`
   - Added: License check, Hub push on asset.created

---

## 🚀 Deployment Options

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Project → Edge Functions
2. For each function above:
   - Click on the function name
   - Replace contents with the updated code from the file locations above
   - Click "Deploy"

### Option 2: Supabase CLI

```bash
# Login first
supabase login

# Deploy all 4 functions at once
cd /tmp/cc-agent/58267613/project
supabase functions deploy website-draft
supabase functions deploy website-regenerate
supabase functions deploy website-publish
supabase functions deploy website-export
```

### Option 3: CI/CD Pipeline

Add to your deployment pipeline:
```yaml
- name: Deploy Edge Functions
  run: |
    supabase functions deploy website-draft
    supabase functions deploy website-regenerate
    supabase functions deploy website-publish
    supabase functions deploy website-export
```

---

## 📋 Platform RPC Functions (Already Deployed ✅)

The following database functions are already deployed and working:

| Function | Purpose | Status |
|----------|---------|--------|
| `has_tool_entitlement(org_id, tool)` | Check tool access | ✅ Deployed |
| `check_license_status()` | Validate license | ✅ Deployed |
| `debit_credits(...)` | Debit org credits | ✅ Deployed |
| `emit_event(...)` | Emit platform events | ✅ Deployed |
| `get_idempotency_result(...)` | Get cached result | ✅ Deployed |
| `store_idempotency_result(...)` | Store cached result | ✅ Deployed |

---

## 🧪 Acceptance Tests (Run After Deployment)

### Test 1: Draft Generation (2 credits)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/website-draft" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-draft-$(date +%s)" \
  -d '{
    "siteId": "your-site-id",
    "page": {"kind": "home", "path": "/", "lang": "en"},
    "brief": {
      "businessName": "Test Co",
      "industry": "Tech",
      "offerings": ["Software"],
      "differentiators": ["Quality"],
      "targetAudience": "Developers",
      "tone": "Professional",
      "goals": ["Growth"],
      "strictness": "moderate"
    }
  }'
```

**Expected:**
- ✅ Returns `{seo, blocks}` JSON
- ✅ Event `ai.website.draft.created` in event_bus (check logs)
- ✅ 2 credits debited from credit_transactions table
- ✅ Result cached in idempotency_results table

### Test 2: Idempotency (No additional charge)
```bash
# Run the same curl command again with the SAME X-Idempotency-Key
# Expected: Returns cached result, no additional credit debit
```

### Test 3: Entitlement Check (403)
```bash
# Modify has_tool_entitlement to return false
# Expected: 403 response with "entitlement_required"
```

### Test 4: License Check (self-hosted only)
```bash
# Set VITE_RUNTIME_MODE=self_hosted
# Modify check_license_status to return invalid
# Expected: 403 response with "license_invalid"
```

### Test 5: Publish (2 credits)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/website-publish" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-publish-$(date +%s)" \
  -d '{
    "siteId": "your-site-id",
    "provider": "vercel",
    "domain": "example.com"
  }'
```

**Expected:**
- ✅ Returns `{url, deployId, assetId}`
- ✅ Row in `deploys` table
- ✅ Row in `media_assets` table (kind='codebundle')
- ✅ Event `website.page.published` emitted
- ✅ Event `asset.created` emitted
- ✅ Hub push attempted (or logged as disabled)

### Test 6: Export (2 credits)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/website-export" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: test-export-$(date +%s)" \
  -d '{
    "siteId": "your-site-id",
    "framework": "next"
  }'
```

**Expected:**
- ✅ Returns `{url, assetId, sbom, slsa}`
- ✅ SBOM includes React, Next.js, Tailwind
- ✅ SLSA attestation present
- ✅ Asset includes Dockerfile, Terraform, Helm references
- ✅ Event `asset.created` emitted
- ✅ Hub push attempted

---

## 🔐 Environment Variables

### Required (Website Builder Core)
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optional (Platform Integration)
```bash
HUB_URL=https://your-hub.com          # Hub push (no-ops if missing)
HUB_SIGNING_KEY=your-hub-key          # Hub auth
VITE_RUNTIME_MODE=cloud               # or 'self_hosted'
```

### Optional (Form CAPTCHA)
```bash
HCAPTCHA_SECRET=your-hcaptcha-secret  # If using hCaptcha
RECAPTCHA_SECRET=your-recaptcha       # If using reCAPTCHA
```

### NOT Required (Removed ✅)
```bash
# These are NO LONGER needed:
POSTMARK_TOKEN                        # ❌ Removed
SENDGRID_API_KEY                      # ❌ Removed
AWS_SES_*                             # ❌ Removed
TRACKING_DOMAIN                       # ❌ Removed
```

---

## 📊 Database Verification

### Check Platform RPCs
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'has_tool_entitlement',
    'check_license_status',
    'debit_credits',
    'emit_event',
    'get_idempotency_result',
    'store_idempotency_result'
  );
```

**Expected:** 6 functions returned

### Check Tables
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**Expected:** 11 tables (no newsletter tables)
- sites
- pages
- media_assets
- deploys
- form_submissions
- navigation_menus
- redirects
- blog_posts
- idempotency_results
- credit_transactions
- (no subscribers, campaigns, etc.)

---

## 🎯 Success Criteria

After deployment, verify:

- [ ] All 4 edge functions deploy successfully
- [ ] Draft returns JSON with seo + blocks
- [ ] Credits are debited correctly
- [ ] Idempotency prevents double-charging
- [ ] Entitlement check returns 403 when disabled
- [ ] License check returns 403 in self-hosted mode when invalid
- [ ] Publish creates deploy + asset records
- [ ] Export returns SBOM + SLSA attestation
- [ ] Events are emitted (check function logs)
- [ ] Hub push attempts (or cleanly skips if disabled)

---

## 📝 What I Cannot Complete

I cannot:
1. **Deploy edge functions** - Requires Supabase CLI authentication or dashboard access
2. **Run acceptance tests** - Requires deployed functions and test site/org data
3. **Verify Hub integration** - Requires actual Hub URL and credentials

---

## 🎉 Summary

**Everything is coded and ready.**

The Website Builder is architecturally complete:
- ✅ Newsletter fully decoupled
- ✅ All platform integration code written
- ✅ Database RPCs deployed
- ✅ Frontend builds successfully
- ✅ All 4 edge functions updated locally

**You just need to:**
1. Deploy the 4 edge functions using one of the options above
2. Run the acceptance tests
3. Verify Hub integration if enabled

**Estimated deployment time:** 5-10 minutes
