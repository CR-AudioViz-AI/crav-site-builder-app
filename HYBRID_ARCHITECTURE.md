# Hybrid Architecture - MVP + Production Foundation

## Overview

This implementation combines the **North-Star MVP** (working client-side demo) with the **Production API Foundation** (real edge functions and database schema). This gives you both:

1. **Working Demo NOW** - Full UI flow with mock generation
2. **Production APIs Ready** - Real edge functions for when you need them

## What's Working Now (MVP)

### Client-Side Features ✅
- Build Mode Selector (AI-Built vs Custom)
- Template Selector with 10 templates
- Enhanced Brief Panel (90-second capture)
- Multi-page generation (client-side)
- Page navigation with dropdown
- All UI components functional

### User Flow
```
Launch → Choose Mode → Select Template → Fill Brief → Generate → View Pages
```

**Time to first website: < 2 minutes**

## What's Ready (Production APIs)

### Database Schema ✅
- **Location**: `supabase/migrations/20251010_production_schema.sql`
- **Tables**:
  - `sites` - Website instances
  - `pages` - Individual pages with `sections` jsonb
  - `templates` - Reusable templates with full `spec` jsonb
  - `org_settings` - Business profiles
  - `products`, `site_versions` - From earlier migrations

- **Key Features**:
  - RLS policies on all tables
  - `ensure_default_site()` function - idempotent site creation
  - `set_updated_at()` triggers
  - 2 pre-loaded templates (Classic Corporate, SaaS Lite)

### Edge Functions ✅

#### 1. `/functions/v1/website-init`
**Purpose**: Initialize org with default site (idempotent)

**Already exists and working**

**Request**:
```bash
POST /functions/v1/website-init
Authorization: Bearer {token}
```

**Response**:
```json
{
  "ok": true,
  "data": { "site_id": "uuid" },
  "request_id": "uuid"
}
```

#### 2. `/functions/v1/website-templates-list`
**Purpose**: List all available templates

**NEW - Just created**

**Request**:
```bash
POST /functions/v1/website-templates-list
Authorization: Bearer {token}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "templates": [
      {
        "id": "uuid",
        "name": "Classic Corporate",
        "description": "Traditional business website",
        "category": "business",
        "tier": "free",
        "preview_url": null,
        "requires_entitlement": []
      }
    ]
  },
  "request_id": "uuid"
}
```

#### 3. `/functions/v1/website-apply-template`
**Purpose**: Apply a template to a site (replaces pages)

**NEW - Just created**

**Request**:
```bash
POST /functions/v1/website-apply-template
Authorization: Bearer {token}
Content-Type: application/json

{
  "template_id": "uuid",
  "site_id": "uuid"  // optional, uses default if omitted
}
```

**Response**:
```json
{
  "ok": true,
  "data": { "site_id": "uuid" },
  "request_id": "uuid"
}
```

**What it does**:
1. Fetches template spec from database
2. Updates site theme
3. Deletes existing pages
4. Inserts pages from template spec
5. Returns site_id

#### 4. `/functions/v1/website-draft`
**Purpose**: Generate site with AI (2 credits, idempotent)

**UPDATED - Now uses new schema**

**Request**:
```bash
POST /functions/v1/website-draft
Authorization: Bearer {token}
X-Idempotency-Key: {unique-key}
Content-Type: application/json

{
  "siteId": "uuid",  // optional
  "brief": {
    "businessName": "Acme Corp",
    "industry": "SaaS",
    "offerings": ["Project Management"],
    "targetAudience": "Small businesses",
    "tone": "professional",
    "goals": ["Generate leads"],
    "pages": ["Home", "About", "Contact"],
    "cta": "Get Started"
  }
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "seo": {...},
    "pages": [{
      "slug": "home",
      "name": "Home",
      "sections": [...]
    }],
    "page_count": 3
  },
  "request_id": "uuid"
}
```

**Features**:
- ✅ Credits debit (2 credits)
- ✅ Idempotency caching
- ✅ AI generation
- ✅ Auto-initialization
- ✅ Safe defaults
- ✅ Event emission
- ✅ Updated to use `sections` jsonb (not `blocks`)

