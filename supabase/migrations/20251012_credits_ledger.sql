/*
  # Credits Ledger & Balance System

  1. Ledger Table
    - Comprehensive tracking of all credit operations
    - Supports waived, internal bypass, and error states
    - Idempotency key tracking
    - Full metadata for audit

  2. Balance View
    - Materialized view for fast balance queries
    - Aggregates total spent per org

  3. Indexes
    - Optimized for common queries (by org, action, time)

  4. Functions
    - refresh_org_balance() - Update balance for specific org
*/

-- Create ledger table (if not exists from previous migration as credit_ledger)
CREATE TABLE IF NOT EXISTS ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  action text NOT NULL,
  cost int NOT NULL DEFAULT 0,
  waived boolean DEFAULT false,
  internal_bypass boolean DEFAULT false,
  idem_key text,
  status text DEFAULT 'ok',
  user_email text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;

-- RLS policy for org access
DROP POLICY IF EXISTS org_ledger ON ledger;
CREATE POLICY org_ledger ON ledger
  USING (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (org_id IN (
    SELECT id FROM organizations WHERE id = auth.uid()
    OR id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS ledger_org_time ON ledger(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_org_action_time ON ledger(org_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_org_idem ON ledger(org_id, idem_key);
CREATE INDEX IF NOT EXISTS ledger_status ON ledger(status) WHERE status != 'ok';

-- Materialized view for fast balance queries
DROP MATERIALIZED VIEW IF EXISTS ledger_balance CASCADE;
CREATE MATERIALIZED VIEW ledger_balance AS
  SELECT
    org_id,
    COALESCE(SUM(cost), 0)::int AS credits_spent,
    COUNT(*) AS total_operations,
    COUNT(*) FILTER (WHERE waived = true) AS waived_count,
    COUNT(*) FILTER (WHERE internal_bypass = true) AS internal_count,
    MAX(created_at) AS last_operation
  FROM ledger
  GROUP BY org_id;

-- Create unique index on materialized view for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS ledger_balance_org_id ON ledger_balance(org_id);

-- Helper function to refresh balance for a specific org
CREATE OR REPLACE FUNCTION refresh_org_balance(oid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the entire materialized view
  -- In production, you might want a more targeted approach
  REFRESH MATERIALIZED VIEW CONCURRENTLY ledger_balance;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to refresh ledger_balance: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT SELECT ON ledger_balance TO authenticated;
GRANT SELECT ON ledger TO authenticated;

-- Migrate existing credit_ledger data if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'credit_ledger'
  ) THEN
    -- Copy data from credit_ledger to ledger if not already there
    INSERT INTO ledger (id, org_id, action, cost, waived, internal_bypass, idem_key, status, user_email, meta, created_at)
    SELECT
      id,
      org_id,
      action,
      COALESCE(cost, 0),
      COALESCE(waived, false),
      COALESCE(internal_bypass, false),
      idempotency_key,
      CASE
        WHEN metadata->>'status' IS NOT NULL THEN metadata->>'status'
        ELSE 'ok'
      END,
      user_email,
      COALESCE(metadata, '{}'::jsonb),
      created_at
    FROM credit_ledger
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Migrated data from credit_ledger to ledger';
  END IF;
END $$;

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW ledger_balance;
