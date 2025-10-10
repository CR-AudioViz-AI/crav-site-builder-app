# FINAL GO-LIVE CHECKLIST

**Date**: 2025-10-10  
**Status**: Ready for validation testing

---

## A) ENV & SECURITY ✅

**Verification Status**:
- ✅ `.env.example` documented with all required vars
- ✅ `.env` configured for local testing
- ✅ `SECRETS_AND_ENV.md` complete setup guide
- 🟡 Production secrets need to be set in hosting provider

**Required in Production**:
```bash
✅ VITE_RUNTIME_MODE=production
✅ INTERNAL_BYPASS_MODE=false
✅ INTERNAL_UNLIMITED_ORG_IDS=                   # blank in prod
✅ CSP_REPORT_ONLY=false                         # true only in staging
✅ HUB_URL=https://events.craudiovizai.com
⚠️  HUB_SIGNING_KEY=<32+ char random>            # GENERATE: openssl rand -hex 32
```

---

## B) SMOKE TEST (API Endpoints) ✅

**All Endpoints Implemented**:

### Create Site → Draft → Preview
```bash
# ✅ POST /api/site
SITE_ID=$(curl -s -X POST http://localhost:5173/api/site \
  -H 'Content-Type: application/json' \
  -d '{"orgId":"demo-org","name":"Acme"}' | jq -r .data.id)

# ✅ POST /api/website-draft
curl -s -X POST http://localhost:5173/api/website-draft \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"brief\":\"Acme demo\"}" | jq .

# Opens: http://localhost:5173/preview/$SITE_ID
```

### AI Apply + Versions
```bash
# ✅ POST /api/ai/apply
curl -s -X POST http://localhost:5173/api/ai/apply \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"action\":\"palette\",\"params\":{}}" | jq .

# ✅ GET /api/versions?siteId=X
curl -s "http://localhost:5173/api/versions?siteId=$SITE_ID" | jq .

# ✅ POST /api/versions/undo
curl -s -X POST http://localhost:5173/api/versions/undo \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}" | jq .

# ✅ POST /api/versions/restore
LATEST=$(curl -s "http://localhost:5173/api/versions?siteId=$SITE_ID" | jq -r '.versions[0].id')
curl -s -X POST http://localhost:5173/api/versions/restore \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"versionId\":\"$LATEST\"}" | jq .
```

**Status**: 🟡 Needs runtime testing (requires dev server)

---

## C) LOGO → PALETTE (WCAG AA) ✅

**Implementation**:
```typescript
// src/pages/PreviewPage.tsx:handleLogoUpload()
1. POST /api/upload-url → get signed URL
2. PUT to signed URL → upload file
3. POST /api/ai/apply action='palette' → extract colors
4. Server enforces WCAG AA contrast (src/lib/paletteExtractor.ts)
```

**Files**:
- ✅ `src/pages/api/upload-url.ts` - Presigned upload URLs
- ✅ `src/lib/paletteExtractor.ts` - WCAG AA enforcement
- ✅ `src/pages/PreviewPage.tsx` - Upload handler wired

**Status**: ✅ Implemented, 🟡 needs runtime test

---

## D) E-COMMERCE (Test Mode) ✅

**Endpoints**:
```bash
# ✅ POST /api/products - Create product
PROD_ID=$(curl -s -X POST http://localhost:5173/api/products \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"name\":\"Manual PDF\",\"price\":2900}" | jq -r .data.id)

# ✅ POST /api/checkout - Stripe/PayPal checkout
curl -s -X POST http://localhost:5173/api/checkout \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\",\"productId\":\"$PROD_ID\",\"provider\":\"stripe\",\"mode\":\"test\"}" | jq .checkoutUrl

# ✅ POST /api/webhooks/stripe - Webhook handler
# ✅ POST /api/webhooks/paypal - Webhook handler

# ✅ GET /api/download/:productId - Entitlement check
curl -I "http://localhost:5173/api/download/$PROD_ID"
```

**Status**: ✅ All endpoints implemented, 🟡 needs Stripe/PayPal sandbox testing

---

## E) LEGAL & SEO ✅

