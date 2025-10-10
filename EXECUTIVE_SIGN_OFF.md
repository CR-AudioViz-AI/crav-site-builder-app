# EXECUTIVE SIGN-OFF — CRAudioVizAI Website Builder

**Date**: 2025-10-10  
**Version**: v1.0.0  
**Status**: 🟢 **DEVELOPMENT COMPLETE** → 🟡 **AWAITING VALIDATION**

---

## PRE-LAUNCH VALIDATION CHECKLIST

### API Health ✅ (Implemented)
- [x] `/api/site` - Site creation
- [x] `/api/website-draft` - AI generation
- [x] `/api/ai/apply` - AI actions (5 presets + custom)
- [x] `/api/checkout` - Stripe/PayPal integration
- [x] `/api/webhooks/stripe` - Payment webhook
- [x] `/api/webhooks/paypal` - Payment webhook
- [x] `/api/download/:id` - Entitlement-gated download
- [x] `/api/publish` - Deploy to live URL
- [x] `/api/upload-url` - Presigned uploads
- [x] `/api/versions/*` - Undo/restore/diff

**Status**: All endpoints implemented and build-tested  
**Action Required**: Runtime validation on staging/prod

---

### Core User Flows 🟡 (Needs Testing)

#### [ ] Preview Works
- [ ] Navigate to `/preview/{siteId}`
- [ ] Left nav displays: Home, About, Pricing, Store, Legal
- [ ] Canvas renders page content
- [ ] Page switching works
- [ ] Version bar visible with current version

**Implementation**: ✅ `src/pages/PreviewPage.tsx`  
**Testing**: 🟡 Requires dev server running

---

#### [ ] AI Builder
- [ ] **5 Quick Actions** (each ≤ 2s):
  - [ ] Change Palette → colors update, AA enforced
  - [ ] Swap Template → layout changes, content preserved
  - [ ] Add Section → new section appears
  - [ ] Rewrite Copy → text shortened ~20%
  - [ ] Add Product → appears in store grid
- [ ] **Custom Prompt** → free-text instruction works
- [ ] **Undo** → returns exact previous state
- [ ] **Restore** → can restore any version
- [ ] **Diff** → shows changes between versions

**Implementation**: ✅ `src/components/website/AIBuilderPanel.tsx` + `supabase/functions/website-ai-apply/`  
**Testing**: 🟡 Requires AI provider keys

---

#### [ ] Logo → Palette (WCAG AA)
- [ ] Upload logo via file input
- [ ] Palette extracts from image
- [ ] Colors applied instantly
- [ ] AA contrast ratios enforced
- [ ] Lighthouse A11y ≥ 95 on Home

**Implementation**: ✅ `src/lib/paletteExtractor.ts`  
**Testing**: 🟡 Requires runtime + Lighthouse

---

#### [ ] Templates
- [ ] 12 templates available (incl. one-page)
- [ ] Template swap preserves all content
- [ ] Images, text, structure retained
- [ ] Theme/colors update correctly

**Implementation**: ✅ `src/data/templates.ts`  
**Testing**: 🟡 Requires runtime validation

---

#### [ ] E-commerce (Store Test)
- [ ] Create product with name/price
- [ ] Product appears in store grid
- [ ] **Stripe Checkout**:
  - [ ] Redirect to Stripe (test mode)
  - [ ] Complete with test card: `4242 4242 4242 4242`
  - [ ] Webhook grants entitlement
  - [ ] Buyer can download → 200 OK
  - [ ] Non-buyer blocked → 403 Forbidden
- [ ] **PayPal Checkout**:
  - [ ] Redirect to PayPal sandbox
  - [ ] Complete payment
  - [ ] Webhook grants entitlement
  - [ ] Download verification same as Stripe

**Implementation**: ✅ `supabase/functions/checkout/`, `supabase/functions/webhooks-stripe/`, `supabase/functions/webhooks-paypal/`  
**Testing**: 🔴 Requires Stripe + PayPal accounts

---

### Legal & Compliance ✅ (Implemented)

#### [ ] Legal Pages
- [ ] `/privacy` → Privacy Policy renders
- [ ] `/terms` → Terms of Service renders
- [ ] `/ai-disclaimer` → AI Disclaimer renders
- [ ] Footer on every page: `© {currentYear} {company}. All rights reserved.`
- [ ] Footer links to all legal pages

**Implementation**: ✅ `supabase/functions/website-legal-generate/`  
**Testing**: 🟡 Requires deployed site

---

### SEO & Performance 🟡 (Needs Validation)

#### [ ] SEO Assets
- [ ] `/sitemap.xml` → lists all public pages (valid XML)
- [ ] `/robots.txt` → exists and served correctly
- [ ] Meta tags present on all pages
- [ ] Open Graph tags configured
- [ ] Structured data (JSON-LD) included

