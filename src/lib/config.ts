const get = (k: string) =>
  (globalThis as any).Deno?.env?.get?.(k) ??
  (import.meta as any).env?.[k] ??
  (typeof process !== 'undefined' ? (process as any).env?.[k] : undefined);

const RAW_HUB_URL = get("HUB_URL") || "";
const RAW_HUB_KEY = get("HUB_SIGNING_KEY") || "";
const RUNTIME = (get("VITE_RUNTIME_MODE") || "cloud") as "cloud"|"self_hosted"|"embedded-managed";

const HUB_URL = RAW_HUB_URL !== "disabled" ? RAW_HUB_URL : "";
const HUB_KEY = RAW_HUB_KEY !== "disabled" ? RAW_HUB_KEY : "";

export const HUB = {
  url: HUB_URL,
  key: HUB_KEY,
  enabled: !!HUB_URL && !!HUB_KEY,
};

export const RUNTIME_MODE = RUNTIME;

export const CAPTCHA = {
  provider: get("HCAPTCHA_SECRET")
    ? "hcaptcha"
    : get("RECAPTCHA_SECRET")
    ? "recaptcha"
    : "none",
  secret: get("HCAPTCHA_SECRET") || get("RECAPTCHA_SECRET") || "",
};

export const config = {
  supabaseUrl: get("VITE_SUPABASE_URL") || "",
  supabaseAnonKey: get("VITE_SUPABASE_ANON_KEY") || "",
};
