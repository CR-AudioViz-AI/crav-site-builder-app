# Installation Patterns - Website Builder & Future Tools

## Overview

Website Builder (and all future tools) can be deployed in three patterns:

1. **Single App (Standalone)** - Deploy one tool independently
2. **Multiple Apps, No Dashboard** - Deploy multiple tools, auto-compose via events
3. **Multiple Apps + Universal Dashboard** - Deploy multiple tools + central dashboard (recommended)

---

## Pattern A: Single App (Standalone)

**Use Case:** You only need Website Builder, or want to test one tool in isolation.

### What's Included

Website Builder ships with:
- ✅ Plugin endpoints (`/_plugin/dispatch`, `/_plugin/health`)
- ✅ Plugin manifest (`/.well-known/craudiovizai-plugin.json`)
- ✅ Core-mini framework (`/core-mini/`)
- ✅ All edge functions (draft, publish, export, forms, brand tokens)

### Deploy Steps

```bash
# 1. Set secrets (only what this app uses)
supabase secrets set VITE_RUNTIME_MODE="cloud"
supabase secrets set CAPTCHA_PROVIDER="none"
supabase secrets set JAVARI_API_KEY="..."  # or OpenAI/Anthropic

# 2. Deploy functions
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

# 3. Deploy frontend
npm run build
# Upload dist/ to your hosting (Vercel, Netlify, etc.)

# 4. Done!
```

**That's it.** Website Builder runs standalone.

### Verify

```bash
# Check health
curl https://your-website-app.com/_plugin/health

# Check manifest
curl https://your-website-app.com/.well-known/craudiovizai-plugin.json
```

---

## Pattern B: Multiple Apps, No Dashboard

**Use Case:** Deploy Website Builder + Newsletter Builder + Logo Creator, let them auto-compose.

### How It Works

Each app:
- Reads other apps' manifests to discover capabilities
- Sends events to other apps via `/_plugin/dispatch`
- No central coordination needed

### Deploy Steps

**Deploy each app independently (same as Pattern A):**

```bash
# Website Builder
cd website-builder/
supabase functions deploy ... (8 functions)
npm run build && deploy frontend

# Newsletter Builder
cd newsletter-builder/
supabase functions deploy ... (newsletter functions)
npm run build && deploy frontend

# Logo Creator
cd logo-creator/
supabase functions deploy ... (logo functions)
npm run build && deploy frontend
```

### Configure Cross-App Discovery

**Option 1: Environment Variables**
```bash
# In each app
supabase secrets set TOOL_REGISTRY_URLS="https://website.com,https://newsletter.com,https://logo.com"
```

**Option 2: Manual Discovery (in your shell/site)**
```typescript
// Fetch manifests
const websiteManifest = await fetch("https://website.com/.well-known/craudiovizai-plugin.json").then(r => r.json());
const newsletterManifest = await fetch("https://newsletter.com/.well-known/craudiovizai-plugin.json").then(r => r.json());

// Send cross-app event
if (websiteManifest.events_produced.includes("website.site.published")) {
  await fetch(newsletterManifest.api.dispatch_url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      source_tool: "website",
      event_type: "website.site.published",
      payload: {brand_tokens: {...}},
      request_id: crypto.randomUUID(),
      org_id: "..."
    })
  });
}
```

### Auto-Composition Example

**Website publishes → Newsletter auto-styles:**

```typescript
// 1. Website Builder emits event
await emitEvent("website.site.published", orgId, {
  site_id: siteId,
  brand_tokens: {...}
});

// 2. Your orchestrator forwards to Newsletter
const newsletterManifest = await fetch("https://newsletter.com/.well-known/craudiovizai-plugin.json").then(r => r.json());

await fetch(newsletterManifest.api.dispatch_url, {
  method: "POST",
  body: JSON.stringify({
    source_tool: "website",
    event_type: "website.site.published",
    payload: {brand_tokens: {...}},
    ...
  })
});

// 3. Newsletter receives event at /_plugin/dispatch
// Automatically applies brand tokens to email templates
```

