import { buildFontResourceFromUrls, type FontUrlSet } from '../utils/fontLoader';
import type { FontResource } from '../index';

export interface DefaultCjkOptions {
  name?: string;
  url?: string; // normal weight url
  requestInit?: RequestInit;
}

// Default URL for CJK font (Regular). Override via options if needed.
// NOTE: You should provide a stable, CORS-enabled TTF/OTF URL in production.
export const DEFAULT_CJK_FONT_URL = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf';

export async function loadDefaultCjkFont(options: DefaultCjkOptions = {}): Promise<FontResource> {
  const name = options.name ?? 'NotoSansSC';
  const normal = options.url ?? DEFAULT_CJK_FONT_URL;
  const urls: FontUrlSet = { normal };
  return buildFontResourceFromUrls(name, urls, options.requestInit);
}


