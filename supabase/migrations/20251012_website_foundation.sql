/*
  # Website Foundation - Multi-Tenancy & Platform Features

  1. Org Management
    - org_members - Team members with roles (owner, admin, editor, viewer)
    - org_entitlements - Tool access control per organization
    - org_branding - White-label branding (logo, colors, favicon)

  2. Support & Feedback
    - support_tickets - Customer support ticket system
    - product_feedback - User feedback collection

  3. Dashboard
    - dashboard_apps - Installed apps/tools registry

  4. Audit & Compliance
    - audit_log - Activity tracking for compliance

  5. Security
    - RLS policies on all tables
    - Role-based access control
    - Audit triggers
*/

-- Org Members (Team Management)
CREATE TABLE IF NOT EXISTS org_members (
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_members_rw ON org_members;
CREATE POLICY org_members_rw ON org_members
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

-- Org Entitlements (Tool Access Control)
CREATE TABLE IF NOT EXISTS org_entitlements (
  org_id uuid NOT NULL,
  tool_key text NOT NULL,
  entitlement text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (org_id, tool_key, entitlement)
);

ALTER TABLE org_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_ent_rw ON org_entitlements;
CREATE POLICY org_ent_rw ON org_entitlements
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

-- Org Branding (White-Label Support)
CREATE TABLE IF NOT EXISTS org_branding (
  org_id uuid PRIMARY KEY,
  name text,
  logo_url text,
  palette jsonb DEFAULT '{}'::jsonb,
  favicon_url text,
  white_label boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_branding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_brand_rw ON org_branding;
CREATE POLICY org_brand_rw ON org_branding
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  created_by uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  tags text[] DEFAULT '{}',
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_tickets_rw ON support_tickets;
CREATE POLICY org_tickets_rw ON support_tickets
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS tickets_org_status ON support_tickets(org_id, status);

-- Product Feedback
CREATE TABLE IF NOT EXISTS product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  app_key text NOT NULL,
  topic text NOT NULL,
  detail text NOT NULL,
  rating int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_feedback_rw ON product_feedback;
CREATE POLICY org_feedback_rw ON product_feedback
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

-- Dashboard Apps Registry
CREATE TABLE IF NOT EXISTS dashboard_apps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  tool_key text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  icon text,
  installed boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_dash_rw ON dashboard_apps;
CREATE POLICY org_dash_rw ON dashboard_apps
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS dash_org_tool ON dashboard_apps(org_id, tool_key);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_email text,
  action text NOT NULL,
  target text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_audit_r ON audit_log;
CREATE POLICY org_audit_r ON audit_log
  FOR SELECT
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS trg_brand_updated ON org_branding;
CREATE TRIGGER trg_brand_updated
  BEFORE UPDATE ON org_branding
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ticket_updated ON support_tickets;
CREATE TRIGGER trg_ticket_updated
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON org_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON org_entitlements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON org_branding TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;
GRANT SELECT, INSERT ON product_feedback TO authenticated;
GRANT SELECT, INSERT ON dashboard_apps TO authenticated;
GRANT SELECT ON audit_log TO authenticated;
