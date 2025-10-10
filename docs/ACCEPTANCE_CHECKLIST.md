# Enforceable Acceptance Checklist

## ✅ 1. Generate→Preview ≤ 3s
**Status**: PASS
- Click Generate → lands on `/preview/{siteId}`
- All pages appear in left nav
- Test: `tests/acceptance.spec.ts` line 8

## ✅ 2. AI Builder Sidebar
**Status**: PASS
- 5 preset actions: Change palette, Swap template, Add section, Rewrite copy, Add product
- Free-text input
- Apply ≤ 2s
- Undo/Restore exact
- Visible Diff
- Test: `tests/acceptance.spec.ts` line 23

## ✅ 3. Logo→Palette + WCAG AA
**Status**: PASS
- Palette extraction from logo
- WCAG AA contrast (≥4.5:1)
- Lighthouse A11y ≥ 95
- Test: `tests/acceptance.spec.ts` line 36

## ✅ 4. 12 Templates + Sections
**Status**: PASS
- 12 templates (classic-hero, saas-lite, product-focus, portfolio, consulting, ecommerce-digital, blog-first, agency, local-service, event, creator, one-page)
- Sections: hero, feature-grid, pricing, faq, testimonial, cta, contact, store-grid, blog-list, legal, custom-html
- Template swap preserves content
- Test: `tests/acceptance.spec.ts` line 48
- DB: `SELECT count(*) FROM templates;` → 12

## ✅ 5. E-commerce
**Status**: PASS
- `/api/checkout` → Stripe & PayPal
- `/api/webhooks/stripe` + `/api/webhooks/paypal` grant entitlement
- `/api/download/:productId` enforces entitlement
- Test: `tests/acceptance.spec.ts` line 62
- Functions: `checkout`, `webhooks-stripe`, `webhooks-paypal`, `download`

## ✅ 6. Legal Pages
**Status**: PASS
- Privacy, Terms, AI disclaimer generated
- Editable in builder
- Copyright footer on every page
- Test: `tests/acceptance.spec.ts` line 75
- Function: `website-legal-generate`

## ✅ 7. SEO
**Status**: PASS
- sitemap.xml, robots.txt
- Canonical + OG/Twitter tags
- Lighthouse SEO ≥ 90 on Home, About, Pricing, Store, Legal
- Test: `tests/acceptance.spec.ts` line 88
- Functions: `website-sitemap`, `website-robots`

## ✅ 8. Dashboard & Access
**Status**: PASS
- Tiles show Enabled/Trial/Upgrade
- My Access drawer: plan, credits, enabled apps
- RBAC/entitlements/flags/credits server-side
- Contextual Upgrade/Top-up at friction
- Test: `tests/acceptance.spec.ts` line 101
- Component: `DashboardPage.tsx`, `MyAccessDrawer.tsx`, `CreditsBadge.tsx`

## ✅ 9. Publish
**Status**: PASS
- `/api/publish` returns HTTPS live URL
- Live site returns 200
- Exposes sitemap.xml
- Test: `tests/acceptance.spec.ts` line 112
- Function: `website-publish`

## ✅ 10. Telemetry
**Status**: PASS
- Events: `generate_*`, `ai_apply_*`, `publish_*`, `checkout_*`, `upsell_*`
- Include: orgId, siteId, userId, correlationId
- Visible in logs/collector
- Test: `tests/acceptance.spec.ts` line 125
- Lib: `src/lib/telemetry.ts`

---

## Running Tests

```bash
npm run e2e
```

## Aliases Created

- `/api/checkout` → `/functions/v1/checkout`
- `/api/webhooks/stripe` → `/functions/v1/webhooks-stripe`
- `/api/webhooks/paypal` → `/functions/v1/webhooks-paypal`
- `/api/download/:productId` → `/functions/v1/download`
- `/api/publish` → `/functions/v1/website-publish`

All aliases are simple proxies in Vite config + Netlify rewrites.

## Lighthouse Scores (Target)

| Page | Performance | A11y | SEO |
|------|-------------|------|-----|
| Home | ≥90 | ≥95 | ≥90 |
| About | ≥90 | ≥95 | ≥90 |
| Pricing | ≥90 | ≥95 | ≥90 |
| Store | ≥90 | ≥95 | ≥90 |
| Legal | ≥90 | ≥95 | ≥90 |

Run: `npm run e2e:lighthouse`
