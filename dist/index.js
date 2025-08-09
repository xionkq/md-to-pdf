// src/core/parseMarkdown.ts
var cachedProcessor = null;
async function getProcessor() {
  if (cachedProcessor) return cachedProcessor;
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }] = await Promise.all([
    import("unified"),
    import("remark-parse"),
    import("remark-gfm")
  ]);
  cachedProcessor = unified().use(remarkParse).use(remarkGfm);
  return cachedProcessor;
}
async function parseMarkdown(markdown) {
  const processor = await getProcessor();
  const tree = processor.parse(markdown);
  return { tree };
}

// src/mapping/index.ts
function mapRemarkToPdfContent(tree) {
  const content = [];
  function textFromChildren(children) {
    let acc = "";
    for (const ch of children || []) {
      if (ch.type === "text") acc += ch.value ?? "";
      else if (ch.type === "inlineCode") acc += ch.value ?? "";
      else if (ch.children) acc += textFromChildren(ch.children);
    }
    return acc;
  }
  function visit(node) {
    switch (node.type) {
      case "root":
        (node.children || []).forEach(visit);
        break;
      case "heading": {
        const txt = textFromChildren(node.children || []);
        const level = Math.max(1, Math.min(6, node.depth || 1));
        content.push({ text: txt, style: `h${level}` });
        break;
      }
      case "paragraph": {
        const parts = inline(node.children || []);
        content.push({ text: parts, style: "paragraph" });
        break;
      }
      case "thematicBreak":
        content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
        break;
      case "list": {
        const items = (node.children || []).map((li) => ({ text: textFromChildren(li.children || []) }));
        if (node.ordered) content.push({ ol: items.map((i) => i.text) });
        else content.push({ ul: items.map((i) => i.text) });
        break;
      }
      case "blockquote": {
        const inner = [];
        (node.children || []).forEach((n) => {
          if (n.type === "paragraph") inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] });
          else visit(n);
        });
        content.push({ stack: inner, margin: [8, 4, 0, 8], style: "paragraph" });
        break;
      }
      default:
        break;
    }
  }
  function inline(nodes) {
    const parts = [];
    for (const n of nodes) {
      if (n.type === "text") parts.push(n.value ?? "");
      else if (n.type === "strong") parts.push({ text: textFromChildren(n.children || []), bold: true });
      else if (n.type === "emphasis") parts.push({ text: textFromChildren(n.children || []), italics: true });
      else if (n.type === "delete") parts.push({ text: textFromChildren(n.children || []), decoration: "lineThrough" });
      else if (n.type === "inlineCode") parts.push({ text: n.value ?? "", style: "code" });
      else if (n.type === "link") parts.push({ text: textFromChildren(n.children || []), link: n.url, style: "link" });
      else if (n.children) parts.push(textFromChildren(n.children));
    }
    return parts;
  }
  visit(tree);
  return content;
}

// src/styles.ts
function createDefaultStyles(theme = {}) {
  const base = theme.baseFontSize ?? 11;
  const headingSizes = theme.headingFontSizes ?? [24, 20, 16, 14, 12, 11];
  const linkColor = theme.linkColor ?? "#1a73e8";
  const codeFontSize = theme.code?.fontSize ?? base - 1;
  const codeBackground = theme.code?.background ?? "#f5f7fa";
  return {
    paragraph: { fontSize: base, lineHeight: 1.25, margin: [0, 4, 0, 8] },
    link: { color: linkColor, decoration: "underline" },
    code: { fontSize: codeFontSize, background: codeBackground, margin: [0, 4, 0, 8] },
    h1: { fontSize: headingSizes[0], bold: true, margin: [0, 0, 0, 12] },
    h2: { fontSize: headingSizes[1], bold: true, margin: [0, 10, 0, 10] },
    h3: { fontSize: headingSizes[2], bold: true, margin: [0, 10, 0, 8] },
    h4: { fontSize: headingSizes[3], bold: true, margin: [0, 8, 0, 6] },
    h5: { fontSize: headingSizes[4], bold: true, margin: [0, 6, 0, 4] },
    h6: { fontSize: headingSizes[5], bold: true, margin: [0, 4, 0, 4] }
  };
}

// src/pdf/builder.ts
function buildDocDefinition(content, options) {
  const styles = createDefaultStyles(options.theme);
  const doc = {
    pageSize: options.pageSize ?? "A4",
    pageMargins: options.pageMargins ?? [40, 60, 40, 60],
    pageOrientation: options.pageOrientation ?? "portrait",
    content,
    styles
  };
  if (options.header) doc.header = options.header;
  if (options.footer) doc.footer = options.footer;
  return doc;
}

