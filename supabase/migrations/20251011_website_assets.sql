/*
  # Website Assets Table

  1. New Table
    - `assets` - Stores uploaded files (logos, images, fonts, etc.)
      - `id` (uuid, primary key)
      - `org_id` (uuid) - Organization owner
      - `site_id` (uuid) - Associated site
      - `kind` (text) - image, font, file
      - `name` (text) - Original filename
      - `url` (text) - Public URL
      - `meta` (jsonb) - Additional metadata (role, dimensions, etc.)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Org-scoped access policies

  3. Storage
    - Assumes Supabase Storage bucket 'site-assets' exists
    - Bucket should be public for asset delivery
*/

-- Create assets table
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

-- Add waived column to credit_ledger for goodwill guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_ledger' AND column_name = 'waived'
  ) THEN
    ALTER TABLE credit_ledger ADD COLUMN waived boolean DEFAULT false;
  END IF;
END $$;

-- RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Assets policy - org-scoped
DROP POLICY IF EXISTS org_assets ON assets;
CREATE POLICY org_assets ON assets
  USING (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_org_id ON assets(org_id);
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON assets(site_id);
CREATE INDEX IF NOT EXISTS idx_assets_kind ON assets(kind);

-- Storage bucket setup (manual step in Supabase dashboard)
-- Run: CREATE BUCKET site-assets WITH (public = true);
-- Or use Supabase CLI: supabase storage create-bucket site-assets --public
