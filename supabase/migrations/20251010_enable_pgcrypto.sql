/*
  # Enable pgcrypto Extension

  1. Purpose
    - Required by ensure_default_site() which calls gen_random_uuid()
    - Provides cryptographic functions for PostgreSQL

  2. Changes
    - Enable pgcrypto extension if not already enabled
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;
