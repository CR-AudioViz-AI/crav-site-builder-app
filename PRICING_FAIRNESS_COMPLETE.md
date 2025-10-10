# Pricing Fairness & Asset Management Complete

## Executive Summary

Implemented pricing fairness improvements and asset management capabilities to ensure users are never charged unfairly and can upload logos/images to their sites.

### Key Changes

1. **✅ Goodwill Guard** - Auto-waive charges on retries after server errors
2. **✅ Free Export** - Export costs 0 credits (was 2)
3. **✅ Free Publish** - Publish costs 0 credits (was 1)
4. **✅ Asset Uploads** - Logo/image upload capability
5. **✅ Page CRUD** - Add, rename, delete, duplicate pages
6. **✅ Updated Manifest** - New capabilities documented

## Build Status

```
✓ 1483 modules transformed
✓ built in 4.04s
Bundle: 207KB (59KB gzipped)
Status: ✅ PASSING
```

## 1. Goodwill Guard Implementation

### What It Does
If a user's API call fails with a 5xx server error, their next retry within 10 minutes is **automatically waived** - no credits charged.

### How It Works

**File**: `supabase/functions/core-mini/auth.ts`

```typescript
// Check if last attempt with same idempotency key failed with 5xx within 10 minutes
const { data: lastAttempts } = await supabase
  .from("credit_ledger")
  .select("*")
  .eq("org_id", orgId)
  .eq("idempotency_key", idempotencyKey)
  .order("created_at", { ascending: false })
  .limit(1);

const lastAttempt = lastAttempts?.[0];
if (lastAttempt) {
  const timeSinceLastAttempt = Date.now() - Date.parse(lastAttempt.created_at);
  const wasServerError = lastAttempt.metadata?.status >= 500 && lastAttempt.metadata?.status < 600;

  // If last attempt failed with 5xx within 10 minutes, waive the charge
  if (wasServerError && timeSinceLastAttempt < 10 * 60 * 1000) {
    await supabase.from("credit_ledger").insert({
      org_id: orgId,
      action,
      cost: 0,
      idempotency_key: idempotencyKey,
      waived: true,
      metadata: { waived_reason: "retry_after_server_error" }
    });
    return { ok: true, bypass: false };
  }
}
```

### User Experience
1. User calls `website-draft` (2 credits)
2. Server error (503) - credits NOT charged
3. User retries with same idempotency key
4. **Automatically waived** - 0 credits charged
5. Success!

### Database Changes
**File**: `supabase/migrations/20251011_website_assets.sql`

Added `waived` column to `credit_ledger`:
```sql
ALTER TABLE credit_ledger ADD COLUMN waived boolean DEFAULT false;
```

## 2. Free Export & Publish

### Export is Now Free

**File**: `supabase/functions/website-export/index.ts`

```typescript
const CREDIT_COST = 0; // Export is free - no credits charged
```

### Publish is Now Free

**File**: `supabase/functions/website-publish/index.ts`

```typescript
// Publish is now free - no credits charged
log.info("Publishing site (free operation)");
```

**Removed**:
- Credit debit logic
- 402 error handling
- Balance checks

### Pricing Summary

| Action | Old Cost | New Cost | Notes |
|--------|----------|----------|-------|
| Draft | 2 credits | 2 credits | AI generation |
| Rewrite | 1 credit | 1 credit | AI editing |
| Export | 2 credits | **0 credits** | ✅ FREE |
| Publish | 1 credit | **0 credits** | ✅ FREE |
| Template Apply | 0 credits | 0 credits | Always free |
| Page CRUD | 0 credits | 0 credits | Always free |
| Asset Upload | 0 credits | 0 credits | Always free |

**Only AI operations cost credits!**

## 3. Asset Management

### Assets Table

**File**: `supabase/migrations/20251011_website_assets.sql`

