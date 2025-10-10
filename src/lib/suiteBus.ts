import { signPayload } from './webhookSigning';

/**
 * Suite Bus - Cross-app event emissions
 *
 * Emits structured events that other apps can consume for integration workflows.
 */

const HUB_URL = import.meta.env.VITE_HUB_URL || import.meta.env.HUB_URL;
const HUB_SIGNING_KEY = import.meta.env.VITE_HUB_SIGNING_KEY || import.meta.env.HUB_SIGNING_KEY;

export interface SuiteEvent {
  event: string;
  orgId: string;
  userId?: string;
  timestamp: string;
  correlationId: string;
  payload: Record<string, any>;
}

/**
 * Emit event to suite bus
 */
export async function emitSuiteEvent(
  event: string,
  payload: Record<string, any>
): Promise<void> {
  if (!HUB_URL) {
    console.warn('HUB_URL not configured, skipping suite event emission');
    return;
  }

  const suiteEvent: SuiteEvent = {
    event,
    orgId: payload.orgId || payload.org_id,
    userId: payload.userId || payload.user_id,
    timestamp: new Date().toISOString(),
    correlationId: payload.correlationId || `EVT-${Date.now()}`,
    payload
  };

  try {
    const body = JSON.stringify(suiteEvent);
    const signature = await signPayload(body, HUB_SIGNING_KEY || '');

    const response = await fetch(`${HUB_URL}/suite-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature': `sha256=${signature}`
      },
      body
    });

    if (!response.ok) {
      console.error(`Failed to emit suite event ${event}:`, await response.text());
    } else {
      console.log(`Suite event emitted: ${event}`);
    }
  } catch (error) {
    console.error(`Error emitting suite event ${event}:`, error);
  }
}

/**
 * Website-specific event emitters
 */

export async function emitSiteGenerated(payload: {
  orgId: string;
  userId: string;
  siteId: string;
  pages: string[];
  correlationId: string;
}): Promise<void> {
  await emitSuiteEvent('site.generated', {
    ...payload,
    app: 'website',
    action: 'generate'
  });
}

export async function emitSitePublished(payload: {
  orgId: string;
  userId: string;
  siteId: string;
  url: string;
  pages: string[];
  brand?: {
    logo?: string;
    palette?: Record<string, string>;
  };
  meta?: {
    title?: string;
    description?: string;
  };
  correlationId: string;
}): Promise<void> {
  await emitSuiteEvent('site.published', {
    ...payload,
    app: 'website',
    action: 'publish'
  });
}

export async function emitSiteExported(payload: {
  orgId: string;
  userId: string;
  siteId: string;
  url: string;
  format: string;
  correlationId: string;
}): Promise<void> {
  await emitSuiteEvent('site.exported', {
    ...payload,
    app: 'website',
    action: 'export'
  });
}

export async function emitProductCreated(payload: {
  orgId: string;
  userId: string;
  siteId: string;
  productId: string;
  name: string;
  price: number;
  correlationId: string;
}): Promise<void> {
  await emitSuiteEvent('product.created', {
    ...payload,
    app: 'website',
    action: 'product_create'
  });
}

export async function emitBrandUpdated(payload: {
  orgId: string;
  userId: string;
  siteId?: string;
  logo?: string;
  palette?: Record<string, string>;
  fonts?: Record<string, string>;
  correlationId: string;
}): Promise<void> {
  await emitSuiteEvent('brand.updated', {
    ...payload,
    app: 'website',
    action: 'brand_update'
  });
}

/**
 * Helper to generate correlationId
 */
export function generateCorrelationId(prefix: string = 'EVT'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