**Legal Pages**:
- ✅ `supabase/functions/website-legal-generate/index.ts` - Generate Privacy, Terms, AI Disclaimer
- ✅ Footer copyright on all pages: `© {year} {company}. All rights reserved.`
- ✅ Links in footer to /privacy, /terms, /ai-disclaimer

**SEO**:
- ✅ `supabase/functions/website-sitemap/index.ts` - sitemap.xml generation
- ✅ `supabase/functions/website-robots/index.ts` - robots.txt generation
- ✅ `src/lib/export/seo.ts` - Meta tags, Open Graph, structured data

**Checklist**:
```bash
# 🟡 Verify after deploy
[ ] curl https://your-site.com/privacy → 200 OK
[ ] curl https://your-site.com/terms → 200 OK
[ ] curl https://your-site.com/ai-disclaimer → 200 OK
[ ] curl https://your-site.com/sitemap.xml → 200 OK (valid XML)
[ ] curl https://your-site.com/robots.txt → 200 OK
```

**Status**: ✅ Implemented, 🟡 needs deployed site to verify

---

## F) DASHBOARD & ACCESS ✅

**Components**:
- ✅ `src/pages/DashboardPage.tsx` - Main dashboard
- ✅ `src/components/dashboard/MyAccessDrawer.tsx` - Access details
- ✅ `src/components/credits/CreditsBadge.tsx` - Credits display
- ✅ `src/components/credits/CreditsDrawer.tsx` - Credits ledger
- ✅ `src/components/website/OutOfCreditsModal.tsx` - Upgrade prompt

**Features**:
- ✅ Dashboard tiles for apps (Enabled/Trial/Upgrade states)
- ✅ "My Access" drawer shows: plan, credits, apps, role
- ✅ RBAC enforcement (`src/lib/rbac.ts`)
- ✅ Credits enforcement (`src/hooks/useCredits.ts`)

**Checklist**:
```bash
# 🟡 Manual UI testing required
[ ] Open /dashboard → verify tiles show correct states
[ ] Click "My Access" → verify plan, credits, apps, role display
[ ] Trigger low credits → verify Top-up modal appears
[ ] Trigger locked feature → verify Upgrade modal appears
```

**Status**: ✅ Implemented, 🟡 needs UI testing

---

## G) PUBLISH & EXPORT ✅

**Publish Flow**:
```bash
# ✅ POST /api/publish
PUB=$(curl -s -X POST http://localhost:5173/api/publish \
  -H 'Content-Type: application/json' \
  -d "{\"siteId\":\"$SITE_ID\"}") && echo "$PUB" | jq .

LIVE_URL=$(echo "$PUB" | jq -r .data.url)

# Verify live site
curl -I "$LIVE_URL"
curl -I "$LIVE_URL/sitemap.xml"
```

**Export Flow**:
```bash
# ✅ GET /api/export?siteId=X
curl -L -o site.zip "http://localhost:5173/api/export?siteId=$SITE_ID"
unzip -l site.zip
```

**UI Integration**:
- ✅ Publish button in PreviewPage
- ✅ Modal shows HTTPS URL with copy/open buttons
- ✅ Export button downloads ZIP

**Status**: ✅ Implemented, 🟡 needs deployed site for live URL

---

## H) TELEMETRY & CSP ✅

**Telemetry Events**:
```typescript
// src/lib/telemetry.ts
✅ trackGenerateSite(orgId, siteId, brief)
✅ trackAIApply(orgId, siteId, action, params)
✅ trackPublish(orgId, siteId, url)
✅ trackCheckout(orgId, siteId, productId, provider)
✅ trackUpsell(orgId, siteId, context)

// All events include: orgId, siteId, userId, correlationId
// Signed with HUB_SIGNING_KEY (HMAC-SHA256)
```

**CSP Reporting**:
```typescript
// src/pages/api/csp-report.ts
✅ Receives violation reports
✅ Logs with correlationId
✅ Controlled by CSP_REPORT_ONLY env var
```

**Checklist**:
```bash
# 🟡 Verify after deploy
[ ] Trigger event → check HUB_URL logs for payload
[ ] Verify X-Hub-Signature header present
[ ] Verify signature validates with HUB_SIGNING_KEY
[ ] Trigger CSP violation → check /api/csp-report logs
[ ] Verify correlationId links UI error to server log
```

**Status**: ✅ Implemented, 🟡 needs production testing

