# Bolt Setup Guide - Website Builder

Quick setup guide for deploying Website Builder in Bolt.

---

## Step 1: Add Secrets in Bolt

In Bolt, go to **Settings → Environment Variables** and add these **three** secrets:

```bash
VITE_RUNTIME_MODE=cloud
HUB_URL=disabled
HUB_SIGNING_KEY=disabled
```

### Why These Secrets?

- **VITE_RUNTIME_MODE=cloud**: Tells the app it's running in cloud mode
- **HUB_URL=disabled**: Disables event bus (recommended for initial deployment)
- **HUB_SIGNING_KEY=disabled**: Disables Hub signing

The `env.ts` file will detect "disabled" and skip Hub push:
```typescript
enabled(): boolean {
  const url = this.url.toLowerCase();
  const key = this.key.toLowerCase();
  if (url === "disabled" || key === "disabled" || !this.url || !this.key) return false;
  return true;
}
```

---

## Step 2: Deploy Functions

Deploy all Website Builder functions:

```bash
supabase functions deploy website-draft
supabase functions deploy website-publish
supabase functions deploy website-form-submit
supabase functions deploy website-brand-tokens-export
supabase functions deploy website-regenerate
supabase functions deploy website-save-page
supabase functions deploy _plugin-dispatch
supabase functions deploy _plugin-health
```

Or deploy all at once:
```bash
supabase functions deploy website-draft website-publish website-form-submit website-brand-tokens-export website-regenerate website-save-page _plugin-dispatch _plugin-health
```

---

## Step 3: Deploy Frontend

```bash
npm run build
```

Upload the `dist/` folder to your hosting provider.

---

## Step 4: Verify Deployment

### Check Plugin Manifest
```bash
curl https://your-domain.com/.well-known/craudiovizai-plugin.json
```

Should return:
```json
{
  "tool_key": "website",
  "name": "Website Builder",
  "version": "1.0.0",
  ...
}
```

### Check Health Endpoint
```bash
curl https://your-domain.com/functions/v1/_plugin-health
```

Should return:
```json
{
  "ok": true,
  "tool_key": "website",
  "version": "1.0.0",
  "timestamp": "..."
}
```

### Check Function Logs

In Supabase Dashboard → Edge Functions → Logs, you should see:
```
"[hub] disabled; skip push"
```

This confirms Hub is properly disabled.

---

## Optional: Add CAPTCHA (Recommended)

To prevent spam on form submissions, add CAPTCHA:

### For hCaptcha:
```bash
CAPTCHA_PROVIDER=hcaptcha
HCAPTCHA_SECRET=your-hcaptcha-secret
```

Get keys at: https://www.hcaptcha.com/

### For Google reCAPTCHA:
```bash
CAPTCHA_PROVIDER=recaptcha
RECAPTCHA_SECRET=your-recaptcha-secret
```

Get keys at: https://www.google.com/recaptcha/

---

## Optional: Add AI Provider Keys

For AI-powered site generation, add at least one provider:

```bash
JAVARI_API_KEY=your-javari-key
```

Or fallback to:
```bash
OPENAI_API_KEY=your-openai-key
```

Or:
```bash
ANTHROPIC_API_KEY=your-anthropic-key
```

The AI router tries Javari → OpenAI → Anthropic in order.

---

## Troubleshooting

### "Hub connection failed"
✅ **Solution:** Ensure secrets are set:
```bash
HUB_URL=disabled
HUB_SIGNING_KEY=disabled
```

### "CAPTCHA verification failed"
⚠️ **Check:**
1. `CAPTCHA_PROVIDER` matches your provider (hcaptcha/recaptcha)
2. Secret key is correct
3. Site key in frontend matches

### "AI generation failed"
⚠️ **Check:**
1. At least one AI provider key is set
2. API key is valid and has credits
3. Check function logs for specific error

### Form submissions not working
⚠️ **Check:**
1. If CAPTCHA enabled, frontend sends valid token
2. Check browser console for errors
3. Check function logs in Supabase

---

## What's Working With These Secrets?

✅ Website draft generation (if AI key provided)
✅ Page editing and saving
✅ Site publishing
✅ Form submissions (without CAPTCHA if not configured)
✅ Brand tokens export
✅ Plugin discovery via manifest
✅ Health checks

❌ Hub event push (disabled, as intended)
❌ CAPTCHA verification (if not configured)

---

## Enabling Hub Later

When ready for cross-app events:

1. Deploy a Hub service
2. Update secrets:
   ```bash
   HUB_URL=https://your-hub.com
   HUB_SIGNING_KEY=actual-signing-key
   ```
3. Redeploy functions

Functions will automatically start pushing events.

---

## Security Checklist

- [x] Secrets in Bolt (not in code)
- [x] Hub disabled for initial deployment
- [ ] CAPTCHA enabled (recommended for production)
- [ ] AI provider keys set (required for generation)
- [ ] RLS policies tested
- [ ] Rate limiting configured (Supabase dashboard)

---

## Quick Reference

| Secret | Value | Required? |
|--------|-------|-----------|
| VITE_RUNTIME_MODE | cloud | ✅ Yes |
| HUB_URL | disabled | ✅ Yes |
| HUB_SIGNING_KEY | disabled | ✅ Yes |
| CAPTCHA_PROVIDER | none / hcaptcha / recaptcha | ⚠️ Recommended |
| HCAPTCHA_SECRET | your-secret | ⚠️ If using hCaptcha |
| JAVARI_API_KEY | your-key | ⚠️ For AI generation |

---

## Next Steps

1. ✅ Set three required secrets in Bolt
2. ✅ Deploy functions
3. ✅ Deploy frontend
4. ✅ Verify plugin endpoints work
5. ⚠️ Add CAPTCHA (recommended)
6. ⚠️ Add AI provider key (for generation)
7. ⚠️ Test with real data
8. 🚀 Ready for production!

---

**Complete deployment checklist: UPDATED_DEPLOYMENT_CHECKLIST.md**
