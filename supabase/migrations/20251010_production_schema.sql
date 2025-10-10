/*
  # Production Website Builder Schema

  1. Schema Changes
    - Simplify sites table to match production spec
    - Add pages table with sections jsonb
    - Add templates table with full specs
    - Add org_settings for business profile
    - Add idempotency support

  2. New Tables
    - `pages` - Individual pages with sections
    - `org_settings` - Business profile per org
    - Enhance `templates` with full specs

  3. Functions
    - ensure_default_site() - Idempotent site creation
    - set_updated_at() - Trigger function

  4. Security
    - RLS on all tables
    - Org-scoped policies
*/

-- Drop existing if needed (for clean migration)
DROP TABLE IF EXISTS pages CASCADE;

-- Sites table (simplified)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE sites ADD COLUMN template_id uuid;
  END IF;
END $$;

-- Ensure sites has theme column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'theme'
  ) THEN
    ALTER TABLE sites ADD COLUMN theme jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Pages table with sections
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL DEFAULT 'Home',
  seo jsonb DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(site_id, slug)
);

-- Org settings for business profile
CREATE TABLE IF NOT EXISTS org_settings (
  org_id uuid PRIMARY KEY,
  business jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Update templates table with full spec
ALTER TABLE templates DROP COLUMN IF EXISTS default_pages;
ALTER TABLE templates DROP COLUMN IF EXISTS default_theme;
ALTER TABLE templates DROP COLUMN IF EXISTS blocks;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'spec'
  ) THEN
    ALTER TABLE templates ADD COLUMN spec jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'tier'
  ) THEN
    ALTER TABLE templates ADD COLUMN tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','paid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'preview_url'
  ) THEN
    ALTER TABLE templates ADD COLUMN preview_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'templates' AND column_name = 'requires_entitlement'
  ) THEN
    ALTER TABLE templates ADD COLUMN requires_entitlement text[] DEFAULT '{}';
  END IF;
END $$;

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS org_pages ON pages;
CREATE POLICY org_pages ON pages
  USING (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS org_settings_rw ON org_settings;
CREATE POLICY org_settings_rw ON org_settings
  USING (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS read_templates ON templates;
CREATE POLICY read_templates ON templates FOR SELECT USING (true);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pages','org_settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;

-- Ensure default site function
CREATE OR REPLACE FUNCTION ensure_default_site(pid uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  sid uuid;
BEGIN
  -- Check if org has any site
  SELECT id INTO sid
  FROM sites
  WHERE org_id = pid
  ORDER BY created_at ASC
  LIMIT 1;

  -- Create default if none exists
  IF sid IS NULL THEN
    INSERT INTO sites(id, org_id, name)
    VALUES (gen_random_uuid(), pid, 'Default Site')
    RETURNING id INTO sid;

    -- Create default home page
    INSERT INTO pages(id, org_id, site_id, slug, name, sections)
    VALUES (
      gen_random_uuid(),
      pid,
      sid,
      'home',
      'Home',
      jsonb_build_array(
        jsonb_build_object(
          'kind', 'hero',
          'headline', 'Welcome',
          'subhead', 'We help you grow',
          'cta', 'Get Started'
        ),
        jsonb_build_object('kind', 'footer')
      )
    );
  END IF;

  RETURN sid;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pages_site_id ON pages(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_org_id ON pages(org_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(site_id, slug);

-- Update templates with production spec format
DELETE FROM templates;

INSERT INTO templates (id, name, description, category, tier, preview_url, spec, requires_entitlement, is_public)
VALUES
  (
    'classic-hero'::uuid,
    'Classic Corporate',
    'Traditional business website with prominent hero section',
    'business',
    'free',
    null,
    jsonb_build_object(
      'theme', jsonb_build_object(
        'palette', jsonb_build_object(
          'primary', '#2563eb',
          'secondary', '#7c3aed',
          'accent', '#f59e0b'
        )
      ),
      'pages', jsonb_build_array(
        jsonb_build_object(
          'slug', 'home',
          'name', 'Home',
          'seo', jsonb_build_object('title', 'Home'),
          'sections', jsonb_build_array(
            jsonb_build_object('kind', 'hero', 'headline', 'Grow with Us', 'subhead', 'We deliver results', 'cta', 'Get Started'),
            jsonb_build_object('kind', 'features'),
            jsonb_build_object('kind', 'cta'),
            jsonb_build_object('kind', 'footer')
          )
        ),
        jsonb_build_object(
          'slug', 'about',
          'name', 'About',
          'seo', jsonb_build_object('title', 'About Us'),
          'sections', jsonb_build_array(
            jsonb_build_object('kind', 'hero', 'headline', 'About Us', 'subhead', 'Learn more about our story'),
            jsonb_build_object('kind', 'footer')
          )
        ),
        jsonb_build_object(
          'slug', 'contact',
          'name', 'Contact',
          'seo', jsonb_build_object('title', 'Contact Us'),
          'sections', jsonb_build_array(
            jsonb_build_object('kind', 'hero', 'headline', 'Get In Touch', 'subhead', 'We would love to hear from you'),
            jsonb_build_object('kind', 'contact'),
            jsonb_build_object('kind', 'footer')
          )
        )
      )
    ),
    '{}',
    true
  ),
  (
    'saas-lite'::uuid,
    'SaaS Lite',
    'Modern SaaS landing page optimized for conversions',
    'saas',
    'free',
    null,
    jsonb_build_object(
      'theme', jsonb_build_object(
        'palette', jsonb_build_object(
          'primary', '#0ea5e9',
          'secondary', '#6366f1',
          'accent', '#ec4899'
        )
      ),
      'pages', jsonb_build_array(
        jsonb_build_object(
          'slug', 'home',
          'name', 'Home',
          'sections', jsonb_build_array(
            jsonb_build_object('kind', 'hero', 'headline', 'Ship Faster', 'subhead', 'Modern SaaS site', 'cta', 'Start Free'),
            jsonb_build_object('kind', 'features'),
            jsonb_build_object('kind', 'footer')
          )
        )
      )
    ),
    '{}',
    true
  );
