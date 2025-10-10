# Website Builder - Return Checklist (For Bolt/User)

## ✅ Pre-Deployment (COMPLETE - My Work)

- [x] Centralized env loader created (`_shared/env.ts`)
- [x] Hub guards implemented (no-op when disabled)
- [x] Captcha provider guards implemented (none/hcaptcha/recaptcha)
- [x] All 5 edge functions updated with platform integration
- [x] Platform RPCs deployed (6 database functions)
- [x] Frontend builds successfully (316.71 kB)
- [x] Newsletter fully decoupled (no ESP deps)
- [x] Documentation complete (6 markdown files)

---

## ⚠️ Deployment (REQUIRES YOUR ACTION)

### Secrets Configuration
- [ ] `supabase secrets set VITE_RUNTIME_MODE="cloud"`
- [ ] `supabase secrets set CAPTCHA_PROVIDER="none"` (or hcaptcha/recaptcha)
- [ ] Optional: HUB_URL and HUB_SIGNING_KEY set (if using Hub)
- [ ] `supabase secrets list` verified

### Function Deployment
- [ ] `website-draft` deployed successfully
- [ ] `website-regenerate` deployed successfully
- [ ] `website-publish` deployed successfully
- [ ] `website-export` deployed successfully
- [ ] `website-form-submit` deployed successfully
- [ ] No deployment errors in console

---

## 🧪 Smoke Tests (REQUIRES YOUR ACTION)

### Test 1: Draft (2 credits)
- [ ] Curl executed successfully
- [ ] Response contains `seo` object
- [ ] Response contains `blocks` array
- [ ] Event `ai.website.draft.created` in logs
- [ ] 2 credits debited in `credit_transactions` table

**Evidence Attached:**
- [ ] Response JSON
- [ ] SQL query result (credit_transactions)

### Test 2: Regenerate (1 credit)
- [ ] Curl executed successfully
- [ ] Block enhanced (contains "Enhanced")
- [ ] Event `website.block.regenerated` in logs
- [ ] 1 credit debited

**Evidence Attached:**
- [ ] Response JSON

### Test 3: Publish (2 credits)
- [ ] Curl executed successfully
- [ ] Response contains `url`, `deployId`, `assetId`
- [ ] Deploy record created in `deploys` table
- [ ] Asset record created in `media_assets` table (kind='codebundle')
- [ ] Events `website.page.published` + `asset.created` emitted
- [ ] Hub status logged: "[hub] disabled" OR successful push

**Evidence Attached:**
- [ ] Response JSON
- [ ] SQL query result (deploys)
- [ ] SQL query result (media_assets)
- [ ] Function logs (Hub status)

### Test 4: Export (2 credits)
- [ ] Curl executed successfully
- [ ] Response contains SBOM (CycloneDX format)
- [ ] Response contains SLSA attestation
- [ ] Asset created with SBOM in meta
- [ ] Event `asset.created` emitted
- [ ] Hub status logged

**Evidence Attached:**
- [ ] Response JSON with SBOM
- [ ] Response JSON with SLSA

### Test 5: Form Submit (0 credits)
- [ ] Curl executed successfully
- [ ] Response `{ok: true}`
- [ ] Form submission record in `form_submissions` table
- [ ] Events `contact.created` + `form.submitted` emitted

**Evidence Attached:**
- [ ] Response JSON
- [ ] SQL query result (form_submissions)

---

## 📋 Acceptance Tests (REQUIRES YOUR ACTION)

### Idempotency Test
- [ ] First draft call: Generates content, debits 2 credits
- [ ] Second draft call (same key): Returns cached result
- [ ] Second call: NO additional credit debit
- [ ] SQL confirms only 1 transaction for the idempotency key

**Evidence Attached:**
- [ ] Both response JSONs (identical)
- [ ] SQL count query result (shows 1, not 2)

### License Gate Test (Self-Hosted Mode)
- [ ] Set `VITE_RUNTIME_MODE="self_hosted"`
- [ ] Redeployed functions
- [ ] Test returns 403 error "license_invalid"
- [ ] Stored valid license
- [ ] Test succeeds after license fix
- [ ] Reset to `VITE_RUNTIME_MODE="cloud"`

**Evidence Attached:**
- [ ] 403 response JSON
- [ ] Success response after license fix

### Captcha Test
- [ ] CAPTCHA_PROVIDER=none: Form submit succeeds without token
- [ ] CAPTCHA_PROVIDER=hcaptcha with secret: Invalid token returns 400 "captcha_failed"
- [ ] Valid token succeeds

