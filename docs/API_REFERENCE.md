# API Reference

Base URL: `https://YOUR_PROJECT.supabase.co/functions/v1`

## Website Management

### POST /website-init
Initialize website for org. Auto-creates default site.

**Request:**
```json
{}
```

**Response:**
```json
{
  "ok": true,
  "data": { "site_id": "uuid" }
}
```

### POST /website-draft
Generate site structure via AI.

**Headers:**
- `X-Idempotency-Key`: Required

**Request:**
```json
{
  "siteId": "uuid",
  "brief": {
    "businessName": "string",
    "industry": "string",
    "offerings": ["string"],
    "targetAudience": "string",
    "tone": "string",
    "goals": ["string"],
    "pages": ["string"],
    "cta": "string"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "seo": {},
    "pages": [],
    "page_count": 3
  }
}
```

### GET /website-templates-list
List all templates.

**Response:**
```json
{
  "ok": true,
  "data": {
    "templates": [
      {
        "id": "classic-hero",
        "name": "Classic Hero",
        "category": "business"
      }
    ]
  }
}
```

### POST /website-publish
Publish site to live URL.

**Request:**
```json
{
  "siteId": "uuid",
  "orgId": "uuid"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "url": "https://your-site.netlify.app",
    "deploy_id": "string"
  }
}
```

## E-commerce

### POST /checkout
Initiate checkout.

**Request:**
```json
{
  "productId": "uuid",
  "provider": "stripe" | "paypal"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "checkoutUrl": "https://..."
  }
}
```

### POST /webhooks-stripe
Stripe webhook handler.

### POST /webhooks-paypal
PayPal webhook handler.

### GET /download/:productId
Download digital product (entitlement enforced).

## Credits

### GET /credits-balance
Get org credit balance.

**Response:**
```json
{
  "ok": true,
  "data": {
    "balance": 100,
    "transactions": []
  }
}
```

### GET /credits-ledger
Get credit transaction history.

## Aliases

Netlify rewrites:
- `/api/checkout` → `/functions/v1/checkout`
- `/api/webhooks/stripe` → `/functions/v1/webhooks-stripe`
- `/api/webhooks/paypal` → `/functions/v1/webhooks-paypal`
- `/api/download/:id` → `/functions/v1/download`
- `/api/publish` → `/functions/v1/website-publish`
