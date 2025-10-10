# Secrets & Environment Variables

## Required Secrets

### Application Runtime
```bash
# Runtime mode: "development" | "staging" | "production"
VITE_RUNTIME_MODE=production

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Security / CSP
```bash
# CSP reporting (true = report-only, false = enforce)
CSP_REPORT_ONLY=false

# Hub / Event Bus
HUB_URL=https://events.craudiovizai.com
HUB_SIGNING_KEY=replace-with-32-plus-char-random-secret
```

### Internal Bypass (NEVER enable in production)
```bash
# ONLY true for local admin testing - MUST be false in prod
INTERNAL_BYPASS_MODE=false

# Comma-separated org UUIDs allowed unlimited credits (leave blank in prod)
INTERNAL_UNLIMITED_ORG_IDS=

# Internal email domain for bypass checks
INTERNAL_EMAIL_DOMAIN=craudiovizai.com
```

---

## Optional Secrets

### Deploy Providers
```bash
NETLIFY_TOKEN=your-netlify-token
VERCEL_TOKEN=your-vercel-token
```

### AI Providers
```bash
JAVARI_API_URL=https://api.javari.ai
JAVARI_API_KEY=your-javari-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### CAPTCHA
```bash
CAPTCHA_PROVIDER=none
HCAPTCHA_SECRET=your-hcaptcha-secret
RECAPTCHA_SECRET=your-recaptcha-secret
```

---

## Where to Set Secrets

### 1. Local Development
Create `.env.local` in project root:
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 2. Supabase Edge Functions
```bash
# Set via CLI
supabase secrets set HUB_SIGNING_KEY=your-secret-here
supabase secrets set NETLIFY_TOKEN=your-token-here

# Or via Dashboard: Settings → Edge Functions → Secrets
```

### 3. Netlify (Frontend Hosting)
- Go to Site Settings → Environment Variables
- Add all `VITE_*` prefixed vars (client-side)
- Add server secrets: `HUB_SIGNING_KEY`, `CSP_REPORT_ONLY`, etc.

### 4. Vercel (Alternative Hosting)
- Settings → Environment Variables
- Separate values for Production / Preview / Development

---

## Security Notes

### Client vs Server Secrets

**Client-Exposed (VITE_* prefix)**:
- `VITE_RUNTIME_MODE`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Server-Only (NO VITE_ prefix)**:
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ NEVER expose
- `HUB_SIGNING_KEY` ⚠️ NEVER expose
- `NETLIFY_TOKEN` / `VERCEL_TOKEN` ⚠️ NEVER expose
- API keys (OpenAI, Anthropic, etc.) ⚠️ NEVER expose

### RBAC Bypass Mode

`INTERNAL_BYPASS_MODE=true` allows:
- Unlimited credits for internal admins
- Bypass usage checks
- Testing without deducting credits

**CRITICAL**: 
- MUST be `false` in production
- Gated by email domain (`@craudiovizai.com`)
- Requires admin role in database
- Server-side validation only (never trust client)

### Webhook Signing

All outbound webhooks/events are HMAC-SHA256 signed:
```typescript
import { sendSignedWebhook } from './lib/webhookSigning';

await sendSignedWebhook(
  'https://events.craudiovizai.com/telemetry',
  payload,
  correlationId
);
```

Receiver verifies:
```typescript
import { verifySignature } from './lib/webhookSigning';

const signature = req.headers.get('x-hub-signature');
const isValid = await verifySignature(payload, signature);
```

---

## Validation Checklist

After setting secrets:

### 1. Build Check
```bash
npm run build
# Should complete without "missing env" errors
```

### 2. Runtime Check
```bash
npm run dev
# Navigate to http://localhost:5173
# Open DevTools Console
# Should NOT see "missing env" warnings
```

### 3. API Check
Test all flows:
```bash
# Create site
curl -X POST http://localhost:5173/api/site \
  -H "Content-Type: application/json" \
  -d '{"orgId":"test","name":"Test Site"}'

# Generate draft
curl -X POST http://localhost:5173/api/website-draft \
  -H "Content-Type: application/json" \
  -d '{"siteId":"...","brief":{"businessName":"Acme"}}'

# Check telemetry
# Should see events in console with correlationId
```

### 4. CSP Check
```bash
# Trigger CSP violation (intentional)
# Open DevTools → Console
# Should see POST to /api/csp-report

# If CSP_REPORT_ONLY=true → only logs
# If CSP_REPORT_ONLY=false → blocks + logs
```

### 5. Hub Integration Check
```bash
# Set HUB_URL to valid endpoint
# Generate site → should POST signed event to HUB_URL/telemetry
# Check hub logs for signed requests with X-Hub-Signature header
```

---

## Production Deployment

### Pre-Deploy
```bash
# 1. Update .env.example with production URLs
# 2. Generate strong HUB_SIGNING_KEY (32+ chars)
openssl rand -hex 32

# 3. Set all secrets in hosting provider
# 4. Verify INTERNAL_BYPASS_MODE=false
# 5. Set CSP_REPORT_ONLY=false (enforce CSP)
```

### Deploy to Netlify
```bash
# 1. Connect repo to Netlify
# 2. Set environment variables (see above)
# 3. Deploy
netlify deploy --prod

# 4. Verify
curl https://your-site.netlify.app/api/site -X POST \
  -H "Content-Type: application/json" \
  -d '{"orgId":"test","name":"Test"}'
```

### Deploy Supabase Functions
```bash
# 1. Set secrets
supabase secrets set HUB_SIGNING_KEY=your-secret

# 2. Deploy
supabase functions deploy website-init website-draft \
  website-ai-apply website-publish website-export \
  checkout webhooks-stripe webhooks-paypal download

# 3. Verify
curl https://your-project.supabase.co/functions/v1/website-init \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -X POST -d '{}'
```

---

## Troubleshooting

### "Missing required env var: VITE_RUNTIME_MODE"
- Set in `.env.local` for dev
- Set in hosting provider for prod

### "Webhook signature verification failed"
- Ensure `HUB_SIGNING_KEY` is identical on sender & receiver
- Check `X-Hub-Signature` header is present

### "INTERNAL_BYPASS_MODE not working"
- Must be admin role in database
- Email must match `INTERNAL_EMAIL_DOMAIN`
- Server-side check only (client cannot bypass)

### CSP violations blocking resources
- Check `/api/csp-report` logs
- Update CSP policy in `netlify.toml` or headers
- Set `CSP_REPORT_ONLY=true` during debugging

---

## Files Reference

**Environment**:
- `.env.example` - Template
- `.env.local` - Local dev (gitignored)

**Implementation**:
- `src/lib/rbac.ts` - Bypass mode & unlimited orgs
- `src/lib/webhookSigning.ts` - HMAC signing/verification
- `src/lib/telemetry.ts` - Event tracking with hub integration
- `src/pages/api/csp-report.ts` - CSP violation handler

**Config**:
- `scripts/env-check.mjs` - Build-time validation
- `netlify.toml` - CSP headers & redirects
