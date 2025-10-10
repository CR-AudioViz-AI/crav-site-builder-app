// Signed open/click tokens, HTML sanitize
import { TRACKING } from "./env.ts";

export async function signToken(payload: Record<string, any>): Promise<string> {
  if (!TRACKING.enabled()) return "";

  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(TRACKING.domain),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encodedData);
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return `${btoa(data)}.${signatureHex}`;
}

export async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = new Uint8Array(
      signature.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    return await crypto.subtle.verify("HMAC", key, signatureBytes, encodedData);
  } catch {
    return false;
  }
}

export async function verifyToken(token: string): Promise<Record<string, any> | null> {
  if (!TRACKING.enabled()) return null;

  try {
    const [encodedData, signatureHex] = token.split(".");
    const data = atob(encodedData);

    const encoder = new TextEncoder();
    const encodedDataBytes = encoder.encode(data);

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(TRACKING.domain),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encodedDataBytes
    );

    if (!valid) return null;

    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function createTrackingPixel(token: string): string {
  if (!TRACKING.enabled()) return "";
  return `<img src="https://${TRACKING.domain}/t/open/${token}" width="1" height="1" alt="" />`;
}

export function createTrackedLink(url: string, token: string): string {
  if (!TRACKING.enabled()) return url;
  return `https://${TRACKING.domain}/t/click/${token}?url=${encodeURIComponent(url)}`;
}