**No backend coupling. Pure event forwarding.**

---

## Pattern C: Multiple Apps + Universal Dashboard (Recommended)

**Use Case:** Deploy multiple tools + central dashboard for unified management.

### Architecture

```
┌─────────────────────────────────────────┐
│      Universal Dashboard                │
│  (discovers all apps via manifests)     │
└─────────────────────────────────────────┘
          │          │          │
          ▼          ▼          ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │Website  │ │Newsletter│ │Logo     │
    │Builder  │ │Builder   │ │Creator  │
    └─────────┘ └─────────┘ └─────────┘
```

### Deploy Steps

**1. Deploy each app independently (same as Pattern A)**

```bash
# Deploy Website Builder to https://website.yourco.com
# Deploy Newsletter Builder to https://newsletter.yourco.com
# Deploy Logo Creator to https://logo.yourco.com
```

**2. Deploy Universal Dashboard**

```bash
cd universal-dashboard/

# Set app URLs
supabase secrets set APP_BASE_URLS="https://website.yourco.com,https://newsletter.yourco.com,https://logo.yourco.com"

# Deploy dashboard functions
supabase functions deploy dashboard-discover dashboard-events dashboard-proxy

# Deploy dashboard frontend
npm run build && deploy to https://dashboard.yourco.com
```

**3. Dashboard auto-discovers apps**

On startup, dashboard:
1. Fetches each app's manifest
2. Builds navigation from routes
3. Shows available tools based on org entitlements
4. Proxies events between apps

### Dashboard Features

- **Auto-Discovery**: Reads manifests, no manual config
- **Unified Navigation**: All tools accessible from one place
- **Event Router**: Forwards events between apps
- **Entitlement Check**: Shows only tools org has access to
- **Cross-App Search**: Search across all tools
- **Unified Billing**: One credit wallet for all tools

### User Experience

```
Dashboard Home
├── Website Builder
│   ├── Sites
│   ├── Pages
│   ├── Forms
│   └── Brand Tokens
├── Newsletter Builder
│   ├── Campaigns
│   ├── Subscribers
│   └── Templates
└── Logo Creator
    ├── Generate
    └── Library
```

All tools integrated, zero manual linking.

---

## Quick Checklist (For Each New App)

Use this when building Logo Creator, Newsletter Builder, or any future tool:

### Core-Mini Framework
- [ ] Copy `/core-mini/` folder (env, auth, log, ai-router, tracking, plugin)
- [ ] Update `env.ts` to only read secrets this app needs
- [ ] Update `plugin.ts` with app-specific types

### Plugin Infrastructure
- [ ] Create `/.well-known/craudiovizai-plugin.json` manifest
  - Set `tool_key` (e.g., "logo", "newsletter")
  - List `routes`, `events_produced`, `events_consumed`
  - Define `capabilities`, `permissions`
- [ ] Add `/_plugin/dispatch` endpoint (receive cross-app events)
- [ ] Add `/_plugin/health` endpoint (liveness check)

### Credit & Idempotency
- [ ] All paid actions require `X-Idempotency-Key` header
- [ ] Check idempotency cache before processing
- [ ] Single `debit_credits` call per action
- [ ] Store result in idempotency cache on success
- [ ] Return cached result for duplicate requests

### Events
- [ ] Emit server-side events on success (via `emitEvent()`)
- [ ] Emit `asset.created` on exports/downloads
- [ ] Include `request_id` in all event payloads
- [ ] Document all events in manifest

### Security
- [ ] Enable RLS on all tables (`ALTER TABLE x ENABLE ROW LEVEL SECURITY`)
- [ ] Create restrictive policies (check `auth.uid()` and ownership)
- [ ] Verify webhook signatures (if accepting webhooks)
- [ ] Sanitize HTML (use `sanitizeHtml()` from tracking.ts)
- [ ] Add CAPTCHA on public forms (if applicable)

### UI
- [ ] Show credit cost before paid actions
- [ ] Display "out of credits" modal with top-up link
- [ ] Loading states during async operations
- [ ] Error messages with clear next steps

