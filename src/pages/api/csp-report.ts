export async function POST(req: Request) {
  try {
    const report = await req.json();
    const correlationId = req.headers.get('x-correlation-id') || crypto.randomUUID();

    const cspViolation = {
      correlationId,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent') || 'unknown',
      report,
    };

    console.log('[CSP Report]', JSON.stringify(cspViolation, null, 2));

    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('csp-violation', { detail: cspViolation })
      );
    }

    const hubUrl = import.meta.env.HUB_URL;
    if (hubUrl && hubUrl !== 'disabled') {
      await fetch(`${hubUrl}/csp-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cspViolation),
      }).catch(() => {});
    }

    return new Response(null, { status: 204 });
  } catch (error: any) {
    console.error('[CSP Report Error]', error);
    return new Response(null, { status: 204 });
  }
}
