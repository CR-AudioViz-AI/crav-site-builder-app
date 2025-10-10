/*
  # Suite Integration Schema

  1. Enhanced Credits Ledger
    - Add app, action, correlation_id columns for granular tracking
    - Add parent_entry_id for refund tracking
    - Add op_journal for operation status

  2. Brand Assets Table
    - Shared brand kit storage (logo, palette, fonts)
    - Synced from Website Builder, consumed by other apps

  3. Deliverables Table
    - Catalog of published sites, exports, assets
    - Cross-app discovery and reuse

  4. Audit Log Table
    - High-impact action tracking
    - Compliance and governance

  5. Support Tickets Table
    - Dispute flow for credit refunds
    - "No charge for our mistakes" policy

  6. RLS Policies
    - Secure access per organization
*/

-- =====================================================
-- 1. ENHANCED CREDITS LEDGER
-- =====================================================

-- Add suite integration columns to credits_ledger
ALTER TABLE credits_ledger
  ADD COLUMN IF NOT EXISTS app TEXT DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS parent_entry_id UUID REFERENCES credits_ledger(id),
  ADD COLUMN IF NOT EXISTS op_journal TEXT DEFAULT 'pending';

-- Create index for correlation_id lookups
CREATE INDEX IF NOT EXISTS idx_credits_ledger_correlation_id
  ON credits_ledger(correlation_id);

-- Create index for parent_entry_id (refund tracking)
CREATE INDEX IF NOT EXISTS idx_credits_ledger_parent_entry_id
  ON credits_ledger(parent_entry_id);

-- Create index for app and action filtering
CREATE INDEX IF NOT EXISTS idx_credits_ledger_app_action
  ON credits_ledger(app, action);

-- RPC: Get ledger entries by correlation ID
CREATE OR REPLACE FUNCTION get_ledger_by_correlation_id(
  p_correlation_id TEXT
) RETURNS SETOF credits_ledger AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM credits_ledger
  WHERE correlation_id = p_correlation_id
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Create refund entry
CREATE OR REPLACE FUNCTION create_refund_entry(
  p_org_id UUID,
  p_parent_entry_id UUID,
  p_correlation_id TEXT,
  p_reason TEXT DEFAULT 'operation_failed'
) RETURNS UUID AS $$
DECLARE
  v_parent_credits NUMERIC;
  v_refund_id UUID;
BEGIN
  -- Get original debit amount
  SELECT credits INTO v_parent_credits
  FROM credits_ledger
  WHERE id = p_parent_entry_id;

  -- Create refund entry (positive amount)
  INSERT INTO credits_ledger (
    org_id,
    credits,
    balance,
    description,
    app,
    action,
    correlation_id,
    parent_entry_id,
    op_journal,
    metadata
  )
  VALUES (
    p_org_id,
    ABS(v_parent_credits), -- Refund as positive
    (SELECT balance FROM credits_ledger WHERE org_id = p_org_id ORDER BY created_at DESC LIMIT 1) + ABS(v_parent_credits),
    'Refund: ' || p_reason,
    (SELECT app FROM credits_ledger WHERE id = p_parent_entry_id),
    'refund',
    p_correlation_id,
    p_parent_entry_id,
    'refunded',
    jsonb_build_object('reason', p_reason, 'parent_id', p_parent_entry_id)
  )
  RETURNING id INTO v_refund_id;

  -- Update parent entry status
  UPDATE credits_ledger
  SET op_journal = 'refunded'
  WHERE id = p_parent_entry_id;

  RETURN v_refund_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. BRAND ASSETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,

  -- Brand elements
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  palette JSONB, -- { primary, secondary, accent, neutral }
  fonts JSONB,   -- { heading, body, mono }

  -- Metadata
  source TEXT DEFAULT 'website', -- which app created this
  version INTEGER DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(org_id, source)
);

-- Enable RLS
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own org brand assets"
  ON brand_assets FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own org brand assets"
  ON brand_assets FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Users can insert own org brand assets"
  ON brand_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- RPC: Sync brand kit from website