// src/pdf/fonts.ts
function toBase64(input) {
  if (typeof input === "string") return input;
  const bytes = new Uint8Array(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}
function buildVfsForFont(resource) {
  const baseName = resource.name;
  const vfs = {};
  const normalKey = `${baseName}-Regular.ttf`;
  vfs[normalKey] = toBase64(resource.normal);
  if (resource.bold) vfs[`${baseName}-Bold.ttf`] = toBase64(resource.bold);
  if (resource.italics) vfs[`${baseName}-Italic.ttf`] = toBase64(resource.italics);
  if (resource.bolditalics) vfs[`${baseName}-BoldItalic.ttf`] = toBase64(resource.bolditalics);
  return vfs;
}
function buildFontsDefinition(resources) {
  const def = {};
  for (const r of resources) {
    def[r.name] = {
      normal: `${r.name}-Regular.ttf`,
      bold: r.bold ? `${r.name}-Bold.ttf` : `${r.name}-Regular.ttf`,
      italics: r.italics ? `${r.name}-Italic.ttf` : `${r.name}-Regular.ttf`,
      bolditalics: r.bolditalics ? `${r.name}-BoldItalic.ttf` : r.bold ? `${r.name}-Bold.ttf` : `${r.name}-Regular.ttf`
    };
  }
  return def;
}
function registerFonts(pdfMakeRuntime, options) {
  const fonts = options.fonts ?? [];
  if (!fonts.length) return null;
  const allVfs = {};
  for (const f of fonts) Object.assign(allVfs, buildVfsForFont(f));
  if (pdfMakeRuntime && typeof pdfMakeRuntime.addVirtualFileSystem === "function") {
    pdfMakeRuntime.addVirtualFileSystem(allVfs);
  } else if (pdfMakeRuntime) {
    try {
      if (!pdfMakeRuntime.vfs) pdfMakeRuntime.vfs = {};
      Object.assign(pdfMakeRuntime.vfs, allVfs);
    } catch {
    }
  }
  const fontsDef = buildFontsDefinition(fonts);
  try {
    pdfMakeRuntime.fonts = { ...pdfMakeRuntime.fonts || {}, ...fontsDef };
  } catch {
  }
  return { vfs: allVfs, fontsDef };
}

// src/utils/fontLoader.ts
async function fetchArrayBuffer(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Failed to fetch font: ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}
async function buildFontResourceFromUrls(name, urls, init) {
  const [normal, bold, italics, bolditalics] = await Promise.all([
    fetchArrayBuffer(urls.normal, init),
    urls.bold ? fetchArrayBuffer(urls.bold, init) : Promise.resolve(void 0),
    urls.italics ? fetchArrayBuffer(urls.italics, init) : Promise.resolve(void 0),
    urls.bolditalics ? fetchArrayBuffer(urls.bolditalics, init) : Promise.resolve(void 0)
  ]);
  return {
    name,
    normal,
    ...bold ? { bold } : {},
    ...italics ? { italics } : {},
    ...bolditalics ? { bolditalics } : {}
  };
}

// src/pdf/defaultCjk.ts
var DEFAULT_CJK_FONT_URL = "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf";
async function loadDefaultCjkFont(options = {}) {
  const name = options.name ?? "NotoSansSC";
  const normal = options.url ?? DEFAULT_CJK_FONT_URL;
  const urls = { normal };
  return buildFontResourceFromUrls(name, urls, options.requestInit);
}

// src/index.ts
function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
async function markdownToPdf(markdown, options = {}) {
  invariant(typeof window !== "undefined" && typeof document !== "undefined", "markdownToPdf: must run in browser environment");
  invariant(typeof markdown === "string", "markdownToPdf: markdown must be a string");
  options.onProgress?.("parse");
  const { tree } = await parseMarkdown(markdown);
  options.onProgress?.("layout");
  const pdfContent = mapRemarkToPdfContent(tree);
  const docDefinition = buildDocDefinition(pdfContent, options);
  options.onProgress?.("emit");
  const pdfMakeAny = options.pdfMakeInstance ?? await import("pdfmake/build/pdfmake.js");
  const pdfMakeResolved = pdfMakeAny.default ?? pdfMakeAny;
  globalThis.pdfMake = pdfMakeResolved;
  const vfsModule = await import("pdfmake/build/vfs_fonts.js");
  const vfs = vfsModule.vfs ?? vfsModule.default ?? vfsModule;
  if (pdfMakeResolved && typeof pdfMakeResolved.addVirtualFileSystem === "function") {
    try {
      pdfMakeResolved.addVirtualFileSystem(vfs);
    } catch {
    }
  } else if (!pdfMakeResolved.vfs) {
    try {
      pdfMakeResolved.vfs = vfs;
    } catch {
      try {
        Object.assign(pdfMakeResolved.vfs, vfs);
      } catch {
      }
    }
  }
  let registered = registerFonts(pdfMakeResolved, options);
  if (!registered) {
    const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(markdown);
    if (hasCjk) {
      try {
        const cjkFont = await loadDefaultCjkFont();
        registered = registerFonts(pdfMakeResolved, { ...options, fonts: [cjkFont], defaultFont: cjkFont.name });
        docDefinition.fonts = { ...docDefinition.fonts, ...registered?.fontsDef || {} };
        docDefinition.defaultStyle = { ...docDefinition.defaultStyle, font: cjkFont.name };
      } catch (e) {
      }
    }
  }
  if (registered) {
    docDefinition.fonts = { ...docDefinition.fonts, ...registered.fontsDef };
    if (options.defaultFont) {
      docDefinition.defaultStyle = { ...docDefinition.defaultStyle, font: options.defaultFont };
    }
  }
  return new Promise((resolve, reject) => {
    try {
      const runtime = pdfMakeResolved;
      const pdfDoc = runtime.createPdf(docDefinition);
      pdfDoc.getBuffer((buffer) => {
        const uint8 = new Uint8Array(buffer);
        const blob = new Blob([uint8], { type: "application/pdf" });
        resolve({ blob, uint8 });
      });
    } catch (err) {
      reject(err);
    }
  });
}
async function downloadPdf(markdown, fileName, options) {
  const { blob } = await markdownToPdf(markdown, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "document.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
var index_default = { markdownToPdf, downloadPdf };
export {
  index_default as default,
  downloadPdf,
  markdownToPdf
};
