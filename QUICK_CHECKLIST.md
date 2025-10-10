# Quick Checklist - For Each New App

Use this when building Logo Creator, Newsletter Builder, or any future tool in the CrAudioVizAI platform.

---

## ✅ Core-Mini Framework

### 1. Copy Framework Files
- [ ] Copy `/supabase/functions/core-mini/` from Website Builder
- [ ] Files to copy:
  - `env.ts` - Secrets guard
  - `auth.ts` - Org auth, license, entitlement, credits
  - `log.ts` - Structured logging
  - `ai-router.ts` - AI model router
  - `tracking.ts` - Signed tokens, HTML sanitization
  - `plugin.ts` - Plugin protocol types

### 2. Update env.ts
- [ ] Only include secrets this app uses
- [ ] Remove unused secrets (e.g., if no CAPTCHA, remove CAPTCHA config)
- [ ] Add app-specific secrets (e.g., ESP keys for Newsletter)
- [ ] All secrets have `.enabled()` guards

Example:
```typescript
export const ESP = {
  provider: (get("ESP_PROVIDER") || "none").toLowerCase() as "none" | "postmark" | "sendgrid",
  token(): string {
    if (this.provider === "postmark") return get("POSTMARK_TOKEN") || "";
    if (this.provider === "sendgrid") return get("SENDGRID_API_KEY") || "";
    return "";
  },
  enabled(): boolean { return this.provider !== "none" && !!this.token(); }
};
```

---

## ✅ Plugin Infrastructure

### 3. Create Plugin Manifest
- [ ] Create `/.well-known/craudiovizai-plugin.json`
- [ ] Set unique `tool_key` (e.g., "logo", "newsletter", "builder")
- [ ] List all `routes` this app handles
- [ ] List all `events_produced`
- [ ] List all `events_consumed` (optional)
- [ ] Define `capabilities` (boolean flags)
- [ ] Define `permissions` (strings like "logo:read", "logo:write")
- [ ] List `adapters` if applicable (e.g., ESP providers)
- [ ] List `public_endpoints` if any

Template:
```json
{
  "tool_key": "logo",
  "name": "Logo Creator",
  "version": "1.0.0",
  "routes": ["/logo", "/logo/generate", "/logo/library"],
  "events_produced": ["logo.created", "asset.created"],
  "events_consumed": ["website.brand.exported"],
  "capabilities": {"generate": true, "vectorize": true, "variants": true},
  "permissions": ["logo:read", "logo:write"],
  "api": {
    "dispatch_url": "/_plugin/dispatch",
    "manifest_url": "/.well-known/craudiovizai-plugin.json",
    "health_url": "/_plugin/health"
  }
}
```

### 4. Add Plugin Endpoints

**/_plugin/dispatch (POST)**
- [ ] Create `/supabase/functions/_plugin-dispatch/index.ts`
- [ ] Accept `PluginDispatchRequest` (source_tool, event_type, payload, request_id, org_id)
- [ ] Handle relevant events (e.g., logo app handles `website.brand.exported`)
- [ ] Return `PluginDispatchResponse` (ok, handled, data?, request_id)
- [ ] Use `createLogger()` for structured logs

Template:
```typescript
import type { PluginDispatchRequest, PluginDispatchResponse } from "../core-mini/plugin.ts";
import { createLogger } from "../core-mini/log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Request-ID",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const requestId = req.headers.get("X-Request-ID") || crypto.randomUUID();
  const log = createLogger({ request_id: requestId, action: "plugin.dispatch" });

  try {
    const body: PluginDispatchRequest = await req.json();
    const { source_tool, event_type, payload, org_id } = body;

    let handled = false;
    let data: any = null;

    if (event_type === "website.brand.exported") {
      log.info("Handling website.brand.exported event");
      // Apply brand tokens to logo generation
      handled = true;
      data = { message: "Brand tokens received" };
    }

    const response: PluginDispatchResponse = {
      ok: true,
      handled,
      data,
      request_id: requestId,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log.error("Plugin dispatch failed", { error: error.message });
    return new Response(
      JSON.stringify({ ok: false, handled: false, error: error.message, request_id: requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**/_plugin/health (GET)**
- [ ] Create `/supabase/functions/_plugin-health/index.ts`
- [ ] Return `PluginHealthResponse` (ok, tool_key, version, timestamp)

Template:
```typescript
import type { PluginHealthResponse } from "../core-mini/plugin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const response: PluginHealthResponse = {
    ok: true,
    tool_key: "logo",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

