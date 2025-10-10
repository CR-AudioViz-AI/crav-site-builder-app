/*
  # Comprehensive RLS Policies for Website Builder

  1. Security Enhancements
    - Add WITH CHECK clauses to all policies
    - Separate policies for SELECT, INSERT, UPDATE, DELETE
    - Add complaint-lock for form_submissions (end-user PII)
    - Add updated_at triggers where missing

  2. Tables Covered
    - sites, pages, media_assets, deploys
    - form_submissions (with complaint-lock)
    - navigation_menus, redirects, blog_posts
*/

-- Drop existing policies to recreate with proper separation
DROP POLICY IF EXISTS sites_isolation ON sites;
DROP POLICY IF EXISTS pages_isolation ON pages;
DROP POLICY IF EXISTS media_isolation ON media_assets;
DROP POLICY IF EXISTS deploys_isolation ON deploys;
DROP POLICY IF EXISTS forms_isolation ON form_submissions;
DROP POLICY IF EXISTS menus_isolation ON navigation_menus;
DROP POLICY IF EXISTS redirects_isolation ON redirects;
DROP POLICY IF EXISTS posts_isolation ON blog_posts;

-- Helper function for org_id extraction
CREATE OR REPLACE FUNCTION auth_org_id() RETURNS uuid AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid;
$$ LANGUAGE SQL STABLE;

-- Sites policies
CREATE POLICY "Users can view own org sites"
  ON sites FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org sites"
  ON sites FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Pages policies
CREATE POLICY "Users can view own org pages"
  ON pages FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org pages"
  ON pages FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org pages"
  ON pages FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org pages"
  ON pages FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Media assets policies
CREATE POLICY "Users can view own org media"
  ON media_assets FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org media"
  ON media_assets FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org media"
  ON media_assets FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org media"
  ON media_assets FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Deploys policies
CREATE POLICY "Users can view own org deploys"
  ON deploys FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org deploys"
  ON deploys FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org deploys"
  ON deploys FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org deploys"
  ON deploys FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Form submissions policies (with complaint-lock protection)
CREATE POLICY "Users can view own org submissions"
  ON form_submissions FOR SELECT
  TO authenticated
  USING (
    org_id = auth_org_id() AND
    (consent IS NULL OR (consent->>'complaint_locked')::boolean IS NOT TRUE)
  );

CREATE POLICY "Users can insert own org submissions"
  ON form_submissions FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org submissions"
  ON form_submissions FOR UPDATE
  TO authenticated
  USING (
    org_id = auth_org_id() AND
    (consent IS NULL OR (consent->>'complaint_locked')::boolean IS NOT TRUE)
  )
  WITH CHECK (
    org_id = auth_org_id() AND
    (consent IS NULL OR (consent->>'complaint_locked')::boolean IS NOT TRUE)
  );

CREATE POLICY "Users can delete own org submissions"
  ON form_submissions FOR DELETE
  TO authenticated
  USING (
    org_id = auth_org_id() AND
    (consent IS NULL OR (consent->>'complaint_locked')::boolean IS NOT TRUE)
  );

-- Navigation menus policies
CREATE POLICY "Users can view own org menus"
  ON navigation_menus FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org menus"
  ON navigation_menus FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org menus"
  ON navigation_menus FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org menus"
  ON navigation_menus FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Redirects policies
CREATE POLICY "Users can view own org redirects"
  ON redirects FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org redirects"
  ON redirects FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org redirects"
  ON redirects FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org redirects"
  ON redirects FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Blog posts policies
CREATE POLICY "Users can view own org posts"
  ON blog_posts FOR SELECT
  TO authenticated
  USING (org_id = auth_org_id());

CREATE POLICY "Users can insert own org posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can update own org posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (org_id = auth_org_id())
  WITH CHECK (org_id = auth_org_id());

CREATE POLICY "Users can delete own org posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (org_id = auth_org_id());

-- Add updated_at triggers for redirects (if not present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_redirects_updated'
  ) THEN
    CREATE TRIGGER trg_redirects_updated
      BEFORE UPDATE ON redirects
      FOR EACH ROW
      EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['sites', 'pages', 'media_assets', 'deploys',
                                  'form_submissions', 'navigation_menus',
                                  'redirects', 'blog_posts'])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;