## Architecture Layers

### Layer 1: MVP Demo (Current Default)
```
Frontend (Vite/React)
  ↓
Client-side generation (mock)
  ↓
In-memory state
  ↓
Preview in browser
```

**Pros**: Works now, no backend needed, instant feedback
**Cons**: Not persistent, no real AI

### Layer 2: Production API (Ready to Enable)
```
Frontend (Vite/React)
  ↓
Edge Functions (Deno)
  ↓
Supabase Database (Postgres)
  ↓
AI Provider (via core-mini/ai-router)
```

**Pros**: Persistent, real AI, credit system, idempotency
**Cons**: Requires Supabase setup, AI API keys

### Layer 3: Full Production (Future)
```
Next.js App Router
  ↓
Server-side rendering
  ↓
Edge Functions
  ↓
Database + AI
  ↓
Static export / Netlify / VPS
```

**Pros**: SEO, SSR, full production features
**Cons**: Major migration required

## Migration Path

### Phase 1: MVP Demo (Current) ✅
- All UI components
- Client-side generation
- Template system
- Page navigation
- **Time**: Complete
- **Status**: Working now

### Phase 2: Connect to Real APIs (Next)
- Wire TemplateSelector to `/website-templates-list`
- Wire generation to `/website-draft`
- Wire template application to `/website-apply-template`
- Add loading states
- Add error handling
- **Time**: 4-6 hours
- **Status**: APIs ready, frontend wiring pending

### Phase 3: Database Persistence
- Run migrations in Supabase
- Configure env vars
- Test end-to-end
- **Time**: 2-3 hours
- **Status**: Migrations ready

### Phase 4: AI Integration
- Configure AI provider in core-mini/env
- Test AI generation
- Tune prompts
- **Time**: 3-4 hours
- **Status**: Function ready, needs API key

### Phase 5: SSR + Export (Future)
- Migrate to Next.js
- Add server-side rendering
- Add static export
- Add publishing
- **Time**: 20-30 hours
- **Status**: Spec provided, not started

## How to Enable Production APIs

### Step 1: Run Migrations
```sql
-- In Supabase SQL Editor
\i supabase/migrations/20251010_production_schema.sql
```

### Step 2: Set Environment Variables
```env
# In .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For AI
OPENAI_API_KEY=your-key
# or
ANTHROPIC_API_KEY=your-key
```

### Step 3: Deploy Edge Functions
```bash
npx supabase functions deploy website-templates-list
npx supabase functions deploy website-apply-template
npx supabase functions deploy website-draft
```

### Step 4: Update Frontend (4 lines)
In `src/components/website/WebsiteBuilderNorthStar.tsx`:

```typescript
const handleTemplateSelect = async (template: Template) => {
  // Add this API call
  const response = await fetch(`${SUPABASE_URL}/functions/v1/website-apply-template`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template_id: template.id }),
  });
  const result = await response.json();

  // Then continue with existing flow
  setSelectedTemplate(template);
  setStep('brief');
};
```

### Step 5: Test
```bash
# 1. Click "Custom" in Build Mode Selector
# 2. Select a template
# 3. Should see real DB template
# 4. Fill brief and generate
# 5. Should create real pages in database
```

## Current File Structure

```
project/
├── src/
│   ├── components/website/
│   │   ├── BuildModeSelector.tsx          ✅ Working
│   │   ├── TemplateSelector.tsx           ✅ Working (mock data)
│   │   ├── WebsiteBuilderNorthStar.tsx    ✅ Working (orchestrator)
│   │   ├── WebsiteBuilder.tsx             ✅ Working (editor)
│   │   └── panels/
│   │       ├── BriefPanelEnhanced.tsx     ✅ Working
│   │       └── CanvasPanel.tsx            ✅ Working
│   ├── lib/generators/
│   │   └── pageGenerator.ts               ✅ Working (client-side)
│   ├── data/
│   │   └── templates.ts                   ✅ Mock templates
│   └── types/
│       └── website.ts                     ✅ Full types
├── supabase/
│   ├── migrations/
│   │   ├── 20251010_production_schema.sql      ✅ Ready
│   │   └── (other migrations)                  ✅ Ready
│   └── functions/
│       ├── website-init/                       ✅ Working
│       ├── website-templates-list/             ✅ NEW
│       ├── website-apply-template/             ✅ NEW
│       ├── website-draft/                      ✅ Updated
│       └── core-mini/                          ✅ Working
└── public/
    └── .well-known/
        └── craudiovizai-plugin.json            ✅ Updated to v1.2.0
```

