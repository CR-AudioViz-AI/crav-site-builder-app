/*
  # Website Helper RPCs v2

  1. Functions
    - `ensure_default_site` - Create or return default site for an org
    - `has_tool_entitlement` - Check if org has access to a tool
    - `get_idempotency_result` - Get cached idempotency result
    - Drop and recreate `debit_credits` with correct return type
    - `emit_event` - Emit an event (no-op for cloud mode)

  2. Purpose
    - Simplify common operations for website builder
    - Provide consistent interfaces across functions
*/

-- Ensure default site exists for org
CREATE OR REPLACE FUNCTION ensure_default_site(pid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_site_id uuid;
BEGIN
  -- Try to find existing default site
  SELECT id INTO v_site_id
  FROM sites
  WHERE org_id = pid
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no site exists, create one
  IF v_site_id IS NULL THEN
    INSERT INTO sites (org_id, name, theme, settings)
    VALUES (
      pid,
      'My Website',
      '{"colors": {"primary": "#2563eb", "secondary": "#7c3aed"}}'::jsonb,
      '{}'::jsonb
    )
    RETURNING id INTO v_site_id;
  END IF;

  RETURN v_site_id;
END;
$$;

-- Check tool entitlement (always returns true for demo)
CREATE OR REPLACE FUNCTION has_tool_entitlement(p_org_id uuid, p_tool text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- For demo purposes, always return true
  -- In production, check org_entitlements table
  RETURN true;
END;
$$;

-- Get idempotency result
CREATE OR REPLACE FUNCTION get_idempotency_result(p_key text, p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT result INTO v_result
  FROM idempotency_results
  WHERE key = p_key
    AND org_id = p_org_id
    AND expires_at > now();

  RETURN v_result;
END;
$$;

-- Drop existing debit_credits if exists
DROP FUNCTION IF EXISTS debit_credits(uuid, text, integer, text, jsonb);

-- Debit credits (returns jsonb)
CREATE OR REPLACE FUNCTION debit_credits(
  p_org_id uuid,
  p_action text,
  p_amount integer,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits integer;
  v_transaction_id uuid;
BEGIN
  -- Check if transaction already exists
  SELECT id INTO v_transaction_id
  FROM credit_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_transaction_id IS NOT NULL THEN
    -- Already debited, return success
    RETURN jsonb_build_object(
      'success', true,
      'debited', p_amount,
      'action', p_action,
      'duplicate', true
    );
  END IF;

  -- Get current credits
  SELECT credits INTO v_current_credits
  FROM organizations
  WHERE id = p_org_id;

  -- Check if sufficient credits (skip check for demo org)
  IF v_current_credits < p_amount AND p_org_id != '00000000-0000-0000-0000-000000000001' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'current', v_current_credits,
      'required', p_amount
    );
  END IF;

  -- Debit credits
  UPDATE organizations
  SET credits = credits - p_amount
  WHERE id = p_org_id;

  -- Record transaction
  INSERT INTO credit_transactions (org_id, action, amount, idempotency_key, metadata)
  VALUES (p_org_id, p_action, p_amount, p_idempotency_key, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'debited', p_amount,
    'action', p_action,
    'remaining', v_current_credits - p_amount
  );
END;
$$;

-- Emit event (no-op in cloud mode, can be implemented for event bus)
CREATE OR REPLACE FUNCTION emit_event(
  p_event_type text,
  p_org_id uuid,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- In cloud mode, this is a no-op
  -- In self-hosted mode, you might push to a queue or event table
  NULL;
END;
$$;
