const HUB_SIGNING_KEY = import.meta.env.HUB_SIGNING_KEY;

export async function signPayload(payload: any): Promise<string> {
  if (!HUB_SIGNING_KEY || HUB_SIGNING_KEY === 'disabled') {
    return '';
  }

  const data = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(HUB_SIGNING_KEY);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

export async function verifySignature(
  payload: any,
  signature: string
): Promise<boolean> {
  if (!HUB_SIGNING_KEY || HUB_SIGNING_KEY === 'disabled') {
    return true;
  }

  const expectedSignature = await signPayload(payload);
  return signature === expectedSignature;
}

export async function sendSignedWebhook(
  url: string,
  payload: any,
  correlationId?: string
): Promise<Response> {
  const signature = await signPayload(payload);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature': signature,
      'X-Correlation-Id': correlationId || crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
}
