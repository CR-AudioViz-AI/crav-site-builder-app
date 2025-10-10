# Website Builder - Plugin Architecture

## Overview

Website Builder is now a fully composable plugin-enabled application using the `core-mini` framework. It can discover and integrate with other tools without direct dependencies.

---

## Core-Mini Framework

Located in `/supabase/functions/core-mini/`, this framework provides shared utilities for all edge functions:

### 1. **env.ts** - Secrets Guard
Only reads what this app uses:
- `RUNTIME` - cloud/self_hosted/embedded-managed
- `HUB` - Hub URL and signing key (optional)
- `CAPTCHA` - Provider (none/hcaptcha/recaptcha) and secrets
- `TRACKING` - Tracking domain (optional)
- `DEPLOY` - Vercel/Netlify tokens (optional)
- `SUPABASE` - Database connection
- `AI` - Javari/OpenAI/Anthropic API keys

All secrets have `.enabled()` methods that check if they're configured before use.

### 2. **auth.ts** - Org Auth, License & Entitlement
Provides:
- `requireEntitlement(orgId, tool)` - Check tool access
- `requireLicenseIfSelfHosted()` - License validation
- `getIdempotencyResult(key, orgId)` - Cache retrieval
- `storeIdempotencyResult(key, orgId, result)` - Cache storage
- `debitCredits(orgId, action, amount, key, metadata)` - Credit debiting
- `emitEvent(eventType, orgId, payload)` - Event emission
- `getAuthContext(req, siteId?)` - Get org/user context with request_id

### 3. **log.ts** - Structured Logging
All logs include `request_id` for tracing:
- `createLogger(baseContext)` - Create contextual logger
- `info(message, context)` - Info logs
- `warn(message, context)` - Warning logs
- `error(message, context)` - Error logs
- `debug(message, context)` - Debug logs

Format: `{timestamp, level, message, request_id, org_id, ...}`

### 4. **ai-router.ts** - Javari-First Model Router
Cascading fallback: Javari → OpenAI → Anthropic
- `generate(messages, options)` - Generate completion
- Auto-detects available providers
- Returns `{content, model, provider, usage}`

### 5. **tracking.ts** - Signed Tokens & HTML Sanitization
- `signToken(payload)` - Create HMAC-signed token
- `verifyToken(token)` - Verify signed token
- `sanitizeHtml(html)` - Remove dangerous tags/scripts
- `createTrackingPixel(token)` - Generate 1x1 tracking image
- `createTrackedLink(url, token)` - Wrap URL in tracker

No-ops gracefully when `TRACKING_DOMAIN` not configured.

### 6. **plugin.ts** - Plugin Protocol Types
TypeScript interfaces for:
- `PluginManifest` - App manifest structure
- `PluginDispatchRequest` - Cross-app event request
- `PluginDispatchResponse` - Dispatch response
- `PluginHealthResponse` - Health check response

---

## Plugin Infrastructure

### Manifest: `/.well-known/craudiovizai-plugin.json`

Declares capabilities, routes, events, and API endpoints:

```json
{
  "tool_key": "website",
  "name": "Website Builder",
  "version": "1.0.0",
  "routes": ["/website", "/website/new", "/website/sites", ...],
  "events_produced": [
    "website.site.draft.created",
    "website.site.published",
    "website.form.submitted",
    "website.brand.exported",
    "asset.created"
  ],
  "events_consumed": [
    "newsletter.campaign.sent",
    "logo.created"
  ],
  "capabilities": {
    "draft": true,
    "publish": true,
    "forms": true,
    "export": true,
    "brand_tokens": true
  },
  "permissions": ["website:read", "website:write", "website:publish", "website:forms"],
  "adapters": {
    "deploy": ["vercel", "netlify", "cloudflare", "s3"]
  },
  "public_endpoints": ["/f/:formId"],
  "api": {
    "dispatch_url": "/_plugin/dispatch",
    "manifest_url": "/.well-known/craudiovizai-plugin.json",
    "health_url": "/_plugin/health"
  }
}
```

### Plugin Endpoints

**1. `/_plugin/dispatch` (POST)** - Receive cross-app events

Handles incoming events from other tools:
- `newsletter.campaign.sent` - Display latest newsletter on site
- `logo.created` - Use logo in brand tokens