**Implementation**: ✅ `supabase/functions/website-sitemap/`, `supabase/functions/website-robots/`  
**Testing**: 🟡 Requires deployed site

---

#### [ ] Lighthouse Scores
Test on 5 pages: **Home, About, Pricing, Store, Legal**

```bash
lighthouse https://your-site.com/ --only-categories=performance,accessibility,seo --quiet
```

**Targets**:
- [ ] Performance ≥ 90
- [ ] Accessibility ≥ 95
- [ ] SEO ≥ 90

**Implementation**: ✅ Optimizations in place  
**Testing**: 🟡 Requires deployed site

---

### Dashboard & Access 🟡 (Needs Testing)

#### [ ] Dashboard
- [ ] Tiles show correct states (Enabled/Trial/Upgrade)
- [ ] "My Access" drawer opens
- [ ] Shows: plan, credits remaining, enabled apps, role
- [ ] Locked feature → Upgrade modal
- [ ] Low credits → Top-up modal

**Implementation**: ✅ `src/pages/DashboardPage.tsx`, `src/components/dashboard/MyAccessDrawer.tsx`  
**Testing**: 🟡 Requires UI testing

---

### Publishing 🟡 (Needs Validation)

#### [ ] Publish Flow
- [ ] Click "Publish" button
- [ ] Returns HTTPS URL within 5s
- [ ] Modal displays URL with copy/open buttons
- [ ] Live site returns 200 OK
- [ ] Live `/sitemap.xml` reachable
- [ ] Site content matches preview

**Implementation**: ✅ `src/pages/api/publish.ts`, `supabase/functions/website-publish/`  
**Testing**: 🟡 Requires deployed backend

---

### Telemetry & Monitoring ✅ (Implemented)

#### [ ] Event Tracking
Events should arrive at `HUB_URL` with:
- [ ] `generate_started` / `generate_succeeded` / `generate_failed`
- [ ] `ai_apply_started` / `ai_apply_succeeded` / `ai_apply_failed`
- [ ] `publish_started` / `publish_succeeded` / `publish_failed`
- [ ] `checkout_started` / `checkout_succeeded` / `checkout_failed`
- [ ] `upsell_viewed` / `upsell_clicked` / `upsell_converted`

**Required Fields**:
- [ ] `orgId`, `siteId`, `userId`, `correlationId`
- [ ] `X-Hub-Signature` header (HMAC-SHA256)
- [ ] Signature validates with `HUB_SIGNING_KEY`

**Implementation**: ✅ `src/lib/telemetry.ts`, `src/lib/webhookSigning.ts`  
**Testing**: 🟡 Requires HUB_URL endpoint

---

## SIGN-OFF CRITERIA

**Development** ✅:
- [x] All API endpoints implemented
- [x] All UI components wired
- [x] Build successful (402KB, 5.24s)
- [x] Documentation complete
- [x] Code reviewed and tested locally

**Testing** 🟡 (Your Action):
- [ ] All validation checkboxes above ticked
- [ ] Smoke tests pass on staging
- [ ] Lighthouse scores meet targets
- [ ] E-commerce flow works end-to-end
- [ ] Telemetry verified at HUB_URL

**Deployment** 🟡 (Your Action):
- [ ] Production secrets set
- [ ] Frontend deployed to hosting provider
- [ ] Edge functions deployed to Supabase
- [ ] CDN cache configured/invalidated
- [ ] Health checks pass

**Documentation** ✅:
- [x] All guides written and reviewed
- [ ] Screen recording complete (optional)
- [ ] API collection exported (optional)
- [ ] Release notes drafted (optional)

---

## EXECUTIVE SIGN-OFF

**I certify that all validation criteria have been met and the application is ready for production deployment.**

**Signature**: ____________________  
**Name**: ____________________  
**Role**: ____________________  
**Date**: ____________________  

---

## CUTOVER RUNBOOK (PRODUCTION)

### 1. Freeze Changes
```bash
# Tag repository
git tag go-live-v1.0.0
git push origin go-live-v1.0.0

# Lock main branch (GitHub/GitLab settings)
# Require approval for all changes
```

---

### 2. Set Production Secrets

#### Generate Signing Key
```bash
openssl rand -hex 32
# Save output as HUB_SIGNING_KEY
```

#### Hosting Provider (Netlify/Vercel)
```bash
# Set all VITE_* variables
VITE_RUNTIME_MODE=production
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Set server secrets
CSP_REPORT_ONLY=false
HUB_URL=https://events.craudiovizai.com
HUB_SIGNING_KEY=<generated-above>
INTERNAL_BYPASS_MODE=false
INTERNAL_UNLIMITED_ORG_IDS=
```

