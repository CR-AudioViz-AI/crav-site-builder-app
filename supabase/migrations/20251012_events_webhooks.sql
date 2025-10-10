/*
  # Events & Webhooks System

  1. Events
    - Track all significant actions
    - Enable integrations and automation

  2. Webhooks
    - Organization webhook endpoints
    - Signed delivery
    - Retry tracking

  3. Security
    - RLS policies
    - Audit trail
*/

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  org_id uuid NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  source text DEFAULT 'website',
  timestamp timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_read ON events;
CREATE POLICY events_read ON events
  FOR SELECT
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_events_org ON events(org_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- Webhooks table
CREATE TABLE IF NOT EXISTS org_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  url text NOT NULL,
  secret text NOT NULL,
  active boolean DEFAULT true,
  events text[] DEFAULT ARRAY['*'],
  last_delivery_at timestamptz,
  delivery_count int DEFAULT 0,
  failure_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE org_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_rw ON org_webhooks;
CREATE POLICY webhooks_rw ON org_webhooks
  FOR ALL
  USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON org_webhooks(org_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON org_webhooks(active);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trg_webhooks_updated ON org_webhooks;
CREATE TRIGGER trg_webhooks_updated
  BEFORE UPDATE ON org_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Grant permissions
GRANT SELECT ON events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON org_webhooks TO authenticated;