---

## I) LIGHTHOUSE TARGETS 🟡

**Requirements**:
- Performance ≥ 90
- Accessibility ≥ 95
- SEO ≥ 90

**Pages to Test**:
- Home
- About
- Pricing
- Store
- Legal (Privacy/Terms)

**Implementation**:
- ✅ WCAG AA contrast enforced (`src/lib/paletteExtractor.ts`)
- ✅ Semantic HTML in BlockRenderer
- ✅ Accessibility panel (`src/components/website/panels/AccessibilityPanel.tsx`)
- ✅ SEO meta tags (`src/lib/export/seo.ts`)

**Status**: 🟡 Needs published site to run Lighthouse

---

## J) HANDOFF ARTIFACTS

### Documentation ✅
- ✅ `BOLT_WIRING_COMPLETE.md` - UI wiring complete
- ✅ `GO_LIVE_STATUS.md` - Backend status + validation checklist
- ✅ `SECRETS_AND_ENV.md` - Environment setup guide
- ✅ `.env.example` - Template with all secrets (no values)

### API Collection 🟡
- 🟡 Create Postman/REST collection for all endpoints
- 🟡 Include example payloads + responses
- 🟡 Document authentication headers

### Screen Recording 🟡
**Flow to Record**:
1. Generate site (/) → Preview (/preview/:siteId)
2. AI Builder → Try 5 actions
3. Upload logo → Palette change
4. Swap template
5. Add product
6. Checkout (test mode)
7. Download (verify entitlement)
8. Publish → Open live URL

**Status**: 🟡 Requires working dev environment

### Additional Docs 🟡
- 🟡 User Manual (end-user guide)
- 🟡 Admin Runbook (ops guide)
- 🟡 QA Checklist (test scenarios)

---

## DEPLOYMENT CHECKLIST

### Pre-Deploy
```bash
# 1. Generate HUB_SIGNING_KEY
openssl rand -hex 32

# 2. Set secrets in Netlify/Vercel
VITE_RUNTIME_MODE=production
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
CSP_REPORT_ONLY=false
HUB_URL=https://events.craudiovizai.com
HUB_SIGNING_KEY=<generated-above>
INTERNAL_BYPASS_MODE=false
INTERNAL_UNLIMITED_ORG_IDS=

# 3. Set secrets in Supabase Functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set HUB_URL=https://events.craudiovizai.com
supabase secrets set HUB_SIGNING_KEY=<same-as-above>
supabase secrets set INTERNAL_BYPASS_MODE=false
```

### Deploy
```bash
# 4. Deploy frontend
netlify deploy --prod
# OR
vercel --prod

# 5. Deploy edge functions
supabase functions deploy
```

### Post-Deploy Validation
```bash
# 6. Run smoke tests (section B above)
# 7. Run Lighthouse on live URL (section I above)
# 8. Verify telemetry (section H above)
# 9. Test checkout flow (section D above)
# 10. Verify legal pages + sitemap (section E above)
```

---

## SUMMARY

### ✅ Complete (Ready)
- All 17+ API endpoints implemented
- UI wiring complete (routes, components, handlers)
- Security (CSP, webhook signing, RBAC)
- Environment variables documented
- Build successful (402KB bundle)

### 🟡 Needs Testing (Your Action)
- Smoke test all API endpoints
- UI flow testing (generate → preview → AI → publish)
- Stripe/PayPal sandbox checkout
- Lighthouse scores on published site
- Telemetry event verification

### 🔴 Blocked (External Dependencies)
- Stripe account for sandbox testing
- PayPal account for sandbox testing
- Deployed site for Lighthouse
- HUB_URL endpoint for telemetry verification

---

## WHEN ALL BOXES ✅ → DEPLOY TO PROD

**Current Status**: 🟢 Backend Complete | 🟡 Frontend Wired | 🟡 Testing Required

**Next Steps**:
1. Set `.env.local` with real Supabase credentials
2. Run `npm run dev`
3. Execute smoke tests (section B)
4. Test UI flows manually
5. Generate HUB_SIGNING_KEY for production
6. Set all production secrets
7. Deploy frontend + functions
8. Run post-deploy validation
9. Monitor telemetry + CSP reports

**Ready to Ship**: After validation testing passes ✅
