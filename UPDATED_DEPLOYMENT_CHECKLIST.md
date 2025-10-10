# Website Builder - Updated Deployment Checklist (With Plugin Architecture)

## ✅ Pre-Deployment Complete

- [x] Core-mini framework created (6 files, 506 lines)
- [x] Plugin manifest created (/.well-known/craudiovizai-plugin.json)
- [x] Plugin endpoints created (_plugin-dispatch, _plugin-health)
- [x] Brand tokens export function added
- [x] All edge functions updated
- [x] Frontend builds successfully (316.71 kB)
- [x] Documentation complete

---

## 🔐 Step 1: Set Secrets

### Required Secrets
```bash
# Runtime mode
supabase secrets set VITE_RUNTIME_MODE="cloud"

# CAPTCHA (choose one)
supabase secrets set CAPTCHA_PROVIDER="none"
# OR
# supabase secrets set CAPTCHA_PROVIDER="hcaptcha"
# supabase secrets set HCAPTCHA_SECRET="..."
# OR
# supabase secrets set CAPTCHA_PROVIDER="recaptcha"
# supabase secrets set RECAPTCHA_SECRET="..."
```

### NEW: AI Provider Secrets (Required for Draft Function)

**Choose at least ONE of these:**

```bash
# Option A: Javari (recommended, tried first)
supabase secrets set JAVARI_API_URL="https://javari.ai/v1"
supabase secrets set JAVARI_API_KEY="your-javari-key"

# Option B: OpenAI (fallback)
supabase secrets set OPENAI_API_KEY="sk-..."

# Option C: Anthropic (final fallback)
supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
```

AI router will try in order: Javari → OpenAI → Anthropic

### Optional Secrets
```bash
# Hub integration
supabase secrets set HUB_URL="https://hub.example.com"
supabase secrets set HUB_SIGNING_KEY="$(openssl rand -hex 32)"

# Tracking
supabase secrets set TRACKING_DOMAIN="track.example.com"

# Deploy adapters
supabase secrets set VERCEL_TOKEN="..."
supabase secrets set NETLIFY_TOKEN="..."
```

### Verify
```bash
supabase secrets list
```

- [ ] Secrets configured
- [ ] AI provider configured (at least one)

---

## 🚀 Step 2: Deploy Functions

### NEW: 8 Functions (Added 3)

```bash
cd /tmp/cc-agent/58267613/project

supabase functions deploy \
  website-draft \
  website-regenerate \
  website-publish \
  website-export \
  website-form-submit \
  website-brand-tokens-export \
  _plugin-dispatch \
  _plugin-health
```

**New functions:**
- `website-brand-tokens-export` - Export brand tokens (0 cr)
- `_plugin-dispatch` - Receive cross-app events
- `_plugin-health` - Liveness check

- [ ] All 8 functions deployed
- [ ] No deployment errors

---

## 🧪 Step 3: Plugin Integration Tests (NEW)

### Test 1: Manifest Discovery
```bash
curl https://your-website-app/.well-known/craudiovizai-plugin.json
```

**Expected:** JSON manifest with tool_key: "website"

- [ ] Manifest returns 200
- [ ] Contains tool_key, version, capabilities, events_produced

---

### Test 2: Health Check
```bash
curl https://your-website-app/_plugin/health
```

**Expected:**
```json
{
  "ok": true,
  "tool_key": "website",
  "version": "1.0.0",
  "timestamp": "..."
}
```

- [ ] Health endpoint returns 200
- [ ] Response contains ok: true

---

### Test 3: Plugin Dispatch
```bash
curl -X POST https://your-website-app/_plugin/dispatch \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: test-123" \
  -d '{
    "source_tool": "newsletter",
    "event_type": "newsletter.campaign.sent",
    "payload": {"campaign_id": "123", "subject": "Test"},
    "request_id": "test-123",
    "org_id": "test-org"
  }'
```

**Expected:**
```json
{
  "ok": true,
  "handled": true,
  "data": {"message": "Newsletter event received..."},
  "request_id": "test-123"
}
```

- [ ] Dispatch endpoint returns 200
- [ ] Response shows handled: true for newsletter.campaign.sent
- [ ] Request ID matches

---

### Test 4: Brand Tokens Export (JSON)
```bash
curl "https://your-website-app/website-brand-tokens-export?siteId=<SITE_ID>&format=json"
```

**Expected:** JSON with tokens, sbom, slsa, metadata

- [ ] Returns 200
- [ ] Contains tokens.colors, tokens.typography, tokens.spacing, tokens.motion
- [ ] Contains sbom (CycloneDX format)
- [ ] Contains slsa attestation

---

### Test 5: Brand Tokens Export (CSS)
```bash
curl "https://your-website-app/website-brand-tokens-export?siteId=<SITE_ID>&format=css"
```

**Expected:** CSS with :root variables

- [ ] Returns 200
- [ ] Content-Type: text/css
- [ ] Contains --color-primary-*, --font-family-*, --spacing-* variables

---

## 🔄 Step 4: Original Tests (Still Required)

Run all original tests from `FINAL_DEPLOYMENT_PACK.md`:

