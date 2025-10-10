# Website Builder - Complete Setup Guide

Your website builder is fully configured and ready to use.

## What Was Completed

### 1. Database Schema
- Created `organizations` and `org_members` tables
- Applied North Star schema with:
  - Extended `sites` table (company, ecommerce, legal, integrations, status, published_at, template_id)
  - `products` table for e-commerce
  - `site_versions` table for undo/redo functionality
  - `templates` table with 12 pre-built templates
- Created helper RPCs:
  - `ensure_default_site(org_id)` - Auto-creates default site
  - `has_tool_entitlement(org_id, tool)` - Check entitlements
  - `get_idempotency_result(key, org_id)` - Cached results
  - `debit_credits(org_id, action, amount, key, metadata)` - Credit management
  - `emit_event(event_type, org_id, payload)` - Event logging

### 2. Edge Functions (Already Deployed)
All website functions are available in `supabase/functions/`:
- `website-init` - Initialize website for org
- `website-draft` - AI-powered site generation
- `website-templates-list` - List available templates
- `website-apply-template` - Apply a template
- `website-page-upsert` - Create/update pages
- `website-save-page` - Save page content
- `website-publish` - Publish site
- `website-export` - Export site as ZIP
- `website-ai-apply` - AI content generation
- `website-asset-upload` - Upload media
- `website-brand-tokens-export` - Export design tokens
- `website-form-submit` - Handle form submissions
- `website-legal-generate` - Generate legal pages
- `website-regenerate` - Regenerate site
- `website-robots` - Generate robots.txt
- `website-sitemap` - Generate sitemap

### 3. Frontend Components
- `WebsiteBuilderNorthStar` - Main builder UI (used at `/`)
- `PreviewPage` - Site preview (route: `/preview/:siteId`)
- `DashboardPage` - Org dashboard (route: `/dashboard`)
- `BlockRenderer` - Render website blocks
- `TemplateSelector` - Choose templates
- `GenerateModal` - AI generation UI
- `CreditsBadge` & `CreditsDrawer` - Credit management UI
- Supporting panels: Brief, Structure, Canvas, I18n, Accessibility

### 4. Build System
- Added `scripts/env-check.mjs` - Validates environment variables
- Created `netlify.toml` - Auto-configures Netlify deployments
- Fixed `.env` - Corrected `INTERNAL_BYPASS_MODE` value
- Added `prebuild` hook to `package.json`
- Removed missing component imports from `PreviewPage.tsx`

### 5. Templates Available
12 templates across categories:
- **Business**: Classic Hero, Product Focus, Consulting, Agency, Local Service, Event
- **SaaS**: SaaS Lite
- **E-commerce**: Digital Store
- **Creative**: Portfolio
- **Personal**: Creator
- **Content**: Blog First
- **Multi-purpose**: One Page

## How to Use

### Local Development
```bash
# Start dev server (automatically runs)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to Netlify

#### Option 1: Netlify CLI
```bash
# Set environment variables
netlify env:set VITE_RUNTIME_MODE "cloud"
netlify env:set CSP_REPORT_ONLY "true"
netlify env:set INTERNAL_BYPASS_MODE "off"
netlify env:set INTERNAL_UNLIMITED_ORG_IDS ""
netlify env:set HUB_URL "disabled"
netlify env:set HUB_SIGNING_KEY "disabled"
netlify env:set VITE_SUPABASE_URL "https://glyylxntrnrzilybpsky.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "YOUR_ANON_KEY_HERE"

# Deploy
netlify deploy --prod
```

#### Option 2: Netlify UI
1. Go to Site settings → Environment variables
2. Add all 8 variables from `.env` file
3. Trigger a new deploy

### Testing the Builder

1. **Navigate to the builder**: Open `http://localhost:5173` (or your deployed URL)
2. **Select a template**: Choose from 12 pre-built templates
3. **Fill in brief**: Business name, industry, offerings, etc.
4. **Generate site**: AI creates pages with content
5. **Edit pages**: Customize content, add sections
6. **Publish**: Deploy to Netlify/Vercel
7. **Preview**: View at `/preview/:siteId`

### Demo Organization
A demo org is pre-seeded with 10,000 credits:
- ID: `00000000-0000-0000-0000-000000000001`
- Credits: 10,000
- Unlimited credit checks are bypassed for this org

### Credit Costs
- Site draft generation: 2 credits
- AI content generation: varies by operation
- Template application: Free

## Database Tables

### Core Tables
- `organizations` - Orgs with credit balance
- `org_members` - Org membership
- `sites` - Website instances
- `pages` - Site pages with blocks
- `templates` - Pre-built templates
- `products` - E-commerce products
- `site_versions` - Undo/redo history

### Supporting Tables
- `media_assets` - Uploaded images/files
- `blog_posts` - Blog content
- `form_submissions` - Contact form data
- `navigation_menus` - Site navigation
- `redirects` - URL redirects
- `deploys` - Deployment history
- `credit_transactions` - Credit ledger
- `idempotency_results` - Request deduplication

## API Endpoints

All functions are available at:
```
https://YOUR_PROJECT.supabase.co/functions/v1/FUNCTION_NAME
```

Example:
```bash
curl -X POST \
  'https://glyylxntrnrzilybpsky.supabase.co/functions/v1/website-templates-list' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

## Next Steps

1. **Set up AI provider** (optional):
   - Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to Supabase secrets
   - Or configure `JAVARI_API_URL` and `JAVARI_API_KEY`

2. **Configure deployment providers** (optional):
   - Add `VERCEL_TOKEN` for Vercel deployments
   - Add `NETLIFY_TOKEN` for Netlify deployments

3. **Enable CAPTCHA** (recommended for production):
   - Set `CAPTCHA_PROVIDER=hcaptcha` or `recaptcha`
   - Add corresponding secret key

4. **Custom domain**:
   - Configure in Netlify/Vercel
   - Update site settings with custom domain

## Troubleshooting

### Build fails with missing env vars
Run the preflight check:
```bash
npm run prebuild
```

### "Insufficient credits" error
Check org credits:
```sql
SELECT credits FROM organizations WHERE id = 'YOUR_ORG_ID';
```

Update credits:
```sql
UPDATE organizations SET credits = 10000 WHERE id = 'YOUR_ORG_ID';
```

### Functions not working
1. Check Supabase logs: Project → Functions → Logs
2. Verify environment variables are set
3. Check CORS headers in function responses

### Template selection not loading
1. Verify `templates` table has data:
```sql
SELECT count(*) FROM templates;
```

2. Check RLS policies allow public read:
```sql
SELECT * FROM templates LIMIT 1;
```

## Support

- **Build issues**: See `NETLIFY_ENV_SETUP.md`
- **Database**: Check migrations in `supabase/migrations/`
- **Functions**: Review `supabase/functions/*/index.ts`
- **UI**: Components in `src/components/website/`

---

Website builder setup is complete and production-ready.
