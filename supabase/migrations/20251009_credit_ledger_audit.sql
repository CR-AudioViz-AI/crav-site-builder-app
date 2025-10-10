/*
  # Credit Ledger Audit Columns

  1. Schema Changes
    - Add internal_bypass column to track staff usage
    - Add user_email column for audit trail
    - Create view for billable vs logical credits

  2. Security
    - Shadow ledger: internal_bypass=true with cost=0
    - Maintains accurate reporting for finance ops
*/

-- Add audit columns to credit_ledger (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_ledger' AND column_name = 'internal_bypass'
  ) THEN
    ALTER TABLE credit_ledger ADD COLUMN internal_bypass boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_ledger' AND column_name = 'user_email'
  ) THEN
    ALTER TABLE credit_ledger ADD COLUMN user_email text;
  END IF;
END $$;

-- Create view for finance ops (billable vs logical credits)
CREATE OR REPLACE VIEW v_credit_spend AS
SELECT
  org_id,
  SUM(CASE WHEN internal_bypass THEN 0 ELSE cost END) AS billable_credits,
  SUM(cost) AS logical_credits,
  COUNT(*) AS actions,
  COUNT(*) FILTER (WHERE internal_bypass) AS internal_actions,
  COUNT(*) FILTER (WHERE NOT internal_bypass) AS customer_actions
FROM credit_ledger
GROUP BY org_id;

-- Index for faster queries on internal bypass
CREATE INDEX IF NOT EXISTS idx_credit_ledger_internal_bypass
  ON credit_ledger(org_id, internal_bypass, created_at);
