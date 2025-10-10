/**
 * Env preflight: fail fast ONLY when truly required vars are missing.
 * - For Vite cloud runtime, HUB_* may be "disabled".
 * - We require CSP_REPORT_ONLY, VITE_RUNTIME_MODE, INTERNAL_BYPASS_MODE always.
 * - We warn (not fail) about optional client/server providers.
 */

const isProd = process.env.NODE_ENV === 'production';
const env = process.env;

function req(name, opts = {}) {
  const v = env[name];
  if (!v || v === '') {
    if (opts.allowEmpty) return '';
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function main() {
  // Always-required
  req('VITE_RUNTIME_MODE');
  req('CSP_REPORT_ONLY');
  req('INTERNAL_BYPASS_MODE');

  // Disallow INTERNAL_BYPASS_MODE=full in production
  if (isProd && env.INTERNAL_BYPASS_MODE === 'full') {
    throw new Error('INTERNAL_BYPASS_MODE=full is not allowed in production.');
  }

  // Hub keys: permitted to be 'disabled' in cloud runtime
  const runtime = env.VITE_RUNTIME_MODE || 'cloud';
  const hubUrl = env.HUB_URL || 'disabled';
  const hubKey = env.HUB_SIGNING_KEY || 'disabled';
  const hubDisabled = hubUrl === 'disabled' || hubKey === 'disabled';

  if (runtime !== 'cloud' && hubDisabled) {
    throw new Error(`HUB_URL/HUB_SIGNING_KEY must be set when VITE_RUNTIME_MODE=${runtime}`);
  }

  // Friendly warnings for optional providers
  const warns = [];
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
    warns.push('Supabase client vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are empty. If your UI uses Supabase, set them.');
  }
  if (env.SUPABASE_URL && !env.SUPABASE_SERVICE_ROLE_KEY) {
    warns.push('SUPABASE_URL set but SUPABASE_SERVICE_ROLE_KEY missing — server functions may fail.');
  }

  if (warns.length) {
    console.log('⚠️  Warnings:');
    for (const w of warns) console.log(' - ' + w);
  }

  console.log('✅ Env check passed:', {
    NODE_ENV: env.NODE_ENV,
    VITE_RUNTIME_MODE: runtime,
    CSP_REPORT_ONLY: env.CSP_REPORT_ONLY,
    INTERNAL_BYPASS_MODE: env.INTERNAL_BYPASS_MODE,
    HUB_URL: hubUrl,
    HUB_SIGNING_KEY: hubKey ? (hubKey === 'disabled' ? 'disabled' : '***set***') : 'missing',
  });
}

try { main(); } catch (e) { console.error('❌', e.message); process.exit(1); }
