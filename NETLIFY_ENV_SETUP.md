# Netlify Environment Variable Setup

Your preview builds are failing because environment variables are missing on Netlify.

## Quick Fix (via Netlify CLI)

```bash
# Authenticate once
netlify login

# Set required variables for ALL contexts
netlify env:set VITE_RUNTIME_MODE "cloud"
netlify env:set CSP_REPORT_ONLY "true"
netlify env:set INTERNAL_BYPASS_MODE "off"
netlify env:set INTERNAL_UNLIMITED_ORG_IDS ""
netlify env:set HUB_URL "disabled"
netlify env:set HUB_SIGNING_KEY "disabled"

# Set your Supabase vars (REQUIRED for app to work)
netlify env:set VITE_SUPABASE_URL "https://glyylxntrnrzilybpsky.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseXlseG50cm5yemlseWJwc2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MDIxMDYsImV4cCI6MjA3NTQ3ODEwNn0.DXPe66v6wt8-d4D2FYR--EJdEH-nfh_Nnq70YU3LLww"

# Verify
netlify env:list

# Trigger a new deploy
git commit --allow-empty -m "trigger deploy with env vars" && git push
```

## Alternative: Netlify UI

1. Go to your site dashboard: https://app.netlify.com
2. Navigate to: **Site settings → Environment variables**
3. Click **Add a variable**
4. Add each variable below to **all scopes** (Production, Deploy Previews, Branch deploys):

| Variable | Value |
|----------|-------|
| `VITE_RUNTIME_MODE` | `cloud` |
| `CSP_REPORT_ONLY` | `true` |
| `INTERNAL_BYPASS_MODE` | `off` |
| `INTERNAL_UNLIMITED_ORG_IDS` | *(leave empty)* |
| `HUB_URL` | `disabled` |
| `HUB_SIGNING_KEY` | `disabled` |
| `VITE_SUPABASE_URL` | `https://glyylxntrnrzilybpsky.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` *(full key from .env)* |

5. Click **Save**
6. Trigger a new deploy (push a commit or click "Trigger deploy" in the Deploys tab)

## What Changed

1. **Fixed build error**: Removed missing component imports from PreviewPage.tsx
2. **Added env validation**: `scripts/env-check.mjs` runs before every build
3. **Created netlify.toml**: Auto-sets safe defaults for preview/prod contexts
4. **Fixed .env**: Changed `INTERNAL_BYPASS_MODE=false` to `off` (correct format)

## Verify It Works

After setting env vars, your next preview build should:
1. Pass the env-check preflight
2. Complete the Vite build successfully
3. Deploy without errors

Check build logs for:
```
✅ Env check passed: { ... }
✓ built in X.XXs
```
