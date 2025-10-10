# Deployment Secrets - Website Builder

This guide explains which secrets to set for deployment.

---

## Required Secrets (Bolt Deployment)

When deploying to Bolt, set these **three** secrets:

### 1. VITE_RUNTIME_MODE
```bash
VITE_RUNTIME_MODE=cloud
```
**Purpose:** Tells the app it's running in cloud mode (not self-hosted)

### 2. HUB_URL
```bash
HUB_URL=disabled
```
**Purpose:** Disables Hub/event bus (recommended for initial deployment)

### 3. HUB_SIGNING_KEY
```bash
HUB_SIGNING_KEY=disabled
```
**Purpose:** Disables Hub signing (recommended for initial deployment)

---

## How to Set Secrets in Bolt

1. Open your project in Bolt
2. Go to Settings → Environment Variables
3. Add the three secrets above
4. Deploy your functions

---

## Optional Secrets (Recommended for Production)

### CAPTCHA Protection

To prevent spam on form submissions:

```bash
CAPTCHA_PROVIDER=hcaptcha
HCAPTCHA_SECRET=your-hcaptcha-secret-key
```

Or for Google reCAPTCHA:

```bash
CAPTCHA_PROVIDER=recaptcha
RECAPTCHA_SECRET=your-recaptcha-secret-key
```

**How to get CAPTCHA keys:**
- hCaptcha: https://www.hcaptcha.com/ (free tier available)
- reCAPTCHA: https://www.google.com/recaptcha/ (free)

---

## Advanced Optional Secrets

### Deploy Providers

To enable automatic deployment to Vercel/Netlify:

```bash
VERCEL_TOKEN=your-vercel-token
NETLIFY_TOKEN=your-netlify-token
```

### Tracking Domain

For signed open/click tokens (email tracking):

```bash
TRACKING_DOMAIN=track.yourdomain.com
```

### AI Providers

The app uses Javari-first with fallbacks. All are optional:

```bash
JAVARI_API_URL=https://api.javari.ai
JAVARI_API_KEY=your-javari-key
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

---

## Supabase Secrets (Auto-Populated)

These are automatically available in Supabase Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

**No need to set these manually.**

---

## Verification

After setting secrets, verify they work:

### 1. Check Runtime Mode
Deploy and call any function. Logs should show:
```
"mode": "cloud"
```

### 2. Check Hub Status
Logs should show:
```
"[hub] disabled; skip push"
```

### 3. Check CAPTCHA
If `CAPTCHA_PROVIDER=none`:
- Form submissions work without CAPTCHA token

If `CAPTCHA_PROVIDER=hcaptcha`:
- Form submissions require valid CAPTCHA token

---

## Troubleshooting

### Hub Errors
If you see Hub connection errors, ensure:
```bash
HUB_URL=disabled
HUB_SIGNING_KEY=disabled
```

### CAPTCHA Errors
If CAPTCHA verification fails:
1. Check `CAPTCHA_PROVIDER` is set correctly
2. Check secret key matches your CAPTCHA provider
3. Verify site key in frontend matches secret key

### AI Errors
If AI generation fails:
1. Check at least one AI provider key is set
2. Check Javari URL is correct (if using Javari)
3. Verify API keys are valid

---

## Enabling Hub Later

When you're ready to enable cross-app events:

1. Deploy a Hub service
2. Update secrets:
   ```bash
   HUB_URL=https://your-hub-url.com
   HUB_SIGNING_KEY=your-actual-signing-key
   ```
3. Redeploy functions

The app will automatically start pushing events to Hub.

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env` files locally (git-ignored)
   - Use Bolt/Supabase secret management for deployment

2. **Rotate secrets regularly**
   - Especially API keys and signing keys

3. **Use restrictive secrets**
   - Deploy tokens: scope to specific projects
   - API keys: set rate limits

4. **Monitor usage**
   - Check CAPTCHA solve rates
   - Monitor AI API costs
   - Watch for unusual form submissions

---

## Quick Reference

| Secret | Required? | Default | Purpose |
|--------|-----------|---------|---------|
| VITE_RUNTIME_MODE | ✅ Yes | cloud | Runtime environment |
| HUB_URL | ✅ Yes | disabled | Event bus URL (disable for now) |
| HUB_SIGNING_KEY | ✅ Yes | disabled | Event signing (disable for now) |
| CAPTCHA_PROVIDER | ⚠️ Recommended | none | Spam prevention |
| HCAPTCHA_SECRET | ⚠️ If using hCaptcha | - | hCaptcha verification |
| RECAPTCHA_SECRET | ⚠️ If using reCAPTCHA | - | reCAPTCHA verification |
| VERCEL_TOKEN | ⬜ Optional | - | Auto-deploy to Vercel |
| NETLIFY_TOKEN | ⬜ Optional | - | Auto-deploy to Netlify |
| TRACKING_DOMAIN | ⬜ Optional | - | Email tracking |
| JAVARI_API_KEY | ⬜ Optional | - | AI generation (Javari) |
| OPENAI_API_KEY | ⬜ Optional | - | AI generation (OpenAI fallback) |
| ANTHROPIC_API_KEY | ⬜ Optional | - | AI generation (Anthropic fallback) |

---

## Minimal Deployment (Start Here)

For your first deployment, set **only these three**:

```bash
VITE_RUNTIME_MODE=cloud
HUB_URL=disabled
HUB_SIGNING_KEY=disabled
```

Add others as needed for production features.

---

**Ready to deploy! See UPDATED_DEPLOYMENT_CHECKLIST.md for next steps.**
