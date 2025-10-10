// Secrets guard - only read what this app uses
export type RuntimeMode = 'cloud' | 'self_hosted' | 'embedded-managed';

const get = (k: string): string | undefined => {
  const val = (globalThis as any).Deno?.env?.get?.(k) ?? (typeof process !== 'undefined' ? process.env[k] : undefined);
  return val || undefined;
};

const RAW_HUB_URL = get('HUB_URL');
const RAW_HUB_KEY = get('HUB_SIGNING_KEY');

export const env = {
  runtime: (get('VITE_RUNTIME_MODE') ?? 'cloud') as RuntimeMode,

  // Treat "disabled" as unset so Hub push becomes a true no-op
  hubUrl: RAW_HUB_URL && RAW_HUB_URL !== 'disabled' ? RAW_HUB_URL : undefined,
  hubKey: RAW_HUB_KEY && RAW_HUB_KEY !== 'disabled' ? RAW_HUB_KEY : undefined,

  captchaProvider: (get('CAPTCHA_PROVIDER') ?? 'none') as 'none' | 'hcaptcha' | 'recaptcha',
  trackingDomain: get('TRACKING_DOMAIN'),

  // AI provider keys (app-specific)
  javariUrl: get('JAVARI_API_URL'),
  javariKey: get('JAVARI_API_KEY'),
  openaiKey: get('OPENAI_API_KEY'),
  anthropicKey: get('ANTHROPIC_API_KEY'),

  // Deploy provider tokens
  vercelToken: get('VERCEL_TOKEN'),
  netlifyToken: get('NETLIFY_TOKEN'),

  // Internal unlimited access
  internalBypassMode: (get('INTERNAL_BYPASS_MODE') ?? 'none') as 'none' | 'credits' | 'all',
  internalOrgIdsCsv: get('INTERNAL_UNLIMITED_ORG_IDS') ?? '',
  internalEmailDomain: get('INTERNAL_EMAIL_DOMAIN') ?? 'craudiovizai.com',
  internalKillSwitch: get('INTERNAL_BYPASS_DISABLED') === 'true',
};

export const INTERNAL_ORG_IDS = new Set(
  env.internalOrgIdsCsv.split(',').map(s => s.trim()).filter(Boolean)
);

// Hub enabled check
export const hubEnabled = !!(env.hubUrl && env.hubKey);

// CAPTCHA secret reader
export function readCaptchaSecret(): string | undefined {
  if (env.captchaProvider === 'hcaptcha') return get('HCAPTCHA_SECRET');
  if (env.captchaProvider === 'recaptcha') return get('RECAPTCHA_SECRET');
  return undefined;
}

// Legacy exports for backward compatibility
export const RUNTIME = {
  mode: env.runtime,
};

export const HUB = {
  url: env.hubUrl || '',
  key: env.hubKey || '',
  signingKey: env.hubKey || '',
  enabled(): boolean {
    return hubEnabled;
  }
};

export const CAPTCHA = {
  provider: env.captchaProvider,
  secret(): string {
    return readCaptchaSecret() || '';
  }
};

export const TRACKING = {
  domain: env.trackingDomain || '',
  enabled(): boolean {
    return !!env.trackingDomain;
  }
};

export const DEPLOY = {
  vercel: {
    token: env.vercelToken || '',
    enabled(): boolean {
      return !!env.vercelToken;
    }
  },
  netlify: {
    token: env.netlifyToken || '',
    enabled(): boolean {
      return !!env.netlifyToken;
    }
  }
};

export const SUPABASE = {
  url: get('SUPABASE_URL') || '',
  serviceKey: get('SUPABASE_SERVICE_ROLE_KEY') || '',
};

export const AI = {
  javariUrl: env.javariUrl || '',
  javariKey: env.javariKey || '',
  openaiKey: env.openaiKey || '',
  anthropicKey: env.anthropicKey || '',
};