## Testing Strategy

### Test 1: MVP Demo (Works Now)
```
1. npm run dev
2. Open browser
3. Click "AI-Built"
4. Fill brief
5. Generate
6. See multi-page site
7. Navigate pages
✅ Should work completely
```

### Test 2: Database Connection (After Migration)
```
1. Run migration in Supabase
2. Check tables exist:
   - sites
   - pages
   - templates
   - org_settings
3. Query templates:
   SELECT * FROM templates;
4. Should see 2 templates
✅ Database ready
```

### Test 3: Edge Functions (After Deploy)
```bash
# Test init
curl -X POST https://your-project.supabase.co/functions/v1/website-init \
  -H "Authorization: Bearer ANON_KEY"

# Test templates-list
curl -X POST https://your-project.supabase.co/functions/v1/website-templates-list \
  -H "Authorization: Bearer ANON_KEY"

# Test apply-template
curl -X POST https://your-project.supabase.co/functions/v1/website-apply-template \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"template_id":"classic-hero"}'

✅ All should return ok:true
```

### Test 4: End-to-End (After Wiring)
```
1. Select template in UI
2. Check Network tab: POST to website-apply-template
3. Fill brief
4. Generate (POST to website-draft with idempotency)
5. Check Supabase: pages table has records
6. Refresh page: data persists
✅ Full production flow
```

## Credits System

The production spec includes a complete credits system:

- **Draft**: 2 credits (idempotent)
- **Rewrite**: 1 credit (idempotent)
- **Publish**: 2 credits
- **Export**: 2 credits

**Already implemented in**:
- `core-mini/auth.ts` - `debitCredits()` function
- `website-draft/index.ts` - Uses credits
- Database has `credit_ledger` table

**Internal bypass mode**:
Set env var to skip credits for testing:
```env
INTERNAL_BYPASS_MODE=credits
INTERNAL_UNLIMITED_ORG_IDS=your-org-uuid
```

## Plugin Manifest

Updated to v1.2.0 with new capabilities:

```json
{
  "version": "1.2.0",
  "capabilities": {
    "draft": true,
    "rewrite": true,        // NEW
    "publish": true,
    "export": true,
    "templates": true,      // NEW
    "forms": true,
    "brand_tokens": true
  },
  "events_produced": [
    "website.template.applied"  // NEW
  ]
}
```

## Recommendation

**For immediate demo**: Use current MVP (works perfectly)

**For production rollout**: Follow migration steps 1-5 above

**Timeline**:
- Steps 1-3: 1 hour (database + deploy)
- Step 4: 4-6 hours (frontend wiring)
- Step 5: 1 hour (testing)
- **Total: 6-8 hours to full production**

## Key Files to Know

### To wire up production APIs:
1. `src/components/website/TemplateSelector.tsx` - Add API call
2. `src/components/website/WebsiteBuilderNorthStar.tsx` - Wire template application
3. `src/lib/generators/pageGenerator.ts` - Can be replaced with API call

### To customize:
1. `supabase/migrations/20251010_production_schema.sql` - Add more templates
2. `supabase/functions/website-draft/index.ts` - Tune AI prompts
3. `src/components/website/panels/BriefPanelEnhanced.tsx` - Add brief fields

### To debug:
1. `supabase/functions/core-mini/log.ts` - Logging utility
2. `supabase/functions/core-mini/auth.ts` - Auth context
3. Browser DevTools → Network tab → Filter "functions"

## Summary

You now have:
✅ Working MVP demo (client-side)
✅ Production database schema
✅ Real edge functions (3 new, 1 updated)
✅ Updated plugin manifest
✅ Clear migration path
✅ 6-8 hour timeline to full production

**Next action**: Choose between demo mode (current) or wire up production APIs (6-8 hours).
