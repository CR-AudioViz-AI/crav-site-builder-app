export type AssetRef = {
  assetId: string;
  alt?: string;
};

export type WebBlock =
  | {
      kind: 'hero';
      headline: string;
      subhead?: string;
      cta?: { label: string; href: string };
      media?: AssetRef;
      html?: string;
    }
  | {
      kind: 'features';
      items: { title: string; desc: string; icon?: string }[];
      html?: string;
    }
  | {
      kind: 'services';
      items: { title: string; desc: string; price?: string }[];
      html?: string;
    }
  | {
      kind: 'pricing';
      plans: {
        name: string;
        price: string;
        features: string[];
        cta: { label: string; href: string };
      }[];
      html?: string;
    }
  | {
      kind: 'testimonials';
      items: { quote: string; author: string; avatar?: AssetRef }[];
      html?: string;
    }
  | {
      kind: 'faq';
      items: { q: string; a: string }[];
      html?: string;
    }
  | {
      kind: 'gallery';
      items: AssetRef[];
      html?: string;
    }
  | {
      kind: 'contact';
      fields: ('name' | 'email' | 'message' | 'phone')[];
      action: string;
      html?: string;
    }
  | {
      kind: 'blog_index';
      items: { title: string; excerpt: string; href: string }[];
      html?: string;
    }
  | {
      kind: 'stats';
      items: { value: string; label: string }[];
      html?: string;
    }
  | {
      kind: 'steps';
      items: { title: string; desc: string; icon?: string }[];
      html?: string;
    }
  | {
      kind: 'logos';
      items: AssetRef[];
      html?: string;
    }
  | {
      kind: 'team';
      items: {
        name: string;
        role: string;
        bio?: string;
        avatar?: AssetRef;
      }[];
      html?: string;
    }
  | {
      kind: 'timeline';
      items: { date: string; title: string; desc: string }[];
      html?: string;
    }
  | {
      kind: 'footer';
      sections: { title: string; links: { label: string; href: string }[] }[];
      social?: { platform: string; href: string }[];
      html?: string;
    }
  | {
      kind: 'nav';
      logo?: AssetRef;
      items: { label: string; href: string }[];
      cta?: { label: string; href: string };
      html?: string;
    }
  | {
      kind: 'banner';
      text: string;
      cta?: { label: string; href: string };
      html?: string;
    }
  | {
      kind: 'announcement';
      text: string;
      cta?: { label: string; href: string };
      html?: string;
    }
  | {
      kind: 'cookie_consent';
      text: string;
      categories: ('analytics' | 'marketing')[];
      html?: string;
    }
  | {
      kind: 'legal';
      content: string;
      html?: string;
    }
  | {
      kind: 'custom';
      html: string;
    };

export type SEO = {
  title: string;
  description: string;
  og?: {
    title: string;
    description: string;
    image?: string;
  };
  twitter?: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    image?: string;
  };
  schema?: Record<string, unknown>[];
};

export type BrandTokens = {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    bg: string;
    fg: string;
    neutral: string[];
  };
  typography: {
    fontFamily: {
      heading: string;
      body: string;
    };
    fontSize: Record<string, string>;
    fontWeight: Record<string, number>;
    lineHeight: Record<string, string>;
  };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  motion: {
    duration: Record<string, string>;
    easing: Record<string, string>;
  };
};

export type SiteSettings = {
  analytics?: {
    provider: 'ga4' | 'plausible' | 'umami';
    trackingId: string;
  };
  seo?: {
    defaultTitle: string;
    defaultDescription: string;
    siteName: string;
  };
  i18n?: {
    defaultLang: string;
    supportedLangs: string[];
  };
  domains?: {
    primary: string;
    custom: string[];
  };
  forms?: {
    spamProtection: 'hcaptcha' | 'recaptcha' | 'none';
    siteKey?: string;
  };
  cookie?: {
    enabled: boolean;
    categories: ('analytics' | 'marketing')[];
  };
};

export type Company = {
  name: string;
  tagline?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  fileUrl?: string;
  images?: string[];
  status: 'draft' | 'active';
};

export type Ecommerce = {
  enabled: boolean;
  providers: ('stripe' | 'paypal')[];
  products: Product[];
  testMode: boolean;
};

export type Legal = {
  includeCopyright: boolean;
  includePrivacy: boolean;
  includeTerms: boolean;
  includeAIDisclaimer: boolean;
};