---

## ✅ Credit & Idempotency

### 5. Paid Actions Pattern
- [ ] All paid actions require `X-Idempotency-Key` header
- [ ] Check idempotency cache BEFORE processing: `getIdempotencyResult(key, orgId)`
- [ ] Return cached result if found
- [ ] Check entitlement: `requireEntitlement(orgId, tool_key)`
- [ ] Check license (if self-hosted): `requireLicenseIfSelfHosted()`
- [ ] Single `debitCredits(orgId, action, amount, key, metadata)` call
- [ ] Process action (AI generation, export, etc.)
- [ ] Emit event on success: `emitEvent(event_type, orgId, payload)`
- [ ] Store result in cache: `storeIdempotencyResult(key, orgId, result)`
- [ ] Return result

Template:
```typescript
import {
  getIdempotencyResult,
  storeIdempotencyResult,
  requireEntitlement,
  requireLicenseIfSelfHosted,
  debitCredits,
  emitEvent,
  getAuthContext,
} from "../core-mini/auth.ts";
import { createLogger } from "../core-mini/log.ts";

const CREDIT_COST = 2;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const idempotencyKey = req.headers.get("X-Idempotency-Key");
    if (!idempotencyKey) {
      return new Response(
        JSON.stringify({ error: "X-Idempotency-Key header required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ctx = await getAuthContext(req);
    const log = createLogger({ request_id: ctx.requestId, org_id: ctx.orgId, action: "generate" });

    // Check cache
    const cached = await getIdempotencyResult(idempotencyKey, ctx.orgId);
    if (cached) {
      log.info("Returning cached result");
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check entitlement
    await requireEntitlement(ctx.orgId, "logo");

    // Check license
    await requireLicenseIfSelfHosted();

    // Debit credits
    await debitCredits(ctx.orgId, "logo-generate", CREDIT_COST, idempotencyKey, {});

    // Generate (your logic here)
    const result = { logo_url: "...", variants: [...] };

    // Emit event
    await emitEvent("logo.created", ctx.orgId, {
      logo_url: result.logo_url,
      request_id: ctx.requestId,
    });

    // Store in cache
    await storeIdempotencyResult(idempotencyKey, ctx.orgId, result);

    log.info("Generation complete", { logo_url: result.logo_url });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error.message === "entitlement_required" || error.message === "license_invalid" ? 403 : 500;
    return new Response(
      JSON.stringify({ error: error.message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## ✅ Events

### 6. Event Production
- [ ] Emit server-side events on success
- [ ] Use `emitEvent(event_type, org_id, payload)` from `core-mini/auth.ts`
- [ ] Include `request_id` in payload for tracing
- [ ] Document all events in plugin manifest

Standard events:
- `{tool}.{resource}.created` - When resource created (e.g., `logo.created`)
- `{tool}.{resource}.updated` - When resource updated
- `{tool}.{resource}.deleted` - When resource deleted
- `asset.created` - When exporting/downloading (all tools)

Example:
```typescript
await emitEvent("logo.created", orgId, {
  logo_id: logo.id,
  logo_url: logo.url,
  variants: logo.variants,
  request_id: ctx.requestId,
});

await emitEvent("asset.created", orgId, {
  asset_id: asset.id,
  kind: "logo",
  url: asset.url,
  request_id: ctx.requestId,
});
```

### 7. Event Consumption
- [ ] Handle incoming events in `/_plugin/dispatch`
- [ ] Check `event_type` and process accordingly
- [ ] Return `{ok: true, handled: true}` if processed
- [ ] Return `{ok: true, handled: false}` if not relevant

---

## ✅ Security

### 8. Row Level Security
- [ ] Enable RLS on ALL tables: `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- [ ] Create restrictive policies:
  - SELECT: Check `auth.uid()` and ownership
  - INSERT: Check `auth.uid()` and WITH CHECK
  - UPDATE: Check `auth.uid()` and ownership
  - DELETE: Check `auth.uid()` and ownership
- [ ] Test policies: Verify users can only access their data

