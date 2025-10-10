/*
  # Drop Newsletter Tables from Website Builder

  This migration safely removes newsletter tables that were mistakenly
  added to the Website Builder package. Newsletter will be a separate tool.

  ## Tables Dropped
  - subscribers
  - segments
  - campaigns
  - sends
  - email_events
  - unsubscribes
*/

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS email_events CASCADE;
DROP TABLE IF EXISTS unsubscribes CASCADE;
DROP TABLE IF EXISTS sends CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS segments CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;

-- Drop any newsletter-specific functions (if any were created)
DROP FUNCTION IF EXISTS newsletter_emit_event CASCADE;
DROP FUNCTION IF EXISTS newsletter_compute_segment CASCADE;