CREATE OR REPLACE FUNCTION sync_brand_kit(
  p_org_id UUID,
  p_site_id UUID,
  p_logo_url TEXT DEFAULT NULL,
  p_palette JSONB DEFAULT NULL,
  p_fonts JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_brand_id UUID;
BEGIN
  INSERT INTO brand_assets (
    org_id,
    site_id,
    logo_url,
    palette,
    fonts,
    source,
    version
  )
  VALUES (
    p_org_id,
    p_site_id,
    p_logo_url,
    p_palette,
    p_fonts,
    'website',
    1
  )
  ON CONFLICT (org_id, source) DO UPDATE SET
    logo_url = COALESCE(EXCLUDED.logo_url, brand_assets.logo_url),
    palette = COALESCE(EXCLUDED.palette, brand_assets.palette),
    fonts = COALESCE(EXCLUDED.fonts, brand_assets.fonts),
    site_id = EXCLUDED.site_id,
    version = brand_assets.version + 1,
    updated_at = now()
  RETURNING id INTO v_brand_id;

  RETURN v_brand_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. DELIVERABLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source info
  app TEXT NOT NULL, -- 'website', 'newsletter', 'social', etc.
  kind TEXT NOT NULL, -- 'published_site', 'export_zip', 'image', etc.
  ref_id TEXT, -- siteId, campaignId, etc.

  -- Deliverable details
  label TEXT NOT NULL,
  url TEXT,
  metadata JSONB,
  tags TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deliverables_org_id ON deliverables(org_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_app ON deliverables(app);
CREATE INDEX IF NOT EXISTS idx_deliverables_kind ON deliverables(kind);
CREATE INDEX IF NOT EXISTS idx_deliverables_tags ON deliverables USING GIN(tags);

-- Enable RLS
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own org deliverables"
  ON deliverables FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own org deliverables"
  ON deliverables FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- RPC: Register deliverable
CREATE OR REPLACE FUNCTION register_deliverable(
  p_org_id UUID,
  p_app TEXT,
  p_kind TEXT,
  p_label TEXT,
  p_url TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_deliverable_id UUID;
BEGIN
  INSERT INTO deliverables (
    org_id,
    app,
    kind,
    label,
    url,
    ref_id,
    metadata,
    tags
  )
  VALUES (
    p_org_id,
    p_app,
    p_kind,
    p_label,
    p_url,
    p_ref_id,
    p_metadata,
    p_tags
  )
  RETURNING id INTO v_deliverable_id;

  RETURN v_deliverable_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Action details
  action TEXT NOT NULL,
  resource_type TEXT, -- 'site', 'product', 'page', etc.
  resource_id TEXT,

  -- Change tracking
  diff JSONB,
  metadata JSONB,

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own org audit log"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- RPC: Log audit event
CREATE OR REPLACE FUNCTION log_audit_event(
  p_org_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_diff JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_log (
    org_id,
    user_id,
    action,
    resource_type,
    resource_id,
    diff,
    metadata
  )
  VALUES (
    p_org_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_diff,
    p_metadata
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. SUPPORT TICKETS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Ticket details
  type TEXT DEFAULT 'dispute', -- 'dispute', 'bug', 'feature', etc.
  charge_id UUID REFERENCES credits_ledger(id),
  subject TEXT NOT NULL,
  description TEXT,

  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'auto_refunded'
  resolution TEXT,
  refund_id UUID REFERENCES credits_ledger(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id ON support_tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_charge_id ON support_tickets(charge_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own org tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own org tickets"
  ON support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- RPC: Create dispute ticket
CREATE OR REPLACE FUNCTION create_dispute_ticket(
  p_org_id UUID,
  p_user_id UUID,
  p_charge_id UUID,
  p_reason TEXT
) RETURNS UUID AS $$
DECLARE
  v_ticket_id UUID;
  v_charge_amount NUMERIC;
  v_is_known_issue BOOLEAN;
BEGIN
  -- Get charge amount
  SELECT credits INTO v_charge_amount
  FROM credits_ledger
  WHERE id = p_charge_id;

  -- Check if known issue (simplified logic)
  v_is_known_issue := (
    p_reason ILIKE '%timeout%' OR
    p_reason ILIKE '%error%' OR
    p_reason ILIKE '%failed%'
  );

  -- Create ticket
  INSERT INTO support_tickets (
    org_id,
    user_id,
    type,
    charge_id,
    subject,
    description,
    status
  )
  VALUES (
    p_org_id,
    p_user_id,
    'dispute',
    p_charge_id,
    'Credit Dispute',
    p_reason,
    CASE WHEN v_is_known_issue THEN 'auto_refunded' ELSE 'pending' END
  )
  RETURNING id INTO v_ticket_id;

  -- Auto-refund for known issues
  IF v_is_known_issue THEN
    UPDATE support_tickets
    SET
      refund_id = create_refund_entry(p_org_id, p_charge_id,
        (SELECT correlation_id FROM credits_ledger WHERE id = p_charge_id),
        'auto_refund_dispute'
      ),
      resolved_at = now()
    WHERE id = v_ticket_id;
  END IF;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON brand_assets TO authenticated;
GRANT SELECT, INSERT ON deliverables TO authenticated;
GRANT SELECT ON audit_log TO authenticated;
GRANT SELECT, INSERT ON support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON credits_ledger TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION sync_brand_kit TO authenticated;
GRANT EXECUTE ON FUNCTION register_deliverable TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION create_refund_entry TO authenticated;
GRANT EXECUTE ON FUNCTION create_dispute_ticket TO authenticated;
GRANT EXECUTE ON FUNCTION get_ledger_by_correlation_id TO authenticated;
