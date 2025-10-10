// Centralized environment loader for edge functions
// Works in Deno or Node edge runtimes

const get = (k: string) => {
  const val = (globalThis as any).Deno?.env?.get?.(k) ?? (typeof process !== 'undefined' ? process.env[k] : undefined);
  return val || undefined;
};

export const RUNTIME = {
  mode: (get("VITE_RUNTIME_MODE") || "cloud").toLowerCase() as "cloud"|"self_hosted"|"embedded-managed",
};

const RAW_HUB_URL = get("HUB_URL") || "";
const RAW_HUB_KEY = get("HUB_SIGNING_KEY") || "";

const HUB_URL_SANITIZED =
  RAW_HUB_URL && RAW_HUB_URL !== "disabled" ? RAW_HUB_URL : "";
const HUB_KEY_SANITIZED =
  RAW_HUB_KEY && RAW_HUB_KEY !== "disabled" ? RAW_HUB_KEY : "";

export const HUB = {
  url: HUB_URL_SANITIZED,
  key: HUB_KEY_SANITIZED,
  enabled(): boolean {
    return !!HUB_URL_SANITIZED && !!HUB_KEY_SANITIZED;
  },
};

export const CAPTCHA = {
  provider: (get("CAPTCHA_PROVIDER") || "none").toLowerCase() as "none"|"hcaptcha"|"recaptcha",
  secret(): string {
    if (this.provider === "hcaptcha") return get("HCAPTCHA_SECRET") || "";
    if (this.provider === "recaptcha") return get("RECAPTCHA_SECRET") || "";
    return "";
  }
};

export const SUPABASE = {
  url: get("SUPABASE_URL") || "",
  serviceKey: get("SUPABASE_SERVICE_ROLE_KEY") || "",
};
