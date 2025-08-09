import type { Processor } from 'unified';
import { parseMarkdown } from './core/parseMarkdown';
import { mapRemarkToPdfContent } from './mapping';
import { buildDocDefinition } from './pdf/builder';
import { registerFonts } from './pdf/fonts';
import { loadDefaultCjkFont } from './pdf/defaultCjk';

export type PageSize = 'A4' | 'A3' | 'Letter' | { width: number; height: number };

export interface FontResource {
  name: string;
  normal: ArrayBuffer | string;
  bold?: ArrayBuffer | string;
  italics?: ArrayBuffer | string;
  bolditalics?: ArrayBuffer | string;
}

export interface MarkdownToPdfOptions {
  pageSize?: PageSize;
  pageMargins?: [number, number, number, number];
  pageOrientation?: 'portrait' | 'landscape';
  defaultFont?: string;
  fonts?: FontResource[];
  /** For testing or advanced usage: provide a custom pdfMake instance */
  pdfMakeInstance?: any;
  theme?: {
    baseFontSize?: number;
    headingFontSizes?: number[];
    code?: { font?: string; fontSize?: number; background?: string };
    linkColor?: string;
    table?: { headerFill?: string; borderColor?: string };
  };
  enableHtml?: boolean;
  header?: (currentPage: number, pageCount: number) => any;
  footer?: (currentPage: number, pageCount: number) => any;
  toc?: boolean;
  imageResolver?: (src: string) => Promise<string>;
  onProgress?: (phase: 'parse' | 'layout' | 'emit') => void;
  debug?: boolean;
  locale?: 'zh' | 'en' | string;
}

export interface MarkdownPdfResult {
  blob: Blob;
  uint8?: Uint8Array;
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export async function markdownToPdf(markdown: string, options: MarkdownToPdfOptions = {}): Promise<MarkdownPdfResult> {
  invariant(typeof window !== 'undefined' && typeof document !== 'undefined', 'markdownToPdf: must run in browser environment');
  invariant(typeof markdown === 'string', 'markdownToPdf: markdown must be a string');

  options.onProgress?.('parse');
  const { tree } = await parseMarkdown(markdown);
  console.log('tree', tree);
  options.onProgress?.('layout');

  const pdfContent = await mapRemarkToPdfContent(tree as any, { imageResolver: options.imageResolver });
  const docDefinition = buildDocDefinition(pdfContent, options);

  console.log('pdfContent', pdfContent);

  // Lazy import pdfmake (browser build) and create PDF
  options.onProgress?.('emit');
  const pdfMakeAny: any = options.pdfMakeInstance ?? (await import('pdfmake/build/pdfmake.js'));
  const pdfMakeResolved: any = (pdfMakeAny as any).default ?? pdfMakeAny;
  // Ensure global for side-effect vfs registration
  (globalThis as any).pdfMake = pdfMakeResolved;
  const vfsModule: any = await import('pdfmake/build/vfs_fonts.js');
  const vfs: any = (vfsModule as any).vfs ?? (vfsModule as any).default ?? vfsModule;
  if (pdfMakeResolved && typeof pdfMakeResolved.addVirtualFileSystem === 'function') {
    try { pdfMakeResolved.addVirtualFileSystem(vfs); } catch {}
  } else if (!pdfMakeResolved.vfs) {
    try { pdfMakeResolved.vfs = vfs; } catch { try { Object.assign(pdfMakeResolved.vfs, vfs); } catch {} }
  }

  // Register user provided fonts (e.g., Chinese fonts) before creating the document
  let registered = registerFonts(pdfMakeResolved, options);

  // If no fonts provided and text likely contains CJK, try to auto-load a default CJK font
  if (!registered) {
    const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(markdown);
    if (hasCjk) {
      try {
        const cjkFont = await loadDefaultCjkFont();
        registered = registerFonts(pdfMakeResolved, { ...options, fonts: [cjkFont], defaultFont: cjkFont.name });
        (docDefinition as any).fonts = { ...(docDefinition as any).fonts, ...(registered?.fontsDef || {}) };
        (docDefinition as any).defaultStyle = { ...(docDefinition as any).defaultStyle, font: cjkFont.name };
      } catch (e) {
        // fallback silently if network fails
      }
    }
  }
  if (registered) {
    (docDefinition as any).fonts = { ...(docDefinition as any).fonts, ...registered.fontsDef };
    if (options.defaultFont) {
      (docDefinition as any).defaultStyle = { ...(docDefinition as any).defaultStyle, font: options.defaultFont };
    }
  }

  return new Promise<MarkdownPdfResult>((resolve, reject) => {
    try {
      const runtime: any = pdfMakeResolved;
      const pdfDoc = runtime.createPdf(docDefinition);
      // Prefer getBuffer for broader compatibility in test/Node-like environments
      pdfDoc.getBuffer((buffer: ArrayBuffer) => {
        const uint8 = new Uint8Array(buffer as any);
        const blob = new Blob([uint8], { type: 'application/pdf' });
        resolve({ blob, uint8 });
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function downloadPdf(markdown: string, fileName: string, options?: MarkdownToPdfOptions): Promise<void> {
  const { blob } = await markdownToPdf(markdown, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default { markdownToPdf, downloadPdf };


