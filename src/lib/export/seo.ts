import { Page } from '../../types/website';

interface SEOMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  canonical?: string;
  robots?: string;
}

export function generateSEOTags(metadata: SEOMetadata, path: string, siteUrl: string): string {
  const canonical = metadata.canonical || `${siteUrl}${path}`;
  const ogImage = metadata.ogImage || `${siteUrl}/og-image.png`;
  const robots = metadata.robots || 'index, follow';

  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${escapeHtml(metadata.description)}">
    ${metadata.keywords ? `<meta name="keywords" content="${metadata.keywords.join(', ')}">` : ''}
    <meta name="robots" content="${robots}">

    <link rel="canonical" href="${canonical}">

    <meta property="og:title" content="${escapeHtml(metadata.title)}">
    <meta property="og:description" content="${escapeHtml(metadata.description)}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:image" content="${ogImage}">
    <meta property="og:type" content="website">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(metadata.title)}">
    <meta name="twitter:description" content="${escapeHtml(metadata.description)}">
    <meta name="twitter:image" content="${ogImage}">

    <title>${escapeHtml(metadata.title)}</title>
  `.trim();
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function generateSitemap(pages: Page[], baseUrl: string): string {
  const urls = pages.map(
    (page) => `
  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${new Date(page.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

export function generateRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
}

export function generateJSONLD(page: Page, siteName: string): string {
  const schemas = page.seo.schema || [];

  if (schemas.length === 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.seo.description,
    });
  }

  return JSON.stringify(schemas, null, 2);
}
