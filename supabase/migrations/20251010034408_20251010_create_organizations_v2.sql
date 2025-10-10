/*
  # Create Organizations Table

  1. New Tables
    - `organizations`
      - `id` (uuid, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `credits` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `org_members`
      - `id` (uuid, primary key)
      - `org_id` (uuid, references organizations)
      - `user_id` (uuid, references auth.users)
      - `role` (text, default 'member')
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to read/update their own orgs
*/

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  credits integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Organization members table (must be created before policies reference it)
CREATE TABLE IF NOT EXISTS org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Policies for organizations
CREATE POLICY "Users can read own organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR 
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid() OR 
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    id = auth.uid() OR 
    id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- Policies for org_members
CREATE POLICY "Users can read org members for their orgs"
  ON org_members FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT id FROM organizations WHERE id = auth.uid() OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()))
  );

CREATE POLICY "Org owners can manage members"
  ON org_members FOR ALL
  TO authenticated
  USING (
    org_id IN (SELECT id FROM organizations WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON org_members(user_id);

-- Insert a default demo organization
INSERT INTO organizations (id, name, slug, credits)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization', 'demo-org', 10000)
ON CONFLICT (id) DO NOTHING;