Example:
```sql
ALTER TABLE logos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logos"
  ON logos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own logos"
  ON logos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### 9. Input Validation
- [ ] Sanitize HTML: Use `sanitizeHtml()` from `core-mini/tracking.ts`
- [ ] Verify webhook signatures (if accepting webhooks)
- [ ] Add CAPTCHA on public forms: Use `CAPTCHA` guard from `core-mini/env.ts`
- [ ] Validate all request parameters

### 10. Secrets Guard
- [ ] All secrets loaded via `core-mini/env.ts`
- [ ] Use `.enabled()` checks before accessing features
- [ ] Graceful degradation when secrets missing

---

## ✅ UI/UX

### 11. Cost Display
- [ ] Show credit cost BEFORE paid actions
- [ ] Format: "Generate Logo (2 credits)"
- [ ] Disable button if insufficient credits
- [ ] Show current credit balance in header

### 12. Out of Credits Modal
- [ ] Detect 402 or `insufficient_credits` errors
- [ ] Show modal with:
  - Current balance
  - Required credits
  - Top-up link/button
- [ ] Prevent action until topped up

### 13. Loading States
- [ ] Show spinner/skeleton during async operations
- [ ] Disable buttons during processing
- [ ] Show progress if operation is long (e.g., AI generation)

### 14. Error Handling
- [ ] Show user-friendly error messages
- [ ] Provide clear next steps (e.g., "Top up credits", "Contact support")
- [ ] Log detailed errors server-side
- [ ] Don't expose internal error details to users

---

## ✅ Testing

### 15. Acceptance Tests
- [ ] Smoke tests (happy path for each function)
- [ ] Edge cases (missing params, invalid data)
- [ ] Error cases (403, 404, 500)
- [ ] Idempotency test (same key = same result, no double charge)

### 16. Performance Tests
- [ ] Response time < 2s for paid actions
- [ ] Response time < 500ms for reads
- [ ] Database queries optimized (use indexes)
- [ ] AI calls timeout appropriately

### 17. Evaluation Tests (AI)
- [ ] Quality checks (if using AI)
- [ ] Consistency checks (same input = similar output)
- [ ] Bias checks (if applicable)

### 18. Structured Logs
- [ ] All logs include `request_id`
- [ ] Use `createLogger()` from `core-mini/log.ts`
- [ ] Log format: `{timestamp, level, message, request_id, org_id, action, ...}`

---

## ✅ Documentation

### 19. README
- [ ] Project overview
- [ ] Setup instructions (secrets, deploy)
- [ ] Development workflow
- [ ] Testing instructions

### 20. API Documentation
- [ ] List all edge functions
- [ ] Document request/response formats
- [ ] Document credit costs
- [ ] Document error codes

### 21. Event Documentation
- [ ] List all events produced
- [ ] List all events consumed
- [ ] Document event payloads
- [ ] Provide event flow diagrams

### 22. Deployment Guide
- [ ] Step-by-step deployment instructions
- [ ] Secrets configuration
- [ ] Function deployment commands
- [ ] Frontend deployment steps
- [ ] Verification steps

---

## 📦 Final Checks

- [ ] Frontend builds without errors
- [ ] All edge functions deploy successfully
- [ ] Plugin manifest accessible
- [ ] Health endpoint returns 200
- [ ] Dispatch endpoint handles events
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Secrets documented

---

## 🚀 Deploy Commands

```bash
# 1. Set secrets
supabase secrets set VITE_RUNTIME_MODE="cloud"
supabase secrets set {APP_SPECIFIC_SECRETS}="..."

# 2. Deploy functions
supabase functions deploy \
  {app}-generate \
  {app}-export \
  {app}-list \
  _plugin-dispatch \
  _plugin-health

# 3. Build and deploy frontend
npm run build
vercel deploy --prod  # or your hosting provider

# 4. Verify
curl https://your-app.com/_plugin/health
curl https://your-app.com/.well-known/craudiovizai-plugin.json
```

---

## ✅ Ready to Ship

When all checkboxes are marked:
- ✅ App is production-ready
- ✅ Plugin-enabled and discoverable
- ✅ Can compose with other tools
- ✅ Ready for Universal Dashboard integration

---

**Use this checklist for every new tool. Copy core-mini, implement the patterns, ship.**
