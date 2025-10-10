interface TelemetryEvent {
  type: string;
  orgId: string;
  siteId?: string;
  userId?: string;
  correlationId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class TelemetryCollector {
  private static instance: TelemetryCollector;
  private events: TelemetryEvent[] = [];

  private constructor() {}

  static getInstance(): TelemetryCollector {
    if (!TelemetryCollector.instance) {
      TelemetryCollector.instance = new TelemetryCollector();
    }
    return TelemetryCollector.instance;
  }

  async track(type: string, data: Partial<TelemetryEvent>) {
    const event: TelemetryEvent = {
      type,
      orgId: data.orgId || '',
      siteId: data.siteId,
      userId: data.userId,
      correlationId: data.correlationId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      metadata: data.metadata,
    };

    this.events.push(event);
    console.log('event:', JSON.stringify(event));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('telemetry', { detail: event }));
    }

    const hubUrl = import.meta.env.HUB_URL;
    if (hubUrl && hubUrl !== 'disabled') {
      try {
        const { sendSignedWebhook } = await import('./webhookSigning');
        await sendSignedWebhook(
          `${hubUrl}/telemetry`,
          event,
          event.correlationId
        ).catch(() => {});
      } catch (error) {
        console.warn('Failed to send telemetry to hub:', error);
      }
    }
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  clear() {
    this.events = [];
  }
}

export const telemetry = TelemetryCollector.getInstance();

export function trackGenerateSite(orgId: string, siteId: string, metadata?: any) {
  telemetry.track('generate_site', { orgId, siteId, metadata });
}

export function trackAIApply(orgId: string, siteId: string, action: string, metadata?: any) {
  telemetry.track('ai_apply_' + action, { orgId, siteId, metadata });
}

export function trackPublish(orgId: string, siteId: string, url: string) {
  telemetry.track('publish_site', { orgId, siteId, metadata: { url } });
}

export function trackCheckout(orgId: string, productId: string, provider: string) {
  telemetry.track('checkout_initiated', { orgId, metadata: { productId, provider } });
}

export function trackUpsell(orgId: string, context: string, action: string) {
  telemetry.track('upsell_' + action, { orgId, metadata: { context } });
}
