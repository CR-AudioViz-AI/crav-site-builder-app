/*
  # Credits Ledger Standardization & Backward Compatibility

  1. Tables
    - Standardize on `ledger` table name
    - Create backward-compatible `credit_ledger` view
    - Add `org_wallets` table for actual balance tracking

  2. Materialized View
    - `ledger_balance` for fast spent credits aggregation
    - Concurrent refresh support

  3. Functions
    - `refresh_org_balance()` to update materialized view
    - Uses concurrent refresh for zero-downtime updates

  4. Indexes
    - Optimized for common query patterns
    - Support filtering by org, action, and time

  5. Security
    - RLS enabled on all tables
    - Org-scoped access policies
*/

-- Standard table name: ledger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ledger') THEN
    CREATE TABLE ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id uuid NOT NULL,
      action text NOT NULL,
      cost int NOT NULL DEFAULT 0,
      waived boolean DEFAULT false,
      internal_bypass boolean DEFAULT false,
      idem_key text,
      status text DEFAULT 'ok',
      meta jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Enable RLS on ledger
ALTER TABLE ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ledger' AND policyname = 'org_ledger'
  ) THEN
    CREATE POLICY org_ledger ON ledger
      USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
      WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_org_time ON ledger(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_org_action_time ON ledger(org_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_idem_key ON ledger(org_id, idem_key);

-- Backward compatibility: legacy name credit_ledger (if code somewhere still reads it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views WHERE table_name = 'credit_ledger'
  ) THEN
    CREATE OR REPLACE VIEW credit_ledger AS SELECT * FROM ledger;
  END IF;
END $$;

-- Org wallets table for actual balance tracking
CREATE TABLE IF NOT EXISTS org_wallets (
  org_id uuid PRIMARY KEY,
  credits_available int NOT NULL DEFAULT 1000,
  plan text DEFAULT 'starter',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on org_wallets
ALTER TABLE org_wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for org_wallets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'org_wallets' AND policyname = 'org_wallet_access'
  ) THEN
    CREATE POLICY org_wallet_access ON org_wallets
      USING (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()))
      WITH CHECK (org_id = (SELECT org_id FROM auth.user_metadata WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Materialized view for quick balance (spent)
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

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_balance_org_id ON ledger_balance(org_id);

-- Helper function to refresh balance for a specific org
CREATE OR REPLACE FUNCTION refresh_org_balance(oid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Refresh the entire materialized view concurrently
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
GRANT SELECT ON org_wallets TO authenticated;
GRANT SELECT ON credit_ledger TO authenticated;

-- Initial refresh of materialized view
REFRESH MATERIALIZED VIEW ledger_balance;
