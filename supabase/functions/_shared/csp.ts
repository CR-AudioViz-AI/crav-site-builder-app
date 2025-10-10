export function cspHeaders(preview = false): Record<string, string> {
  const reportOnly = (Deno.env.get('CSP_REPORT_ONLY') || 'false').toLowerCase() === 'true';

  const base = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "font-src 'self' https: data:",
    "script-src 'self' 'unsafe-eval'",
    "frame-ancestors 'none'",
  ].join('; ');

  const headers: Record<string, string> = reportOnly
    ? { 'Content-Security-Policy-Report-Only': base }
    : { 'Content-Security-Policy': base };

  if (preview) {
    headers['X-Robots-Tag'] = 'noindex';
  }

  return headers;
}