Request:
```json
{
  "source_tool": "newsletter",
  "event_type": "newsletter.campaign.sent",
  "payload": {"campaign_id": "..."},
  "request_id": "...",
  "org_id": "..."
}
```

Response:
```json
{
  "ok": true,
  "handled": true,
  "data": {"message": "..."},
  "request_id": "..."
}
```

**2. `/_plugin/health` (GET)** - Liveness check

Returns:
```json
{
  "ok": true,
  "tool_key": "website",
  "version": "1.0.0",
  "timestamp": "2025-10-09T18:00:00Z"
}
```

---

## Edge Functions

All functions now follow standardized patterns using core-mini:

### **website-draft** (2 credits)
- Uses `ai-router.generate()` for AI content generation
- Full entitlement/license/idempotency/debit flow
- Emits `website.site.draft.created`

### **website-regenerate** (1 credit)
- Block-level regeneration
- Emits `website.block.regenerated`

### **website-publish** (2 credits)
- Deploys site to configured provider
- Creates deploy + asset records
- Emits `website.site.published` + `asset.created`
- Pushes to Hub if enabled

### **website-export** (2 credits)
- Exports code bundle with SBOM/SLSA
- Emits `asset.created`
- Pushes to Hub if enabled

### **website-form-submit** (0 credits)
- CAPTCHA verification via `CAPTCHA` guard
- Emits `form.submitted` + `contact.created`

### **website-brand-tokens-export** (0 credits) NEW
- Exports brand tokens (colors, typography, spacing, motion)
- Returns JSON or CSS format
- Includes SBOM/SLSA provenance
- Emits `website.brand.exported`

Example:
```bash
GET /website-brand-tokens-export?siteId=<ID>&format=json
GET /website-brand-tokens-export?siteId=<ID>&format=css
```

---

## Events

### Produced Events

1. **website.site.draft.created**
   - When AI generates site structure
   - Payload: `{site_id, page_count, request_id}`

2. **website.site.published**
   - When site deploys to production
   - Payload: `{site_id, deploy_id, url, provider, brand_tokens}`
   - Includes brand tokens for downstream styling

3. **website.form.submitted**
   - When visitor submits form
   - Payload: `{site_id, form_id, page_path, email?}`

4. **website.brand.exported**
   - When brand tokens exported
   - Payload: `{site_id, format, request_id}`

5. **asset.created**
   - When codebundle/export created
   - Payload: `{asset_id, site_id, kind, url}`

### Consumed Events

1. **newsletter.campaign.sent**
   - From Newsletter Builder
   - Can display "Latest Newsletter" block on site

2. **logo.created**
   - From Logo Creator
   - Can use logo in brand tokens

---

## Cross-App Integration (No Coupling)

### Outbound: Brand Tokens to Newsletter

When publishing site, emit `website.site.published` with `brand_tokens`:

```typescript
await emitEvent("website.site.published", orgId, {
  site_id: siteId,
  deploy_id: deployId,
  url: deployUrl,
  brand_tokens: {
    colors: {primary: [...], secondary: [...]},
    typography: {...},
  }
});
```

Newsletter Builder listens for this event (via `/_plugin/dispatch`) and styles emails to match.

### Inbound: Newsletter Campaigns

Newsletter Builder sends `newsletter.campaign.sent` when campaign goes out. Website Builder receives it at `/_plugin/dispatch` and can optionally display "Latest Newsletter" section.

**No backend dependencies. Pure event-based composition.**

---

## Discovery Pattern

Any tool can discover Website Builder by:

1. Fetch `/.well-known/craudiovizai-plugin.json`
2. Check `capabilities` and `events_produced`
3. Send events to `/_plugin/dispatch` URL

Example (from another tool):
```typescript
const manifest = await fetch("https://website.app/.well-known/craudiovizai-plugin.json").then(r => r.json());

if (manifest.capabilities.brand_tokens) {
  // Website Builder supports brand tokens
  const tokens = await fetch(`${manifest.api.base_url}/website-brand-tokens-export?siteId=${id}`).then(r => r.json());
}
```

---

## Database Schema

### Core Tables
- `sites` - Site records
- `pages` - Page content
- `media_assets` - Images, videos, codebundles
- `deploys` - Deployment history
- `form_submissions` - Form data
- `navigation_menus` - Site navigation
- `redirects` - URL redirects
- `blog_posts` - Blog content (optional)

