/*
  # Website Initialization Support

  1. New Tables
    - `org_settings` - Store business details per org (optional)
      - `org_id` (uuid, primary key)
      - `business` (jsonb) - Flexible business info storage
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `ensure_default_site(pid uuid)` - Creates default site if none exists

  3. Security
    - Enable RLS on `org_settings`
    - Add policy for org-scoped access
*/

-- Org settings table for business details
CREATE TABLE IF NOT EXISTS org_settings (
  org_id uuid PRIMARY KEY,
  business jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own org settings"
  ON org_settings FOR SELECT
  TO authenticated
  USING (org_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid);

CREATE POLICY "Users can insert own org settings"
  ON org_settings FOR INSERT
  TO authenticated
  WITH CHECK (org_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid);

CREATE POLICY "Users can update own org settings"
  ON org_settings FOR UPDATE
  TO authenticated
  USING (org_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid)
  WITH CHECK (org_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid);

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_org_settings_updated'
  ) THEN
    CREATE TRIGGER trg_org_settings_updated
      BEFORE UPDATE ON org_settings
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

-- Function to ensure at least one site exists per org
CREATE OR REPLACE FUNCTION ensure_default_site(pid uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE
  sid uuid;
BEGIN
  -- Check if org already has a site
  SELECT id INTO sid
  FROM sites
  WHERE org_id = pid
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no site exists, create a default one
  IF sid IS NULL THEN
    sid := gen_random_uuid();
    INSERT INTO sites(id, org_id, handle, name, status, created_at, updated_at)
    VALUES (
      sid,
      pid,
      'default-' || substring(sid::text from 1 for 8),
      'Default Site',
      'draft',
      now(),
      now()
    );
  END IF;

  RETURN sid;
END $$;
