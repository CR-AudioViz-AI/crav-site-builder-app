/*
  # Fix org_id types to uuid (v2)

  ## Changes
  - Drop existing policies first
  - Convert org_id columns from text to uuid
  - Recreate policies with correct types
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own org idempotency results" ON idempotency_results;
DROP POLICY IF EXISTS "Users can view own org transactions" ON credit_transactions;

-- Fix idempotency_results.org_id type
ALTER TABLE idempotency_results 
  ALTER COLUMN org_id TYPE uuid USING org_id::uuid;

-- Fix credit_transactions.org_id type  
ALTER TABLE credit_transactions 
  ALTER COLUMN org_id TYPE uuid USING org_id::uuid;

-- Recreate RLS policies with correct types
CREATE POLICY "Users can view own org idempotency results" 
  ON idempotency_results FOR SELECT
  TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);

CREATE POLICY "Users can view own org transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'org_id')::uuid = org_id);