### Testing
- [ ] Acceptance tests (smoke + edge cases)
- [ ] Performance tests (response time < 2s for paid actions)
- [ ] Evaluation tests (AI quality if applicable)
- [ ] Structured logs with `request_id` for tracing

### Documentation
- [ ] README with setup instructions
- [ ] API documentation (if exposing public APIs)
- [ ] Event documentation (produced + consumed)
- [ ] Deployment guide

---

## Secrets Management

### Website Builder Secrets

```bash
# Required
VITE_RUNTIME_MODE="cloud"           # or self_hosted
CAPTCHA_PROVIDER="none"             # or hcaptcha/recaptcha

# AI (at least one)
JAVARI_API_KEY="..."
OPENAI_API_KEY="..."
ANTHROPIC_API_KEY="..."

# Optional
HUB_URL="https://hub.yourco.com"
HUB_SIGNING_KEY="..."
TRACKING_DOMAIN="track.yourco.com"
VERCEL_TOKEN="..."
NETLIFY_TOKEN="..."
```

### Newsletter Builder Secrets (Example)

```bash
# Required
VITE_RUNTIME_MODE="cloud"
ESP_PROVIDER="postmark"              # or sendgrid/ses/resend

# ESP Keys
POSTMARK_TOKEN="..."
# or SENDGRID_API_KEY / AWS_SES_* / RESEND_API_KEY

# AI (for content generation)
JAVARI_API_KEY="..."

# Optional
HUB_URL="..."
TRACKING_DOMAIN="..."
```

### Logo Creator Secrets (Example)

```bash
# Required
VITE_RUNTIME_MODE="cloud"

# AI (for generation)
JAVARI_API_KEY="..."
OPENAI_API_KEY="..."               # DALL-E for image generation

# Optional
HUB_URL="..."
```

**Pattern:** Only set secrets each app actually uses. Framework guards prevent errors when secrets missing.

---

## Database Strategy

### Option 1: Shared Database (Recommended for Pattern C)

All apps share one Supabase instance:
- Single credit wallet across all tools
- Cross-app queries possible
- Unified RLS policies
- One database to manage

```
Supabase Instance
├── websites schema (Website Builder)
├── newsletters schema (Newsletter Builder)
├── logos schema (Logo Creator)
└── platform schema (shared: orgs, credits, events)
```

### Option 2: Separate Databases (Pattern A/B)

Each app has its own Supabase instance:
- Complete isolation
- Independent scaling
- More operational overhead
- Credit wallets managed separately or via Hub

---

## Deployment Targets

### Frontend Deployment

Each app's frontend can be deployed to:
- **Vercel** - Recommended for Next.js/React
- **Netlify** - Good for static sites
- **Cloudflare Pages** - Fast global CDN
- **AWS Amplify** - If already on AWS
- **Self-hosted** - Docker container

### Edge Functions Deployment

Edge functions deploy to Supabase:
```bash
supabase functions deploy function-name --project-ref YOUR_REF
```

Runs on Supabase edge runtime (Deno).

---

## Monitoring & Observability

### Structured Logs

All apps use `core-mini/log.ts`:
```typescript
const log = createLogger({request_id: "...", org_id: "...", action: "..."});
log.info("Action completed", {duration_ms: 150});
```

Format:
```json
{
  "timestamp": "2025-10-09T18:00:00Z",
  "level": "info",
  "message": "Action completed",
  "request_id": "uuid",
  "org_id": "uuid",
  "action": "draft",
  "duration_ms": 150
}
```

### Metrics to Track

- **Credit usage**: `SELECT SUM(amount) FROM credit_transactions WHERE action='draft'`
- **Event throughput**: Count events emitted per day
- **API latency**: P50, P95, P99 response times
- **Error rate**: Failed requests / total requests
- **Plugin health**: Monitor `/_plugin/health` endpoints

### Tools

- **Supabase Logs** - View function logs
- **Datadog/New Relic** - APM (if self-hosted)
- **Sentry** - Error tracking
- **Grafana** - Custom dashboards