### Smoke Tests
- [ ] Draft (2cr) - Returns seo + blocks
- [ ] Regenerate (1cr) - Returns enhanced block
- [ ] Publish (2cr) - Creates deploy + asset
- [ ] Export (2cr) - Returns SBOM + SLSA
- [ ] Form submit (0cr) - Stores submission

### Acceptance Tests
- [ ] Idempotency - No double charge
- [ ] License gate - 403 in self_hosted
- [ ] Captcha - Works with none/hcaptcha/recaptcha
- [ ] Hub push - Disabled log OR successful push

---

## 📊 Step 5: Database Verification

Run these queries:

```sql
-- Platform RPCs (should return 6)
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name IN (
  'has_tool_entitlement', 'check_license_status', 'debit_credits',
  'emit_event', 'get_idempotency_result', 'store_idempotency_result'
);

-- Tables (should return 11)
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Recent credit transactions
SELECT action, amount, created_at FROM credit_transactions
ORDER BY created_at DESC LIMIT 10;

-- Recent events (check function logs if not stored)
-- Should see: website.site.draft.created, website.site.published, etc.
```

- [ ] 6 RPCs confirmed
- [ ] 11 tables confirmed
- [ ] Credit transactions correct
- [ ] Events emitted

---

## ✅ Final Checklist

### Plugin Architecture
- [ ] Manifest accessible at /.well-known/craudiovizai-plugin.json
- [ ] Health endpoint returns 200
- [ ] Dispatch endpoint handles events
- [ ] Brand tokens export works (JSON + CSS)
- [ ] All plugin tests passed

### Core Functionality
- [ ] All 8 functions deployed
- [ ] AI provider configured (Javari/OpenAI/Anthropic)
- [ ] Draft generates content via AI router
- [ ] All original smoke tests passed
- [ ] All acceptance tests passed
- [ ] Database queries verified

### Evidence Package
- [ ] Plugin test responses attached
- [ ] Brand tokens export samples (JSON + CSS) attached
- [ ] Original smoke test results attached
- [ ] SQL query results attached
- [ ] Function logs attached (events, Hub status)
- [ ] Screenshot of secrets list

---

## 🎉 Success Criteria

When all boxes checked:
- ✅ Website Builder is **PRODUCTION READY**
- ✅ Plugin architecture is **FULLY OPERATIONAL**
- ✅ Can integrate with Newsletter Builder and Logo Creator
- ✅ Ready to move to next tool

---

## 📦 Files Delivered (Updated)

### Edge Functions (8 total)
1. `website-draft` (315 lines)
2. `website-regenerate` (141 lines)
3. `website-publish` (239 lines)
4. `website-export` (245 lines)
5. `website-form-submit` (134 lines)
6. `website-brand-tokens-export` (221 lines) **NEW**
7. `_plugin-dispatch` (70 lines) **NEW**
8. `_plugin-health` (25 lines) **NEW**

### Core-Mini Framework (6 files, 506 lines) **NEW**
- env.ts, auth.ts, log.ts, ai-router.ts, tracking.ts, plugin.ts

### Plugin Infrastructure **NEW**
- `/.well-known/craudiovizai-plugin.json` - Manifest
- Dispatch + Health endpoints

### Documentation (9 files)
1. FINAL_DEPLOYMENT_PACK.md
2. ACCEPTANCE_CHECKLIST.md
3. RETURN_CHECKLIST.md
4. WHAT_I_CANNOT_COMPLETE.md
5. FINAL_SUMMARY.md
6. COMPLETION_REPORT.md
7. PLUGIN_ARCHITECTURE.md **NEW**
8. PLUGIN_COMPLETE.md **NEW**
9. UPDATED_DEPLOYMENT_CHECKLIST.md **NEW** (this file)

---

## 🚀 Quick Start

```bash
# 1. Set secrets (2-3 mins)
supabase secrets set VITE_RUNTIME_MODE="cloud"
supabase secrets set CAPTCHA_PROVIDER="none"
supabase secrets set JAVARI_API_KEY="..."  # or OpenAI/Anthropic

# 2. Deploy (3-4 mins)
cd /tmp/cc-agent/58267613/project
supabase functions deploy website-draft website-regenerate website-publish website-export website-form-submit website-brand-tokens-export _plugin-dispatch _plugin-health

# 3. Test plugin integration (5 mins)
curl https://your-app/.well-known/craudiovizai-plugin.json
curl https://your-app/_plugin/health
curl -X POST https://your-app/_plugin/dispatch -d '{...}'
curl "https://your-app/website-brand-tokens-export?siteId=...&format=json"

# 4. Test core functionality (10 mins)
# Run original smoke + acceptance tests

# 5. Return checklist ✅
```

**Total Time: 20-25 minutes**

---

## 📚 Next Steps

Once deployed and tested:

1. **Logo Creator** - Use same core-mini framework + plugin pattern
2. **Newsletter Builder** - Listen for website.site.published, use brand tokens
3. **Universal Dashboard** - Discover all tools via manifests

**Website Builder is the foundation. Other tools follow the same pattern.**
