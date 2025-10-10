import { BrandTokens } from '../../types/website';

export function applyBrandTokensToCSS(tokens: BrandTokens): string {
  return `
:root {
  --color-primary: ${tokens.colors.primary};
  --color-secondary: ${tokens.colors.secondary};
  --color-accent: ${tokens.colors.accent};
  --color-success: ${tokens.colors.success};
  --color-warning: ${tokens.colors.warning};
  --color-error: ${tokens.colors.error};

  --font-heading: ${tokens.typography.fontFamily.heading};
  --font-body: ${tokens.typography.fontFamily.body};

  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --radius-xl: ${tokens.radius.xl};

  --duration-fast: ${tokens.motion.duration.fast};
  --duration-base: ${tokens.motion.duration.base};
  --duration-slow: ${tokens.motion.duration.slow};
}
`;
}

export function generateTailwindConfig(tokens: BrandTokens): string {
  return `
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '${tokens.colors.primary}',
        secondary: '${tokens.colors.secondary}',
        accent: '${tokens.colors.accent}',
        success: '${tokens.colors.success}',
        warning: '${tokens.colors.warning}',
        error: '${tokens.colors.error}',
      },
      fontFamily: {
        heading: [${tokens.typography.fontFamily.heading.split(',').map(f => `'${f.trim()}'`).join(', ')}],
        body: [${tokens.typography.fontFamily.body.split(',').map(f => `'${f.trim()}'`).join(', ')}],
      },
      fontSize: ${JSON.stringify(tokens.typography.fontSize, null, 8)},
      fontWeight: ${JSON.stringify(tokens.typography.fontWeight, null, 8)},
      lineHeight: ${JSON.stringify(tokens.typography.lineHeight, null, 8)},
      spacing: ${JSON.stringify(tokens.spacing, null, 8)},
      borderRadius: ${JSON.stringify(tokens.radius, null, 8)},
      transitionDuration: ${JSON.stringify(tokens.motion.duration, null, 8)},
      transitionTimingFunction: ${JSON.stringify(tokens.motion.easing, null, 8)},
    },
  },
};
`;
}

export function injectBrandTokens(tokens: BrandTokens) {
  const style = document.createElement('style');
  style.id = 'brand-tokens';
  style.textContent = applyBrandTokensToCSS(tokens);

  const existing = document.getElementById('brand-tokens');
  if (existing) {
    existing.remove();
  }

  document.head.appendChild(style);
}