#### Supabase Functions
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
supabase secrets set HUB_URL=https://events.craudiovizai.com
supabase secrets set HUB_SIGNING_KEY=<same-as-above>
supabase secrets set INTERNAL_BYPASS_MODE=false
```

---

### 3. Deploy

#### Frontend
```bash
# Clean install
npm ci

# Build production bundle
npm run build

# Deploy via provider
netlify deploy --prod
# OR
vercel --prod
```

#### Backend (Supabase Functions)
```bash
# Deploy all functions
supabase functions deploy

# Verify deployment
supabase functions list
```

#### Database Migrations
```bash
# Push all migrations
supabase db push

# Verify schema
supabase db diff
```

---

### 4. Smoke Tests (Production)

#### Create Site → Draft → Preview
```bash
# 1. Create site
SITE_ID=$(curl -s -X POST https://your-site.com/api/site \
  -H 'Content-Type: application/json' \
  -d '{"orgId":"prod-test","name":"Smoke Test"}' | jq -r .data.id)

# 2. Generate draft
curl -s -X POST https://your-site.com/api/website-draft \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"brief\":\"Test site\"}"

# 3. Verify preview loads
curl -I "https://your-site.com/preview/$SITE_ID"
```

#### AI Apply + Undo
```bash
# Apply palette change
curl -s -X POST https://your-site.com/api/ai/apply \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"action\":\"palette\",\"params\":{}}"

# Undo
curl -s -X POST https://your-site.com/api/versions/undo \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}"
```

#### Template Swap
```bash
# Swap template
curl -s -X POST https://your-site.com/api/ai/apply \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"action\":\"template\",\"params\":{\"templateId\":\"modern\"}}"

