/*
  # Website Builder Schema Corrections (v1.1)

  ## Changes from v1.0
  - Fixed org_id type to uuid (was text)
  - Added proper unique constraints on multi-column keys
  - Added version bump trigger for pages
  - Added updated_at triggers
  - Corrected RLS policy syntax to use jsonb extraction
  - Added consent field to form_submissions

  ## Security
  All tables use RLS with org_id isolation
*/

-- Drop existing tables to recreate with correct schema
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS redirects CASCADE;
DROP TABLE IF EXISTS navigation_menus CASCADE;
DROP TABLE IF EXISTS form_submissions CASCADE;
DROP TABLE IF EXISTS deploys CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;
DROP TABLE IF EXISTS pages CASCADE;
DROP TABLE IF EXISTS sites CASCADE;

-- Recreate sites table with correct types
CREATE TABLE sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  handle text UNIQUE,
  name text NOT NULL,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_org ON sites(org_id);

-- Recreate pages table
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  path text NOT NULL,
  title text NOT NULL,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  lang text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, site_id, path, lang)
);

CREATE INDEX idx_pages_org_site ON pages(org_id, site_id);

-- Recreate media_assets table
CREATE TABLE media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  kind text NOT NULL,
  url text NOT NULL,
  alt text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_org_site ON media_assets(org_id, site_id);

-- Recreate deploys table
CREATE TABLE deploys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  provider text NOT NULL,
  url text NOT NULL,
  commit_sha text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deploys_org_site ON deploys(org_id, site_id);

-- Recreate form_submissions table with consent field
CREATE TABLE form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  form_id text NOT NULL,
  payload jsonb NOT NULL,
  consent jsonb,
  ip text,
  ua text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forms_org_site ON form_submissions(org_id, site_id);

-- Recreate navigation_menus table
CREATE TABLE navigation_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Recreate redirects table
CREATE TABLE redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  from_path text NOT NULL,
  to_path text NOT NULL,
  code int NOT NULL DEFAULT 301,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Recreate blog_posts table
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  body text NOT NULL,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, site_id, slug)
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION set_updated_at() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sites_updated 
  BEFORE UPDATE ON sites 
  FOR EACH ROW 
  EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_pages_updated 
  BEFORE UPDATE ON pages 
  FOR EACH ROW 
  EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_menus_updated 
  BEFORE UPDATE ON navigation_menus 
  FOR EACH ROW 
  EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER trg_posts_updated 
  BEFORE UPDATE ON blog_posts 
  FOR EACH ROW 
  EXECUTE PROCEDURE set_updated_at();

-- Trigger for page version bumping
CREATE OR REPLACE FUNCTION bump_page_version() 
RETURNS TRIGGER AS $$
BEGIN
  IF ROW(NEW.title, NEW.seo, NEW.blocks) IS DISTINCT FROM ROW(OLD.title, OLD.seo, OLD.blocks) THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pages_version 
  BEFORE UPDATE ON pages 
  FOR EACH ROW 
  EXECUTE PROCEDURE bump_page_version();

-- Enable RLS
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deploys ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies using proper jsonb extraction
CREATE POLICY sites_isolation ON sites 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY pages_isolation ON pages 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY media_isolation ON media_assets 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY deploys_isolation ON deploys 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY forms_isolation ON form_submissions 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY menus_isolation ON navigation_menus 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY redirects_isolation ON redirects 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY posts_isolation ON blog_posts 
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);