### Platform Tables
- `idempotency_results` - Cached results
- `credit_transactions` - Credit ledger

### Missing (Newsletter Decoupled)
- No `subscribers` table
- No `campaigns` table
- No ESP integration

---

## Secrets Configuration

```bash
# Required
supabase secrets set VITE_RUNTIME_MODE="cloud"

# AI (at least one required for draft function)
supabase secrets set JAVARI_API_URL="https://javari.ai/v1"
supabase secrets set JAVARI_API_KEY="..."
# OR
supabase secrets set OPENAI_API_KEY="sk-..."
# OR
supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."

# CAPTCHA (optional, defaults to none)
supabase secrets set CAPTCHA_PROVIDER="none"
# OR
supabase secrets set CAPTCHA_PROVIDER="hcaptcha"
supabase secrets set HCAPTCHA_SECRET="..."
# OR
supabase secrets set CAPTCHA_PROVIDER="recaptcha"
supabase secrets set RECAPTCHA_SECRET="..."

# Hub (optional)
supabase secrets set HUB_URL="https://hub.example.com"
supabase secrets set HUB_SIGNING_KEY="..."

# Tracking (optional)
supabase secrets set TRACKING_DOMAIN="track.example.com"

# Deploy adapters (optional)
supabase secrets set VERCEL_TOKEN="..."
supabase secrets set NETLIFY_TOKEN="..."
```

---

## Deployment

### Deploy All Functions
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

### Dev Mode
```bash
# Frontend
npm run dev

# Edge functions
supabase functions serve
```

---

## Testing Plugin Integration

### Test Manifest Discovery
```bash
curl https://your-website-app/.well-known/craudiovizai-plugin.json
```

### Test Health
```bash
curl https://your-website-app/_plugin/health
```

### Test Dispatch (from another tool)
```bash
curl -X POST https://your-website-app/_plugin/dispatch \
  -H "Content-Type: application/json" \
  -H "X-Request-ID: $(uuidgen)" \
  -d '{
    "source_tool": "newsletter",
    "event_type": "newsletter.campaign.sent",
    "payload": {"campaign_id": "123", "subject": "Test"},
    "request_id": "...",
    "org_id": "..."
  }'
```

### Test Brand Tokens Export
```bash
curl "https://your-website-app/website-brand-tokens-export?siteId=<ID>&format=json"
curl "https://your-website-app/website-brand-tokens-export?siteId=<ID>&format=css"
```

---

## Benefits of This Architecture

1. **Zero Backend Coupling** - Tools discover each other via manifests
2. **Event-Driven Integration** - Pure pub/sub, no direct API calls
3. **Graceful Degradation** - Features no-op when not configured
4. **Consistent Patterns** - All tools use same core-mini framework
5. **Easy Testing** - Each tool runs standalone
6. **Future-Proof** - Add new tools without modifying existing ones

---

## Next Tool Integration

When adding Logo Creator or Newsletter Builder:
1. Copy `core-mini/` to new tool
2. Create `/.well-known/craudiovizai-plugin.json`
3. Add `/_plugin/dispatch` and `/_plugin/health` endpoints
4. Emit events, listen for events
5. No other changes needed

**Universal dashboard can discover all tools by reading their manifests.**

---

## File Structure

```
/supabase/functions/
  core-mini/
    env.ts          # Secrets guard
    auth.ts         # Org auth, license, entitlement, credits
    log.ts          # Structured logging with request_id
    ai-router.ts    # Javari-first AI router
    tracking.ts     # Signed tokens, HTML sanitization
    plugin.ts       # Plugin protocol types

  website-draft/
  website-regenerate/
  website-publish/
  website-export/
  website-form-submit/
  website-brand-tokens-export/  # NEW

  _plugin-dispatch/              # NEW - Receive cross-app events
  _plugin-health/                # NEW - Liveness check

/public/
  .well-known/
    craudiovizai-plugin.json     # NEW - Plugin manifest
```

---

## Status

✅ Core-mini framework complete
✅ Plugin manifest created
✅ Plugin endpoints deployed
✅ Brand tokens export function added
✅ All edge functions use core-mini patterns
✅ Event production documented
✅ Cross-app integration patterns defined

**Website Builder is now a fully composable plugin-enabled application.**
