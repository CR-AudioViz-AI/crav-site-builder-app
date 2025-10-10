/*
  # North-Star Website Builder Schema

  1. Schema Changes
    - Expand sites table with company, ecommerce, legal, integrations
    - Add products table for digital goods
    - Add site_versions table for undo/redo
    - Add templates table

  2. New Tables
    - `products` - Digital products for e-commerce
    - `site_versions` - Version history for undo/redo
    - `templates` - Reusable website templates

  3. Updates
    - sites table: Add company jsonb, ecommerce jsonb, legal jsonb, integrations jsonb
    - sites table: Add status, published_at, template_id

  4. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
*/

-- Expand sites table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'company'
  ) THEN
    ALTER TABLE sites
      ADD COLUMN company jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN ecommerce jsonb,
      ADD COLUMN legal jsonb DEFAULT '{"includeCopyright": true, "includePrivacy": false, "includeTerms": false, "includeAIDisclaimer": false}'::jsonb,
      ADD COLUMN integrations jsonb DEFAULT '{}'::jsonb,
      ADD COLUMN status text DEFAULT 'draft',
      ADD COLUMN published_at timestamptz,
      ADD COLUMN template_id text;
  END IF;
END $$;

-- Products table for e-commerce
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  file_url text,
  images text[],
  status text DEFAULT 'draft',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own products"
  ON products FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())))
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())));

-- Site versions for undo/redo
CREATE TABLE IF NOT EXISTS site_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  changes jsonb NOT NULL,
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE site_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own site versions"
  ON site_versions FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())));

CREATE POLICY "Users can insert own site versions"
  ON site_versions FOR INSERT
  TO authenticated
  WITH CHECK (org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())));

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  thumbnail text,
  default_pages text[],
  default_theme jsonb,
  blocks jsonb,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are public"
  ON templates FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_site_id ON products(site_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON products(org_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_site_id ON site_versions(site_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_version ON site_versions(site_id, version);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- Insert default templates
INSERT INTO templates (id, name, description, category, default_pages, default_theme, blocks, is_public)
VALUES
  ('classic-hero', 'Classic Hero', 'Traditional business website with prominent hero section', 'business',
   ARRAY['Home', 'About', 'Services', 'Contact'],
   '{"colors": {"primary": "#2563eb", "secondary": "#7c3aed", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true),

  ('saas-lite', 'SaaS Lite', 'Modern SaaS landing page optimized for conversions', 'saas',
   ARRAY['Home', 'Features', 'Pricing', 'Contact'],
   '{"colors": {"primary": "#0ea5e9", "secondary": "#6366f1", "accent": "#ec4899"}}'::jsonb,
   '{}'::jsonb, true),

  ('product-focus', 'Product Focus', 'Product showcase with detailed features', 'business',
   ARRAY['Home', 'Product', 'Features', 'Pricing', 'Contact'],
   '{"colors": {"primary": "#10b981", "secondary": "#14b8a6", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true),

  ('portfolio', 'Portfolio', 'Creative portfolio for designers and artists', 'creative',
   ARRAY['Home', 'Work', 'About', 'Contact'],
   '{"colors": {"primary": "#8b5cf6", "secondary": "#ec4899", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true),

  ('consulting', 'Consulting', 'Professional services and consulting', 'business',
   ARRAY['Home', 'Services', 'Expertise', 'Case Studies', 'Contact'],
   '{"colors": {"primary": "#1e40af", "secondary": "#7c3aed", "accent": "#059669"}}'::jsonb,
   '{}'::jsonb, true),

  ('ecommerce-digital', 'Digital Store', 'E-commerce for digital products', 'ecommerce',
   ARRAY['Home', 'Store', 'About', 'Contact'],
   '{"colors": {"primary": "#dc2626", "secondary": "#ea580c", "accent": "#0891b2"}}'::jsonb,
   '{}'::jsonb, true),

  ('blog-first', 'Blog First', 'Content-focused blog layout', 'content',
   ARRAY['Home', 'Blog', 'About', 'Contact'],
   '{"colors": {"primary": "#0f172a", "secondary": "#475569", "accent": "#0ea5e9"}}'::jsonb,
   '{}'::jsonb, true),

  ('agency', 'Agency', 'Marketing and creative agency', 'business',
   ARRAY['Home', 'Services', 'Work', 'About', 'Contact'],
   '{"colors": {"primary": "#7c3aed", "secondary": "#ec4899", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true),

  ('local-service', 'Local Service', 'Local business with location focus', 'business',
   ARRAY['Home', 'Services', 'Areas', 'Contact'],
   '{"colors": {"primary": "#059669", "secondary": "#0891b2", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true),

  ('event', 'Event', 'Event and conference website', 'business',
   ARRAY['Home', 'Schedule', 'Speakers', 'Venue', 'Register'],
   '{"colors": {"primary": "#db2777", "secondary": "#7c3aed", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true),

  ('creator', 'Creator', 'Personal brand for creators', 'personal',
   ARRAY['Home', 'About', 'Content', 'Newsletter', 'Contact'],
   '{"colors": {"primary": "#f59e0b", "secondary": "#ec4899", "accent": "#8b5cf6"}}'::jsonb,
   '{}'::jsonb, true),

  ('one-page', 'One Page', 'Single scrolling page with sections', 'business',
   ARRAY['Home'],
   '{"colors": {"primary": "#2563eb", "secondary": "#14b8a6", "accent": "#f59e0b"}}'::jsonb,
   '{}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
