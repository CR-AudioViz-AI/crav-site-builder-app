import { Brief, Page, WebBlock, Template } from '../../types/website';

export function generateMultiplePages(brief: Brief, template?: Template): Partial<Page>[] {
  const pages: Partial<Page>[] = [];
  const selectedPages = brief.pages || ['home'];

  // Get navigation items based on selected pages
  const navItems = selectedPages.map((page) => ({
    label: page.charAt(0).toUpperCase() + page.slice(1),
    href: page === 'home' ? '/' : `/${page}`,
  }));

  const commonNav: WebBlock = {
    kind: 'nav',
    items: navItems,
    cta: brief.cta ? { label: brief.cta, href: '/contact' } : { label: 'Get Started', href: '/contact' },
  };

  const commonFooter: WebBlock = {
    kind: 'footer',
    sections: [
      {
        title: 'Company',
        links: navItems.filter((item) => item.href !== '/'),
      },
    ],
    social: [
      { platform: 'twitter', href: '#' },
      { platform: 'linkedin', href: '#' },
    ],
  };

  // Generate each selected page
  selectedPages.forEach((pageName) => {
    if (pageName === 'home') {
      pages.push(generateHomePage(brief, commonNav, commonFooter, template));
    } else if (pageName === 'about') {
      pages.push(generateAboutPage(brief, commonNav, commonFooter));
    } else if (pageName === 'services') {
      pages.push(generateServicesPage(brief, commonNav, commonFooter));
    } else if (pageName === 'pricing') {
      pages.push(generatePricingPage(brief, commonNav, commonFooter));
    } else if (pageName === 'contact') {
      pages.push(generateContactPage(brief, commonNav, commonFooter));
    } else if (pageName === 'blog') {
      pages.push(generateBlogPage(brief, commonNav, commonFooter));
    } else if (pageName === 'portfolio') {
      pages.push(generatePortfolioPage(brief, commonNav, commonFooter));
    } else if (pageName === 'faq') {
      pages.push(generateFAQPage(brief, commonNav, commonFooter));
    } else if (pageName === 'testimonials') {
      pages.push(generateTestimonialsPage(brief, commonNav, commonFooter));
    } else if (pageName === 'store') {
      pages.push(generateStorePage(brief, commonNav, commonFooter));
    } else {
      // Generic page for custom pages
      pages.push(generateGenericPage(pageName, brief, commonNav, commonFooter));
    }
  });

  return pages;
}

function generateHomePage(brief: Brief, nav: WebBlock, footer: WebBlock, template?: Template): Partial<Page> {
  const blocks: WebBlock[] = [
    nav,
    {
      kind: 'hero',
      headline: brief.tagline || `Welcome to ${brief.businessName}`,
      subhead: brief.targetAudience
        ? `Serving ${brief.targetAudience} with ${brief.tone || 'professional'} excellence`
        : brief.description || `Experience the best in ${brief.industry}`,
      cta: { label: brief.cta || 'Learn More', href: '#services' },
    },
  ];

  if (brief.offerings && brief.offerings.length > 0) {
    blocks.push({
      kind: 'services',
      items: brief.offerings.map((offering) => ({
        title: offering,
        desc: `High-quality ${offering.toLowerCase()} tailored to your needs`,
        price: brief.includeEcommerce ? 'View Pricing' : 'Contact for pricing',
      })),
    });
  }

  if (brief.differentiators && brief.differentiators.length > 0) {
    blocks.push({
      kind: 'features',
      items: brief.differentiators.map((diff) => ({
        title: diff,
        desc: `We stand out with our ${diff.toLowerCase()}`,
        icon: 'star',
      })),
    });
  }

  blocks.push(footer);

  return {
    path: '/',
    title: `${brief.businessName} - ${brief.industry}`,
    seo: {
      title: brief.tagline ? `${brief.businessName} - ${brief.tagline}` : `${brief.businessName} - ${brief.industry}`,
      description: brief.description || `${brief.businessName} provides ${brief.offerings?.join(', ') || 'quality services'} to ${brief.targetAudience || 'our customers'}.`,
    },
    blocks,
    status: 'draft',
    lang: 'en',
  };
}

function generateAboutPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/about',
    title: `About ${brief.businessName}`,
    seo: {
      title: `About ${brief.businessName}`,
      description: `Learn more about ${brief.businessName} and our mission in the ${brief.industry} industry.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: `About ${brief.businessName}`,
        subhead: brief.description || `Your trusted partner in ${brief.industry}`,
      },
      ...(brief.goals && brief.goals.length > 0
        ? [{
            kind: 'features' as const,
            items: brief.goals.map((goal) => ({
              title: goal,
              desc: `We're committed to ${goal.toLowerCase()}`,
              icon: 'target',
            })),
          }]
        : []),
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateServicesPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/services',
    title: `${brief.businessName} Services`,
    seo: {
      title: `Our Services - ${brief.businessName}`,
      description: `Explore the full range of services offered by ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Our Services',
        subhead: `Comprehensive ${brief.industry} solutions for ${brief.targetAudience || 'your needs'}`,
      },
      {
        kind: 'services',
        items: (brief.offerings || ['Service 1', 'Service 2', 'Service 3']).map((offering) => ({
          title: offering,
          desc: `Professional ${offering.toLowerCase()} services delivered with excellence`,
          price: 'Contact for pricing',
        })),
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generatePricingPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/pricing',
    title: `Pricing - ${brief.businessName}`,
    seo: {
      title: `Pricing Plans - ${brief.businessName}`,
      description: `View pricing for ${brief.businessName} services and products.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Simple, Transparent Pricing',
        subhead: 'Choose the plan that works best for you',
      },
      {
        kind: 'pricing',
        plans: [
          {
            name: 'Starter',
            price: '$99/mo',
            features: ['Feature 1', 'Feature 2', 'Feature 3'],
            cta: { label: 'Get Started', href: '/contact' },
          },
          {
            name: 'Professional',
            price: '$199/mo',
            features: ['All Starter features', 'Feature 4', 'Feature 5', 'Priority support'],
            cta: { label: 'Get Started', href: '/contact' },
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            features: ['All Professional features', 'Custom integration', 'Dedicated support'],
            cta: { label: 'Contact Us', href: '/contact' },
          },
        ],
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateContactPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  const fields: Array<'name' | 'email' | 'message' | 'phone'> = ['name', 'email'];
  if (brief.phone) fields.push('phone');
  fields.push('message');

  return {
    path: '/contact',
    title: `Contact ${brief.businessName}`,
    seo: {
      title: `Contact Us - ${brief.businessName}`,
      description: `Get in touch with ${brief.businessName}. ${brief.email ? `Email: ${brief.email}` : ''} ${brief.phone ? `Phone: ${brief.phone}` : ''}`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Get In Touch',
        subhead: "We'd love to hear from you",
      },
      {
        kind: 'contact',
        fields,
        action: '/api/contact',
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateBlogPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/blog',
    title: `Blog - ${brief.businessName}`,
    seo: {
      title: `Blog - ${brief.businessName}`,
      description: `Read the latest articles and insights from ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Blog & Insights',
        subhead: `Stay updated with the latest from ${brief.businessName}`,
      },
      {
        kind: 'blog_index',
        items: [
          { title: 'Getting Started with ' + brief.industry, excerpt: 'Learn the basics...', href: '/blog/getting-started' },
          { title: 'Best Practices in ' + brief.industry, excerpt: 'Discover industry standards...', href: '/blog/best-practices' },
          { title: 'Case Study: Success Story', excerpt: 'How we helped a client...', href: '/blog/case-study' },
        ],
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generatePortfolioPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/portfolio',
    title: `Portfolio - ${brief.businessName}`,
    seo: {
      title: `Portfolio - ${brief.businessName}`,
      description: `View our work and projects at ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Our Work',
        subhead: 'Showcasing our best projects',
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateFAQPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/faq',
    title: `FAQ - ${brief.businessName}`,
    seo: {
      title: `Frequently Asked Questions - ${brief.businessName}`,
      description: `Find answers to common questions about ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Frequently Asked Questions',
        subhead: 'Find answers to common questions',
      },
      {
        kind: 'faq',
        items: [
          { q: 'What services do you offer?', a: brief.offerings?.join(', ') || 'We offer a range of professional services.' },
          { q: 'How do I get started?', a: 'Simply contact us using the form on our contact page.' },
          { q: 'What makes you different?', a: brief.differentiators?.join(', ') || 'We provide exceptional quality and service.' },
        ],
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateTestimonialsPage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/testimonials',
    title: `Testimonials - ${brief.businessName}`,
    seo: {
      title: `Client Testimonials - ${brief.businessName}`,
      description: `Read what our clients say about ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'What Our Clients Say',
        subhead: 'Real feedback from real customers',
      },
      {
        kind: 'testimonials',
        items: [
          { quote: 'Outstanding service and results!', author: 'John Smith, CEO' },
          { quote: 'Highly recommend their expertise.', author: 'Jane Doe, Manager' },
          { quote: 'Professional and reliable.', author: 'Bob Johnson, Director' },
        ],
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateStorePage(brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  return {
    path: '/store',
    title: `Store - ${brief.businessName}`,
    seo: {
      title: `Shop - ${brief.businessName}`,
      description: `Browse and purchase products from ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: 'Our Products',
        subhead: 'Premium digital products for your needs',
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}

function generateGenericPage(pageName: string, brief: Brief, nav: WebBlock, footer: WebBlock): Partial<Page> {
  const title = pageName.charAt(0).toUpperCase() + pageName.slice(1);
  return {
    path: `/${pageName}`,
    title: `${title} - ${brief.businessName}`,
    seo: {
      title: `${title} - ${brief.businessName}`,
      description: `${title} page for ${brief.businessName}.`,
    },
    blocks: [
      nav,
      {
        kind: 'hero',
        headline: title,
        subhead: `Learn more about our ${pageName}`,
      },
      footer,
    ],
    status: 'draft',
    lang: 'en',
  };
}