```sql
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','font','file')),
  name text,
  url text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Features**:
- Stores uploaded files (logos, images, fonts, etc.)
- Links to sites (cascading delete)
- Metadata for role, dimensions, uploader
- RLS policies (org-scoped)

### Upload Function

**File**: `supabase/functions/website-asset-upload/index.ts`

**Endpoint**: `POST /functions/v1/website-asset-upload`

**Request**:
```typescript
// FormData
file: File (image, font, or other file)
site_id: string (UUID)
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "url": "https://...supabase.co/storage/v1/object/public/site-assets/..."
  },
  "request_id": "uuid"
}
```

**What It Does**:
1. Validates file and site_id
2. Uploads to Supabase Storage bucket `site-assets`
3. Records in `assets` table
4. Updates `sites.theme.brand.logo` with public URL
5. Returns public URL

**Storage Setup Required**:
```sql
-- In Supabase dashboard or CLI:
CREATE BUCKET site-assets WITH (public = true);
```

## 4. Page CRUD Operations

### Page Management Function

**File**: `supabase/functions/website-page-upsert/index.ts`

**Endpoint**: `POST /functions/v1/website-page-upsert`

### Operations

#### Add Page
```json
{
  "op": "add",
  "site_id": "uuid",
  "name": "About Us",
  "slug": "about"
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "id": "uuid",
    "slug": "about",
    "name": "About Us"
  }
}
```

#### Rename Page
```json
{
  "op": "rename",
  "id": "uuid",
  "name": "Our Story",
  "slug": "story"
}
```

#### Delete Page
```json
{
  "op": "delete",
  "id": "uuid"
}
```

#### Duplicate Page
```json
{
  "op": "duplicate",
  "id": "uuid",
  "name": "Services Copy",
  "slug": "services-copy"
}
```

**Features**:
- All operations are org-scoped (RLS enforced)
- No credits charged
- Validates site ownership
- Returns clear errors

## 5. Updated Plugin Manifest

**File**: `public/.well-known/craudiovizai-plugin.json`

**New Capabilities**:
```json
{
  "capabilities": {
    "draft": true,
    "rewrite": true,
    "publish": true,
    "export": true,
    "templates": true,
    "forms": true,
    "brand_tokens": true,
    "asset_upload": true,        // NEW
    "page_crud": true,            // NEW
    "free_export": true,          // NEW
    "free_publish": true          // NEW
  }
}
```

## 6. Acceptance Tests

**File**: `tests/accept.website.js`

**Added Tests**:
```javascript
// Test 4: Verify export is free (0 credits)
const exportRes = await fetch(`${BASE_URL}/functions/v1/website-export`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${ANON_KEY}` },
  body: JSON.stringify({ siteId: "test-site" }),
});
// Export should NOT return 402 (payment required)
assert.notEqual(exportRes.status, 402, "Export should not charge credits");

// Test 5: Verify publish is free (0 credits)
const publishRes = await fetch(`${BASE_URL}/functions/v1/website-publish`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${ANON_KEY}` },
  body: JSON.stringify({ siteId: "test-site" }),
});
// Publish should NOT return 402 (payment required)
assert.notEqual(publishRes.status, 402, "Publish should not charge credits");
```

**Run Tests**:
```bash
node tests/accept.website.js
```

## Files Created/Modified

### New Files ✨
```
supabase/migrations/20251011_website_assets.sql
supabase/functions/website-asset-upload/index.ts
supabase/functions/website-page-upsert/index.ts
PRICING_FAIRNESS_COMPLETE.md (this file)
```

### Modified Files 📝
```
supabase/functions/core-mini/auth.ts         - Added goodwill guard
supabase/functions/website-export/index.ts   - Set cost to 0
supabase/functions/website-publish/index.ts  - Removed credit debit
public/.well-known/craudiovizai-plugin.json  - Added capabilities
tests/accept.website.js                       - Added free tests
```

## Database Migrations Required

### Step 1: Create Assets Table
```bash
# Apply migration
psql -f supabase/migrations/20251011_website_assets.sql
```

### Step 2: Create Storage Bucket
```bash
# In Supabase dashboard → Storage → Create bucket
# Name: site-assets
# Public: Yes

# Or via CLI:
supabase storage create-bucket site-assets --public
```

### Step 3: Verify
```sql
-- Check assets table exists
SELECT * FROM assets LIMIT 1;

-- Check waived column exists
SELECT waived FROM credit_ledger LIMIT 1;

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'site-assets';
```

## Usage Examples

### Example 1: Upload Logo
```typescript
const formData = new FormData();
formData.append('file', logoFile);
formData.append('site_id', siteId);

const response = await fetch('/functions/v1/website-asset-upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log('Logo URL:', result.data.url);
```

### Example 2: Add New Page
```typescript
const response = await fetch('/functions/v1/website-page-upsert', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    op: 'add',
    site_id: siteId,
    name: 'Contact',
    slug: 'contact',
  }),
});

const result = await response.json();
console.log('Page created:', result.data);
```

### Example 3: Export for Free
```typescript
const response = await fetch('/functions/v1/website-export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({ siteId }),
});

// No 402 error - export is free!
const result = await response.json();
console.log('Export ready:', result.data.url);
```

### Example 4: Goodwill Guard in Action
```typescript
// First attempt - fails with 503
try {
  const response1 = await fetch('/functions/v1/website-draft', {
    method: 'POST',
    headers: {
      'X-Idempotency-Key': 'retry-key-123',
    },
    body: JSON.stringify({ brief }),
  });
  // Returns 503 - credits NOT charged
} catch (error) {
  console.error('Server error, retrying...');
}

