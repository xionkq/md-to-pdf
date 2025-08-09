import type { MarkdownToPdfOptions, FontResource } from '../index';

// 将 ArrayBuffer/base64 统一转为 base64 字符串，以便写入 pdfmake vfs
function toBase64(input: ArrayBuffer | string): string {
  if (typeof input === 'string') return input;
  const bytes = new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa handles binary string
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

// 将 FontResource 转为 pdfmake 需要的 vfs 映射（文件名 → base64）
function buildVfsForFont(resource: FontResource): Record<string, string> {
  const baseName = resource.name;
  const vfs: Record<string, string> = {};
  const normalKey = `${baseName}-Regular.ttf`;
  vfs[normalKey] = toBase64(resource.normal);
  if (resource.bold) vfs[`${baseName}-Bold.ttf`] = toBase64(resource.bold);
  if (resource.italics) vfs[`${baseName}-Italic.ttf`] = toBase64(resource.italics);
  if (resource.bolditalics) vfs[`${baseName}-BoldItalic.ttf`] = toBase64(resource.bolditalics);
  return vfs;
}

// 生成 pdfmake 的 fonts 定义（逻辑名 → 各字重文件名）
function buildFontsDefinition(resources: FontResource[]): Record<string, any> {
  const def: Record<string, any> = {};
  for (const r of resources) {
    def[r.name] = {
      normal: `${r.name}-Regular.ttf`,
      bold: r.bold ? `${r.name}-Bold.ttf` : `${r.name}-Regular.ttf`,
      italics: r.italics ? `${r.name}-Italic.ttf` : `${r.name}-Regular.ttf`,
      bolditalics: r.bolditalics ? `${r.name}-BoldItalic.ttf` : (r.bold ? `${r.name}-Bold.ttf` : `${r.name}-Regular.ttf`)
    };
  }
  return def;
}

export interface RegisteredFonts {
  vfs: Record<string, string>;
  fontsDef: Record<string, any>;
}

export function registerFonts(pdfMakeRuntime: any, options: MarkdownToPdfOptions): RegisteredFonts | null {
  // 若调用方未提供字体，则不进行注册
  const fonts = options.fonts ?? [];
  if (!fonts.length) return null;

  const allVfs: Record<string, string> = {};
  for (const f of fonts) Object.assign(allVfs, buildVfsForFont(f));

  if (pdfMakeRuntime && typeof pdfMakeRuntime.addVirtualFileSystem === 'function') {
    pdfMakeRuntime.addVirtualFileSystem(allVfs);
  } else if (pdfMakeRuntime) {
    try {
      if (!pdfMakeRuntime.vfs) pdfMakeRuntime.vfs = {};
      Object.assign(pdfMakeRuntime.vfs, allVfs);
    } catch {
      // ignore
    }
  }

  const fontsDef = buildFontsDefinition(fonts);
  try {
    pdfMakeRuntime.fonts = { ...(pdfMakeRuntime.fonts || {}), ...fontsDef };
  } catch {
    // ignore
  }
  return { vfs: allVfs, fontsDef };
}


