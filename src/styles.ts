import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces';

export interface ThemeOptions {
  baseFontSize?: number;
  headingFontSizes?: number[]; // H1~H6
  linkColor?: string;
  code?: { font?: string; fontSize?: number; background?: string };
}

export function createDefaultStyles(theme: ThemeOptions = {}): StyleDictionary {
  const base = theme.baseFontSize ?? 11;
  const headingSizes = theme.headingFontSizes ?? [24, 20, 16, 14, 12, 11];
  const linkColor = theme.linkColor ?? '#1a73e8';
  const codeFontSize = theme.code?.fontSize ?? base - 1;
  const codeBackground = theme.code?.background ?? '#f5f7fa';

  return {
    paragraph: { fontSize: base, lineHeight: 1.25, margin: [0, 4, 0, 8] },
    link: { color: linkColor, decoration: 'underline' },
    code: { fontSize: codeFontSize, background: codeBackground, margin: [0, 4, 0, 8] },
    h1: { fontSize: headingSizes[0], bold: true, margin: [0, 0, 0, 12] },
    h2: { fontSize: headingSizes[1], bold: true, margin: [0, 10, 0, 10] },
    h3: { fontSize: headingSizes[2], bold: true, margin: [0, 10, 0, 8] },
    h4: { fontSize: headingSizes[3], bold: true, margin: [0, 8, 0, 6] },
    h5: { fontSize: headingSizes[4], bold: true, margin: [0, 6, 0, 4] },
    h6: { fontSize: headingSizes[5], bold: true, margin: [0, 4, 0, 4] }
  } as any;
}