export type Integrations = {
  analytics?: { provider: 'ga4' | 'plausible' | 'umami'; trackingId: string };
  newsletter?: { provider: 'mailchimp' | 'beehiiv' | 'resend'; listId?: string; apiKey?: string };
  searchConsole?: boolean;
  github?: { repo?: string; branch?: string; token?: string };
  stripe?: { accountId?: string; testMode?: boolean };
  paypal?: { clientId?: string; testMode?: boolean };
};

export type SiteTheme = BrandTokens & {
  mode: 'match-logo' | 'manual';
  templateId: string;
};

export type Site = {
  id: string;
  orgId: string;
  handle: string;
  name: string;
  status: 'draft' | 'published';
  company: Company;
  theme: SiteTheme;
  settings: SiteSettings;
  ecommerce?: Ecommerce;
  legal: Legal;
  integrations: Integrations;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

export type Page = {
  id: string;
  orgId: string;
  siteId: string;
  path: string;
  title: string;
  seo: SEO;
  blocks: WebBlock[];
  status: 'draft' | 'published';
  version: number;
  lang: string;
  createdAt: string;
  updatedAt: string;
};

export type MediaAsset = {
  id: string;
  orgId: string;
  siteId: string;
  kind: 'image' | 'video' | 'audio' | 'svg' | 'icon';
  url: string;
  alt?: string;
  meta: {
    width?: number;
    height?: number;
    hash?: string;
    source?: string;
    consent?: boolean;
  };
  createdAt: string;
};

export type Deploy = {
  id: string;
  orgId: string;
  siteId: string;
  provider: 'vercel' | 'netlify' | 's3' | 'cloudflare' | 'static';
  url: string;
  commitSha?: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type FormSubmission = {
  id: string;
  orgId: string;
  siteId: string;
  pagePath: string;
  formId: string;
  payload: Record<string, unknown>;
  ip?: string;
  ua?: string;
  createdAt: string;
};

export type NavigationMenu = {
  id: string;
  orgId: string;
  siteId: string;
  name: string;
  items: {
    label: string;
    href: string;
    children?: { label: string; href: string }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

export type Redirect = {
  id: string;
  orgId: string;
  siteId: string;
  fromPath: string;
  toPath: string;
  code: number;
  createdAt: string;
};

export type BlogPost = {
  id: string;
  orgId: string;
  siteId: string;
  slug: string;
  title: string;
  excerpt?: string;
  body: string;
  seo: SEO;
  tags: string[];
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

export type CreditTransaction = {
  id: string;
  orgId: string;
  action: 'draft' | 'regenerate' | 'publish' | 'export' | 'translate';
  amount: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Brief = {
  businessName: string;
  industry: string;
  tagline?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  offerings: string[];
  differentiators: string[];
  targetAudience: string;
  tone: string;
  goals: string[];
  pages: string[];
  cta?: string;
  references?: string[];
  strictness: 'loose' | 'moderate' | 'strict';
  colorMode: 'match-logo' | 'manual';
  templateId?: string;
  includeEcommerce: boolean;
  paymentProviders: ('stripe' | 'paypal')[];
  includeNewsletter: boolean;
  newsletterProvider?: 'mailchimp' | 'beehiiv' | 'resend';
  analyticsId?: string;
};

export type DraftRequest = {
  siteId: string;
  page: {
    kind: 'home' | 'about' | 'services' | 'pricing' | 'faq' | 'contact' | 'custom';
    path: string;
    lang: string;
  };
  brief: Brief;
};

export type DraftResponse = {
  ok: boolean;
  pages: {
    [pageName: string]: {
      seo: SEO;
      blocks: WebBlock[];
      html: string;
    };
  };
  brandApplied?: boolean;
  theme?: BrandTokens;
};

export type CreditCost = {
  draft: 2;
  regenerate: 1;
  publish: 2;
  export: 2;
  translate: 2;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  category: 'business' | 'saas' | 'creative' | 'ecommerce' | 'content' | 'personal';
  thumbnail?: string;
  defaultPages: string[];
  defaultTheme: Partial<BrandTokens>;
  blocks: Record<string, WebBlock[]>;
};

export type SiteVersion = {
  id: string;
  siteId: string;
  orgId: string;
  version: number;
  changes: any;
  description?: string;
  createdBy: string;
  createdAt: string;
};

export type BuildMode = 'ai-built' | 'custom';

export type ColorPalette = {
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  fg: string;
  success: string;
  warning: string;
  error: string;
  neutral: string[];
};