// Retry with same idempotency key - automatically waived!
const response2 = await fetch('/functions/v1/website-draft', {
  method: 'POST',
  headers: {
    'X-Idempotency-Key': 'retry-key-123', // Same key
  },
  body: JSON.stringify({ brief }),
});
// Success! Credits: 0 (waived due to previous 5xx)
```

## Security Considerations

### RLS Policies
All new tables have Row Level Security enabled:
```sql
-- Assets are org-scoped
CREATE POLICY org_assets ON assets
  USING (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));
```

### Storage Security
- Bucket `site-assets` is public for delivery
- Upload requires authentication
- Files are organized by `org_id/site_id/`
- No direct write access (only via edge function)

### Credit Safety
- Goodwill guard prevents double-charging
- Only 5xx errors trigger waive (not 4xx)
- 10-minute window prevents abuse
- Logged in metadata for audit

## Benefits

### For Users
1. ✅ **Never charged twice** for server errors
2. ✅ **Free export** - no credits to download site
3. ✅ **Free publish** - no credits to deploy
4. ✅ **Upload logos** - brand their sites
5. ✅ **Manage pages** - add/rename/delete/duplicate
6. ✅ **Transparent pricing** - only AI costs credits

### For Business
1. ✅ **Better UX** - fewer support tickets
2. ✅ **Fair pricing** - builds trust
3. ✅ **Asset management** - enables customization
4. ✅ **Audit trail** - all operations logged
5. ✅ **Competitive** - export/publish free = lower barrier

## Testing Checklist

### Manual Tests
- [ ] Upload a logo (PNG, JPG, SVG)
- [ ] Verify logo appears in site theme
- [ ] Add a new page
- [ ] Rename a page
- [ ] Delete a page
- [ ] Duplicate a page
- [ ] Export a site (verify no 402 error)
- [ ] Publish a site (verify no 402 error)
- [ ] Trigger a 5xx error and retry (verify waive)

### Automated Tests
```bash
# Run acceptance tests
node tests/accept.website.js

# Expected output:
# ✅ Health check passed
# ✅ Plugin manifest valid
# ✅ Export is free
# ✅ Publish is free
# ✅ All acceptance tests passed!
```

## Migration Checklist

### Pre-Deployment
- [ ] Review all code changes
- [ ] Run build: `npm run build`
- [ ] Test locally with Supabase
- [ ] Create storage bucket
- [ ] Run database migration

### Deployment
- [ ] Deploy edge functions:
  ```bash
  supabase functions deploy website-asset-upload
  supabase functions deploy website-page-upsert
  supabase functions deploy website-export
  supabase functions deploy website-publish
  ```
- [ ] Apply database migration
- [ ] Verify storage bucket exists
- [ ] Test upload endpoint
- [ ] Test page CRUD
- [ ] Test free export/publish

### Post-Deployment
- [ ] Monitor credit_ledger for waived entries
- [ ] Check assets table for uploads
- [ ] Verify no 402 errors on export/publish
- [ ] Review user feedback

## Troubleshooting

### Storage Upload Fails
**Error**: "Bucket not found"
**Fix**: Create bucket in Supabase dashboard
```bash
supabase storage create-bucket site-assets --public
```

### Goodwill Guard Not Working
**Check**:
1. Is `waived` column in `credit_ledger`?
2. Is metadata capturing status code?
3. Is idempotency key the same?
4. Is retry within 10 minutes?

### Page CRUD Fails
**Error**: "page_not_found"
**Fix**: Verify site belongs to org:
```sql
SELECT * FROM sites WHERE id = 'site-id' AND org_id = 'org-id';
```

## Summary

### What Changed
1. ✅ **Goodwill Guard** - Auto-waive on 5xx retries
2. ✅ **Free Export** - 0 credits (was 2)
3. ✅ **Free Publish** - 0 credits (was 1)
4. ✅ **Asset Uploads** - Logo/image management
5. ✅ **Page CRUD** - Full page management
6. ✅ **Updated Tests** - Verify free operations

### What's Ready
- ✅ Database migrations
- ✅ Edge functions
- ✅ Acceptance tests
- ✅ Plugin manifest
- ✅ Documentation

### Time to Deploy
- Database migration: 5 minutes
- Storage setup: 2 minutes
- Function deployment: 5 minutes
- Testing: 10 minutes
**Total: ~20 minutes**

---

**Status**: ✅ Complete and ready to deploy!

**Build**: ✅ Passing (4.04s, 207KB)

**Next Steps**: Deploy migrations → Create storage bucket → Deploy functions → Test