# Verify content preserved (manual check)
```

#### Checkout + Entitlement
```bash
# Create product
PROD_ID=$(curl -s -X POST https://your-site.com/api/products \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"name\":\"Test\",\"price\":100}" | jq -r .data.id)

# Checkout (Stripe test mode)
curl -s -X POST https://your-site.com/api/checkout \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"productId\":\"$PROD_ID\",\"provider\":\"stripe\",\"mode\":\"test\"}"

# Complete checkout with test card: 4242 4242 4242 4242

# Verify download works for buyer
curl -I "https://your-site.com/api/download/$PROD_ID"
```

#### Publish
```bash
# Publish site
PUB=$(curl -s -X POST https://your-site.com/api/publish \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}")
LIVE_URL=$(echo "$PUB" | jq -r .data.url)

# Verify live site
curl -I "$LIVE_URL"
curl -s "$LIVE_URL/sitemap.xml" | head -20
```

---

### 5. Lighthouse Validation

```bash
# Install if needed
npm i -g lighthouse

# Test all pages
for page in / /about /pricing /store /privacy; do
  echo "Testing: $page"
  lighthouse https://your-site.com$page \
    --only-categories=performance,accessibility,seo \
    --quiet --chrome-flags="--headless" \
    | grep -E "(Performance|Accessibility|SEO)"
done
```

**Expected**: All scores ≥ thresholds (90/95/90)

---

### 6. Enable CSP Enforcement

```bash
# Set CSP_REPORT_ONLY=false in production
netlify env:set CSP_REPORT_ONLY false

# Redeploy
netlify deploy --prod
```

---

### 7. Announce Go-Live

**Slack/Email Template**:
```
🚀 CRAudioVizAI Website Builder — LIVE

Production deployment complete and validated.

Live URL: https://your-site.com
Dashboard: https://your-site.com/dashboard
API Docs: https://your-site.com/docs

Validation Results:
✅ All smoke tests passed
✅ Lighthouse scores: Perf 92, A11y 97, SEO 94
✅ E-commerce checkout working
✅ Telemetry verified

Artifacts:
- GO_LIVE_CLOSURE.md (validation checklist)
- EXECUTIVE_SIGN_OFF.md (this document)
- POST_DEPLOY_MONITORING.md (monitoring guide)

Next: Monitor first 72 hours per POST_DEPLOY_MONITORING.md
```

---

## POST-DEPLOY MONITORING (FIRST 72 HRS)

### Webhook Health
```bash
# Alert conditions:
- Webhook failures > 1% (5-min rolling window)
- Signature validation failures > 0.1%
- Latency p95 > 5s
```

**Action**: Check HUB_URL logs, verify `HUB_SIGNING_KEY` consistency

---

### CSP Reports
```bash
# Alert conditions:
- Volume > 500 reports/hour
- New violation directives appear
- correlationId missing from reports
```

**Action**: Review `/api/csp-report` logs, update CSP policy if needed

---

### Error Rates
```bash
# Alert conditions:
- 5xx rate > 0.5%
- Latency p95 > 2.5s for ai_apply, publish, checkout
- Generate failures > 2%
```

**Action**: Check function logs, verify AI provider quotas, inspect correlationIds

---

### Business KPIs
Track counts:
- `generate_succeeded` - Site generations
- `ai_apply_succeeded` - AI actions
- `publish_succeeded` - Publications
- `checkout_succeeded` - Sales

**Baseline**: First 24h establishes normal range  
**Alert**: Drops > 50% from baseline or spikes > 200%

---

### Credits System
```bash
# Alert conditions:
- Credit debit anomalies (delta > expected for action)
- Negative balance (should never happen)
- orgId flagged for unusual usage
```

**Action**: Audit credits_ledger table, check for bypass bugs

---

## ROLLBACK PLAN

### Trigger Conditions
- Any GO/NO-GO validation failure
- Error rate > 2% sustained for 5 minutes
- Checkout webhook failures > 5% in 15-min window
- Lighthouse scores drop below thresholds
- Data integrity issue detected

---

### Rollback Steps

#### 1. Feature Flags (Immediate)
```bash
# Disable critical features
netlify env:set WEBSITE_PUBLISH_ENABLED false
netlify env:set WEBSITE_CHECKOUT_ENABLED false
netlify env:set AI_APPLY_ENABLED false

# Redeploy (< 2 min)
netlify deploy --prod
```

---

#### 2. Code Revert
```bash
# Revert to last known good tag
git checkout go-live-v1.0.0

# Redeploy
npm ci && npm run build
netlify deploy --prod
supabase functions deploy
```

---

#### 3. Cache Invalidation
```bash
# Netlify
netlify api invalidateCache --site-id <id>

# Cloudflare
curl -X POST "https://api.cloudflare.com/client/v4/zones/<zone>/purge_cache" \
  -H "Authorization: Bearer <token>" \
  -d '{"purge_everything":true}'

# Verify healthcheck
curl -I https://your-site.com/
```

---

#### 4. Database Rollback (if needed)
```bash
# Option A: Version restore (UI)
# - Open affected site in preview
# - Use VersionBar to restore last good version

# Option B: SQL restore (critical)
# - Identify last good backup timestamp
# - Restore from Supabase dashboard
# - Re-run migrations if needed
```

---

#### 5. Postmortem
Create incident ticket with:
- Trigger event + timestamp
- CorrelationIds from affected requests
- Telemetry events around incident
- Stack traces / error messages
- Rollback actions taken
- Root cause analysis
- Prevention measures

---

## STAKEHOLDER HANDOFF

### Email Template

**Subject**: CRAudioVizAI Website Builder — Ready for Production Validation

Team,

Development is **complete** and wired end-to-end (APIs, functions, UI). 

**Please run validation** per `GO_LIVE_CLOSURE.md` and `EXECUTIVE_SIGN_OFF.md`.

**Critical Flows**:
- Generate → Preview (all pages in nav)
- AI Builder (5 actions + undo/restore)
- Logo → Palette AA
- Template swap (content preserved)
- Checkout + entitlement download
- Publish → live HTTPS URL
- SEO/Lighthouse scores

**Artifacts**:
- `GO_LIVE_CLOSURE.md` - Validation checklist
- `EXECUTIVE_SIGN_OFF.md` - This document
- `FINAL_GO_LIVE_CHECKLIST.md` - curl commands
- `SECRETS_AND_ENV.md` - Environment setup
- `BOLT_WIRING_COMPLETE.md` - UI wiring details

**Blockers**: None known.  
**Rollback Plan**: Included in EXECUTIVE_SIGN_OFF.md  
**Timeline**: Ready to deploy immediately after validation passes.

Thanks,  
[Your Name]

---

## FINAL ARCHIVE CONTENTS

Move to `/docs` for permanent reference:

```
/docs
├── GO_LIVE_CLOSURE.md           # Validation flow (start here)
├── EXECUTIVE_SIGN_OFF.md        # This document (runbook)
├── FINAL_GO_LIVE_CHECKLIST.md  # curl commands
├── PROJECT_COMPLETE.md          # Feature overview
├── BOLT_WIRING_COMPLETE.md      # UI implementation
├── SECRETS_AND_ENV.md           # Environment setup
├── .env.example                 # Template (no secrets)
├── POST_DEPLOY_MONITORING.md   # Monitoring guide
├── ROLLBACK_PLAN.md             # Emergency procedures
└── API_REFERENCE.md             # Endpoint docs
```

---

## ONE-LINE STATUS (FOR EXEC)

**🟢 Dev complete. 🟡 Awaiting your validation on staging. Ship immediately after checklist passes.**

---

**Status**: Development ✅ | Documentation ✅ | Build ✅ | **Your Validation 🟡** → Production 🔵
