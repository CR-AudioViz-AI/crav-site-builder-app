export interface PublishInput {
  orgId: string;
  siteId: string;
  buildDir: string;
  domain?: string;
  preview?: boolean;
}

export interface PublishResult {
  url: string;
  meta?: Record<string, unknown>;
}

export interface Publisher {
  publish(input: PublishInput): Promise<PublishResult>;
}

export function getPublisher(name: string): Publisher {
  switch (name) {
    case 'vercel':
      return new VercelPublisher();
    case 'netlify':
      return new NetlifyPublisher();
    case 's3':
      return new S3CloudFrontPublisher();
    case 'cloudflare':
      return new CloudflarePublisher();
    case 'static':
      return new StaticPublisher();
    default:
      throw new Error(`Unknown publisher: ${name}`);
  }
}

class VercelPublisher implements Publisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    const token = import.meta.env.VERCEL_TOKEN;
    if (!token) {
      return {
        url: `https://preview-${input.siteId}.vercel.app`,
        meta: { error: 'VERCEL_TOKEN not configured' },
      };
    }

    return {
      url: input.preview
        ? `https://preview-${input.siteId}.vercel.app`
        : input.domain || `https://${input.siteId}.vercel.app`,
      meta: { provider: 'vercel' },
    };
  }
}

class NetlifyPublisher implements Publisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    const token = import.meta.env.NETLIFY_AUTH_TOKEN;
    if (!token) {
      return {
        url: `https://${input.siteId}.netlify.app`,
        meta: { error: 'NETLIFY_AUTH_TOKEN not configured' },
      };
    }

    return {
      url: input.preview
        ? `https://preview-${input.siteId}.netlify.app`
        : input.domain || `https://${input.siteId}.netlify.app`,
      meta: { provider: 'netlify' },
    };
  }
}

class S3CloudFrontPublisher implements Publisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    return {
      url: input.domain || `https://${input.siteId}.s3-website.amazonaws.com`,
      meta: { provider: 's3', cdn: 'cloudfront' },
    };
  }
}

class CloudflarePublisher implements Publisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    return {
      url: input.preview
        ? `https://preview-${input.siteId}.pages.dev`
        : input.domain || `https://${input.siteId}.pages.dev`,
      meta: { provider: 'cloudflare-pages' },
    };
  }
}

class StaticPublisher implements Publisher {
  async publish(input: PublishInput): Promise<PublishResult> {
    return {
      url: `https://static-download.demo.com/${input.siteId}.zip`,
      meta: { provider: 'static', download_only: true },
    };
  }
}
