export interface PaletteColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  contrastRatio: number;
}

export async function extractPaletteFromImage(file: File): Promise<PaletteColors> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (!imageData) {
        reject(new Error('Failed to extract image data'));
        return;
      }

      const colors = extractDominantColors(imageData);
      const palette = generatePalette(colors);
      resolve(palette);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function extractDominantColors(imageData: ImageData): string[] {
  const data = imageData.data;
  const colorCounts = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    const hex = rgbToHex(r, g, b);
    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
  }

  return Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color]) => color);
}

function generatePalette(colors: string[]): PaletteColors {
  const primary = colors[0] || '#2563eb';
  const secondary = colors[1] || '#7c3aed';
  const accent = colors[2] || '#f59e0b';
  const neutral = '#71717a';

  const contrastRatio = calculateContrastRatio(primary, '#ffffff');

  return {
    primary,
    secondary,
    accent,
    neutral,
    contrastRatio,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

function calculateContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}