---

## Scaling

### Horizontal Scaling

- **Frontend**: CDN + multiple regions
- **Edge Functions**: Auto-scales on Supabase
- **Database**: Read replicas, connection pooling

### Cost Optimization

- **Cache aggressively**: Use `idempotency_results` table
- **Batch operations**: Group DB queries
- **Lazy load**: Don't fetch until needed
- **Compress assets**: Gzip/Brotli

---

## Migration Path

### From Single App to Multiple Apps

1. Deploy second app independently
2. Configure cross-app discovery (Pattern B)
3. Test event forwarding manually
4. Add Universal Dashboard when ready (Pattern C)

### From Multiple Apps to Dashboard

1. Deploy all apps independently (already done)
2. Deploy Universal Dashboard
3. Set `APP_BASE_URLS` in dashboard
4. Dashboard auto-discovers apps
5. No changes to existing apps needed

**Zero downtime. Additive only.**

---

## Example: Full Stack Deployment (Pattern C)

### Infrastructure

```bash
# 1. Provision Supabase
supabase projects create my-platform

# 2. Deploy Website Builder
cd website-builder/
supabase functions deploy ... (8 functions)
vercel deploy --prod

# 3. Deploy Newsletter Builder
cd newsletter-builder/
supabase functions deploy ... (newsletter functions)
vercel deploy --prod

# 4. Deploy Logo Creator
cd logo-creator/
supabase functions deploy ... (logo functions)
vercel deploy --prod

# 5. Deploy Universal Dashboard
cd universal-dashboard/
supabase secrets set APP_BASE_URLS="https://website.vercel.app,https://newsletter.vercel.app,https://logo.vercel.app"
supabase functions deploy dashboard-discover dashboard-events
vercel deploy --prod
```

### DNS Setup

```
dashboard.yourco.com  → Universal Dashboard
website.yourco.com    → Website Builder
newsletter.yourco.com → Newsletter Builder
logo.yourco.com       → Logo Creator
```

### Result

Users access `dashboard.yourco.com`, see all tools, navigate seamlessly. Apps compose via events. Zero backend coupling.

---

## Security Checklist

- [ ] All edge functions check entitlements
- [ ] All tables have RLS enabled
- [ ] All public forms use CAPTCHA
- [ ] All webhooks verify signatures
- [ ] All HTML sanitized before storage/render
- [ ] All secrets use `env.ts` guards
- [ ] All paid actions are idempotent
- [ ] All events include org_id for filtering

---

## Support & Troubleshooting

### Common Issues

**Q: Function returns 403 entitlement_required**
A: Seed tool entitlement in Tools Registry for the org.

**Q: Draft function fails with "No AI provider configured"**
A: Set at least one AI key (JAVARI_API_KEY or OPENAI_API_KEY or ANTHROPIC_API_KEY).

**Q: Cross-app events not working**
A: Check manifest URLs, verify `/_plugin/dispatch` is deployed and accessible.

**Q: Credits not debiting**
A: Check `debit_credits` RPC exists, verify idempotency key is unique per request.

**Q: RLS blocking queries**
A: Add policies for authenticated users, check `auth.uid()` is set correctly.

---

## Summary

| Pattern | Use Case | Setup Time | Complexity | Recommended For |
|---------|----------|------------|------------|-----------------|
| **A: Single App** | Testing, single tool | 15 mins | Low | POC, demos |
| **B: Multiple Apps** | Auto-compose, no dashboard | 30 mins | Medium | Power users, custom shells |
| **C: Dashboard** | Unified platform | 45 mins | Medium | Production, SaaS |

**Start with Pattern A, scale to Pattern C as needed.**

---

## Next Steps

1. **Deploy Website Builder** using Pattern A (this guide)
2. **Build Logo Creator** using the Quick Checklist
3. **Build Newsletter Builder** using the Quick Checklist
4. **Deploy Universal Dashboard** to tie everything together

**All tools ready for production with zero coupling.**