**Evidence Attached:**
- [ ] 400 error response
- [ ] Success response with valid token

### Hub Push Test
- [ ] Hub disabled: Logs show "[hub] disabled; skip push"
- [ ] Hub enabled: Logs show HTTP POST to Hub URL
- [ ] If Hub is real: Hub received event

**Evidence Attached:**
- [ ] Function logs showing Hub status
- [ ] Hub event receipt (if applicable)

---

## 📊 Database Verification (REQUIRES YOUR ACTION)

### Platform RPCs
- [ ] Query executed: 6 RPCs returned
- [ ] Functions: has_tool_entitlement, check_license_status, debit_credits, emit_event, get_idempotency_result, store_idempotency_result

**Evidence Attached:**
- [ ] SQL query result

### Tables
- [ ] Query executed: 11 tables returned
- [ ] No newsletter tables (no subscribers, campaigns, etc.)

**Evidence Attached:**
- [ ] SQL query result

### Credit Transactions
- [ ] Query executed: Recent transactions show draft, regenerate, publish, export
- [ ] Amounts are correct (2, 1, 2, 2)

**Evidence Attached:**
- [ ] SQL query result

### Events
- [ ] Function logs show all 6 event types emitted
- [ ] ai.website.draft.created, website.block.regenerated, website.page.published, asset.created, contact.created, form.submitted

**Evidence Attached:**
- [ ] Function logs or SQL query result (if events stored)

---

## 🎉 Final Sign-Off

### All Tests Passed
- [ ] All 5 smoke tests passed
- [ ] Idempotency verified
- [ ] License gate verified
- [ ] Captcha verified
- [ ] Hub push verified
- [ ] Database queries verified
- [ ] Frontend builds without errors
- [ ] No deployment errors

### Evidence Package Complete
- [ ] All response JSONs attached
- [ ] All SQL query results attached
- [ ] All function logs attached
- [ ] Screenshot of `supabase secrets list` attached

### Documentation Reviewed
- [ ] Read `FINAL_DEPLOYMENT_PACK.md`
- [ ] Read `ACCEPTANCE_CHECKLIST.md`
- [ ] Read `WHAT_I_CANNOT_COMPLETE.md`
- [ ] Read `FINAL_SUMMARY.md`

---

## ✅ When All Boxes Are Checked

**Website Builder is PRODUCTION READY** and green-lit to move to production.

**Next Tool:** Logo Creator or Newsletter Builder (standalone) using same platform patterns.

---

## 📦 Files Delivered

**Code (Ready to Deploy):**
1. `supabase/functions/_shared/env.ts` (28 lines)
2. `supabase/functions/website-draft/index.ts` (315 lines)
3. `supabase/functions/website-regenerate/index.ts` (141 lines)
4. `supabase/functions/website-publish/index.ts` (239 lines)
5. `supabase/functions/website-export/index.ts` (245 lines)
6. `supabase/functions/website-form-submit/index.ts` (134 lines)

**Documentation:**
1. `FINAL_DEPLOYMENT_PACK.md` - Main deployment guide
2. `ACCEPTANCE_CHECKLIST.md` - Detailed testing checklist
3. `WHAT_I_CANNOT_COMPLETE.md` - Your action items
4. `COMPLETION_REPORT.md` - Feature summary
5. `FINAL_SUMMARY.md` - Overview
6. `RETURN_CHECKLIST.md` - This file

**Database:**
- 6 platform RPCs deployed
- 11 tables created
- RLS enabled

---

## 🚀 Quick Start

```bash
# 1. Set secrets
supabase secrets set VITE_RUNTIME_MODE="cloud"
supabase secrets set CAPTCHA_PROVIDER="none"

# 2. Deploy
cd /tmp/cc-agent/58267613/project
supabase functions deploy website-draft website-regenerate website-publish website-export website-form-submit

# 3. Test
# Copy curl commands from FINAL_DEPLOYMENT_PACK.md
# Replace <SITE>, <JWT>, <IDEMP> with real values
# Run tests, collect evidence

# 4. Return this file with all boxes checked
```

**Estimated Time:** 15-20 minutes

---

**Status:** ⚠️ Awaiting deployment and testing

**Blockers:** None (all code ready, just needs deployment access)

**Next Step:** Set secrets, deploy functions, run tests, check all boxes

**When Complete:** Green-light Website Builder and move to next tool
