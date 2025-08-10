"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/utils/sanitize.ts
var sanitize_exports = {};
__export(sanitize_exports, {
  buildSanitizeSchema: () => buildSanitizeSchema
});
function buildSanitizeSchema(defaultSchema, opts = {}) {
  const schema = deepClone(defaultSchema || {});
  if (opts.allowedTags && opts.allowedTags.length) {
    const set = /* @__PURE__ */ new Set([...schema.tagNames || []]);
    for (const t of opts.allowedTags) set.add(t);
    schema.tagNames = Array.from(set);
  }
  if (opts.allowedAttributes) {
    schema.attributes = schema.attributes || {};
    for (const tag of Object.keys(opts.allowedAttributes)) {
      const current = schema.attributes[tag] || [];
      const set = new Set(current);
      for (const attr of opts.allowedAttributes[tag] || []) set.add(attr);
      schema.attributes[tag] = Array.from(set);
    }
  }
  enableStyleAttribute(schema);
  if (opts.allowedSchemes && opts.allowedSchemes.length) {
    const protoWrap = (name) => [{ type: "protocol", protocol: opts.allowedSchemes }, name];
    const aAttrs = schema.attributes && schema.attributes["a"] || [];
    if (!includesAttr(aAttrs, "href")) aAttrs.push("href");
    schema.attributes = schema.attributes || {};
    schema.attributes["a"] = uniqueAttrs(aAttrs);
    const imgAttrs = schema.attributes && schema.attributes["img"] || [];
    if (!includesAttr(imgAttrs, "src")) imgAttrs.push("src");
    schema.attributes["img"] = uniqueAttrs(imgAttrs);
  }
  return schema;
}
function enableStyleAttribute(schema) {
  schema.attributes = schema.attributes || {};
  const globalAttrs = schema.attributes["*"] || [];
  if (!includesAttr(globalAttrs, "style")) globalAttrs.push("style");
  schema.attributes["*"] = uniqueAttrs(globalAttrs);
}
function includesAttr(arr, name) {
  return (arr || []).some((x) => typeof x === "string" ? x === name : x && x[0] ? x[0] === name : false);
}
function uniqueAttrs(arr) {
  const flat = (arr || []).map((x) => typeof x === "string" ? x : x);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of flat) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
function deepClone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}
var init_sanitize = __esm({
  "src/utils/sanitize.ts"() {
    "use strict";
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  downloadPdf: () => downloadPdf,
  markdownToPdf: () => markdownToPdf
});
module.exports = __toCommonJS(index_exports);

// src/core/parseMarkdown.ts
var cachedMdProcessor = null;
var cachedHtmlProcessor = null;
async function getMdProcessor() {
  if (cachedMdProcessor) return cachedMdProcessor;
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }] = await Promise.all([
    import("unified"),
    import("remark-parse"),
    import("remark-gfm")
  ]);
  cachedMdProcessor = unified().use(remarkParse).use(remarkGfm);
  return cachedMdProcessor;
}
async function getHtmlProcessor(options = {}) {
  if (cachedHtmlProcessor) return cachedHtmlProcessor;
  const [
    { unified },
    { default: remarkParse },
    { default: remarkGfm },
    { default: remarkRehype },
    { default: rehypeRaw },
    rehypeSanitizeModule
  ] = await Promise.all([
    import("unified"),
    import("remark-parse"),
    import("remark-gfm"),
    import("remark-rehype"),
    import("rehype-raw"),
    import("rehype-sanitize")
  ]);
  const rehypeSanitize = rehypeSanitizeModule.default ?? rehypeSanitizeModule;
  const defaultSchema = rehypeSanitizeModule.defaultSchema ?? rehypeSanitizeModule.schema;
  const { buildSanitizeSchema: buildSanitizeSchema2 } = await Promise.resolve().then(() => (init_sanitize(), sanitize_exports));
  const schema = buildSanitizeSchema2(defaultSchema, {
    allowedTags: options.sanitize?.allowedTags,
    allowedAttributes: options.sanitize?.allowedAttributes,
    allowedStyles: options.sanitize?.allowedStyles,
    allowedSchemes: options.sanitize?.allowedSchemes
  });
  cachedHtmlProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw).use(rehypeSanitize, schema);
  return cachedHtmlProcessor;
}
async function parseMarkdown(markdown, htmlOptions = {}) {
  if (!htmlOptions.enableHtml) {
    const processor2 = await getMdProcessor();
    const tree2 = processor2.parse(markdown);
    return { tree: tree2, flavor: "mdast" };
  }
  const processor = await getHtmlProcessor(htmlOptions);
  const mdast = (await getMdProcessor()).parse(markdown);
  console.log("mdast", mdast);
  const tree = await processor.run(mdast);
  return { tree, flavor: "hast" };
}

// src/mapping/index.ts
async function mapRemarkToPdfContent(tree, ctx = {}) {
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
  async function visit(node) {
    switch (node.type) {
      case "root":
        for (const child of node.children || []) await visit(child);
        break;
      case "heading": {
        const txt = textFromChildren(node.children || []);
        const level = Math.max(1, Math.min(6, node.depth || 1));
        content.push({ text: txt, style: `h${level}` });
        break;
      }
      case "paragraph": {
        const children = node.children || [];
        const hasImage = !!children.find((c) => c.type === "image");
        if (hasImage && ctx.imageResolver) {
          let runs = [];
          const flush = () => {
            if (runs.length) {
              content.push({ text: runs, style: "paragraph" });
              runs = [];
            }
          };
          for (const ch of children) {
            if (ch.type === "image") {
              flush();
              try {
                const dataUrl = await ctx.imageResolver(ch.url);
                content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
              } catch {
                if (ch.alt) runs.push({ text: ch.alt, italics: true, color: "#666" });
              }
            } else {
              const segs = inline([ch]);
              runs.push(...segs);
            }
          }
          flush();
        } else {
          const parts = inline(children);
          content.push({ text: parts, style: "paragraph" });
        }
        break;
      }
      case "thematicBreak":
        content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
        break;
      case "list": {
        const listObj = await buildListObject(node);
        content.push(listObj);
        break;
      }
      case "blockquote": {
        const inner = [];
        for (const n of node.children || []) {
          if (n.type === "paragraph") inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] });
          else await visit(n);
        }
        content.push({ stack: inner, margin: [8, 4, 0, 8], style: "paragraph" });
        break;
      }
      case "code": {
        const value = node.value ?? "";
        content.push({ text: value, style: "code", preserveLeadingSpaces: true, margin: [0, 4, 0, 8] });
        break;
      }
      case "table": {
        const rows = [];
        const aligns = node.align || [];
        for (const row of node.children || []) {
          const cells = [];
          for (let c = 0; c < (row.children || []).length; c++) {
            const cell = row.children[c];
            const txt = textFromChildren(cell.children || []);
            const cellDef = { text: txt };
            const alignment = aligns[c] || null;
            if (alignment === "center" || alignment === "right") {
              cellDef.alignment = alignment;
            }
            cells.push(cellDef);
          }
          rows.push(cells);
        }
        if (rows.length > 0) rows[0] = rows[0].map((c) => ({ ...c, bold: true }));
        content.push({ table: { body: rows }, layout: "lightHorizontalLines", margin: [0, 4, 0, 8] });
        break;
      }
      case "image": {
        const src = node.url;
        if (ctx.imageResolver) {
          try {
            const dataUrl = await ctx.imageResolver(src);
            content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
          } catch {
            if (node.alt) content.push({ text: node.alt, italics: true, color: "#666" });
          }
        } else {
          if (node.alt) content.push({ text: node.alt, italics: true, color: "#666" });
        }
        break;
      }
      default:
        break;
    }
  }
  async function buildListObject(listNode) {
    const items = [];
    for (const li of listNode.children || []) {
      const blocks = [];
      let prefixed = false;
      for (const child of li.children || []) {
        if (child.type === "paragraph") {
          const runs = inline(child.children || []);
          if (typeof li.checked === "boolean" && !prefixed) {
            const box = li.checked ? "\u2611 " : "\u2610 ";
            if (typeof runs[0] === "string") runs[0] = box + runs[0];
            else runs.unshift(box);
            prefixed = true;
          }
          blocks.push({ text: runs, style: "paragraph", margin: [0, 2, 0, 2] });
        } else if (child.type === "list") {
          blocks.push(await buildListObject(child));
        } else if (child.type === "table") {
          blocks.push(buildTable(child));
        } else if (child.type === "code") {
          blocks.push({ text: child.value ?? "", style: "code", preserveLeadingSpaces: true, margin: [0, 4, 0, 8] });
        } else if (child.type === "blockquote") {
          const inner = [];
          for (const n of child.children || []) {
            if (n.type === "paragraph") inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] });
          }
          blocks.push({ stack: inner, margin: [8, 4, 0, 8], style: "paragraph" });
        } else if (child.type === "image") {
          if (ctx.imageResolver) {
            try {
              const dataUrl = await ctx.imageResolver(child.url);
              blocks.push({ image: dataUrl, margin: [0, 4, 0, 8] });
            } catch {
              if (child.alt) blocks.push({ text: child.alt, italics: true, color: "#666" });
            }
          } else if (child.alt) {
            blocks.push({ text: child.alt, italics: true, color: "#666" });
          }
        }
      }
      items.push(blocks.length === 1 ? blocks[0] : { stack: blocks });
    }
    return listNode.ordered ? { ol: items } : { ul: items };
  }
  function buildTable(node) {
    const rows = [];
    const aligns = node.align || [];
    for (const row of node.children || []) {
      const cells = [];
      for (let c = 0; c < (row.children || []).length; c++) {
        const cell = row.children[c];
        const txt = textFromChildren(cell.children || []);
        const cellDef = { text: txt };
        const alignment = aligns[c] || null;
        if (alignment === "center" || alignment === "right") {
          cellDef.alignment = alignment;
        }
        cells.push(cellDef);
      }
      rows.push(cells);
    }
    if (rows.length > 0) rows[0] = rows[0].map((c) => ({ ...c, bold: true }));
    return { table: { body: rows }, layout: "lightHorizontalLines", margin: [0, 4, 0, 8] };
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
  await visit(tree);
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

// src/mapping/hast.ts
async function mapHastToPdfContent(tree, ctx = {}) {
  const content = [];
  function textFromChildren(children) {
    let acc = "";
    for (const ch of children || []) {
      if (ch.type === "text") acc += ch.value ?? "";
      else if (ch.children) acc += textFromChildren(ch.children);
    }
    return acc;
  }
  function isInlineTag(tagName) {
    const t = (tagName || "").toLowerCase();
    return t === "a" || t === "strong" || t === "b" || t === "em" || t === "i" || t === "s" || t === "strike" || t === "del" || t === "u" || t === "code" || t === "span" || t === "br" || t === "img";
  }
  function inline(nodes) {
    const parts = [];
    for (const n of nodes || []) {
      if (n.type === "text") {
        parts.push(n.value ?? "");
      } else if (n.type === "element") {
        const tag = (n.tagName || "").toLowerCase();
        if (tag === "strong" || tag === "b") parts.push({ text: textFromChildren(n.children || []), bold: true });
        else if (tag === "em" || tag === "i") parts.push({ text: textFromChildren(n.children || []), italics: true });
        else if (tag === "s" || tag === "strike" || tag === "del") parts.push({ text: textFromChildren(n.children || []), decoration: "lineThrough" });
        else if (tag === "u") parts.push({ text: textFromChildren(n.children || []), decoration: "underline" });
        else if (tag === "code") parts.push({ text: textFromChildren(n.children || []), style: "code" });
        else if (tag === "a") parts.push({ text: textFromChildren(n.children || []), link: n.properties?.href, style: "link" });
        else if (tag === "br") parts.push("\n");
        else if (tag === "img") {
          const src = n.properties?.src;
          const alt = n.properties?.alt || "";
          parts.push({ text: alt });
        } else if (n.children) {
          const inner = textFromChildren(n.children || []);
          if (inner) parts.push(inner);
        }
      }
    }
    return parts;
  }
  function buildTableElement(node) {
    const rows = [];
    const sections = (node.children || []).filter((c) => c.type === "element" && (c.tagName === "thead" || c.tagName === "tbody"));
    const trNodes = sections.length ? sections.flatMap((s) => (s.children || []).filter((x) => x.type === "element" && x.tagName === "tr")) : (node.children || []).filter((x) => x.type === "element" && x.tagName === "tr");
    for (const tr of trNodes) {
      const cells = [];
      for (const cell of (tr.children || []).filter((c) => c.type === "element")) {
        const txt = textFromChildren(cell.children || []);
        const isTh = cell.tagName === "th";
        const cellDef = { text: txt };
        if (isTh) cellDef.bold = true;
        cells.push(cellDef);
      }
      if (cells.length) rows.push(cells);
    }
    return { table: { body: rows }, layout: "lightHorizontalLines", margin: [0, 4, 0, 8] };
  }
  async function visit(node) {
    if (node.type === "root") {
      for (const child of node.children || []) await visit(child);
      return;
    }
    if (node.type !== "element") return;
    const tag = (node.tagName || "").toLowerCase();
    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = Number(tag[1]);
        const txt = textFromChildren(node.children || []);
        content.push({ text: txt, style: `h${level}` });
        break;
      }
      case "p":
      case "div": {
        const children = node.children || [];
        const hasImage = !!children.find((c) => c.type === "element" && c.tagName?.toLowerCase() === "img");
        if (hasImage && ctx.imageResolver) {
          let runs = [];
          const flush = () => {
            if (runs.length) {
              content.push({ text: runs, style: "paragraph" });
              runs = [];
            }
          };
          for (const ch of children) {
            if (ch.type === "element" && ch.tagName?.toLowerCase() === "img") {
              flush();
              const src = ch.properties?.src;
              const alt = ch.properties?.alt || "";
              try {
                const dataUrl = await ctx.imageResolver(src);
                content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
              } catch {
                if (alt) runs.push({ text: alt, italics: true, color: "#666" });
              }
            } else {
              runs.push(...inline([ch]));
            }
          }
          flush();
        } else {
          content.push({ text: inline(children), style: "paragraph" });
        }
        break;
      }
      case "br":
        content.push({ text: ["\n"], style: "paragraph" });
        break;
      case "hr":
        content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
        break;
      case "blockquote": {
        const inner = [];
        for (const n of node.children || []) {
          if (n.type === "element" && (n.tagName === "p" || n.tagName === "div")) inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] });
          else if (n.type === "text") {
            const val = String(n.value ?? "");
            if (val.trim()) inner.push({ text: val, margin: [0, 2, 0, 2] });
          }
        }
        content.push({ stack: inner, margin: [8, 4, 0, 8], style: "paragraph" });
        break;
      }
      case "pre": {
        const txt = textFromChildren(node.children || []);
        content.push({ text: txt, style: "code", preserveLeadingSpaces: true, margin: [0, 4, 0, 8] });
        break;
      }
      case "code": {
        const isBlock = !node.children?.some((c) => c.type === "text" && (c.value || "").includes("\n")) ? false : true;
        const txt = textFromChildren(node.children || []);
        content.push({ text: txt, style: "code", preserveLeadingSpaces: isBlock, margin: [0, 4, 0, 8] });
        break;
      }
      case "ul":
      case "ol": {
        const items = [];
        for (const li of (node.children || []).filter((c) => c.type === "element" && c.tagName?.toLowerCase() === "li")) {
          const blocks = [];
          let runs = [];
          const flushRuns = () => {
            if (runs.length) {
              blocks.push({ text: runs, style: "paragraph", margin: [0, 2, 0, 2] });
              runs = [];
            }
          };
          const appendInlineSegments = (segs) => {
            for (const seg of segs || []) {
              if (typeof seg === "string") {
                if (seg === "\n") {
                  if (runs.length) runs.push(seg);
                } else {
                  const s = runs.length === 0 ? seg.replace(/^[\s\r\n]+/, "") : seg;
                  if (s) runs.push(s);
                }
              } else if (seg && typeof seg === "object") {
                runs.push(seg);
              }
            }
          };
          for (const child of li.children || []) {
            if (child.type === "text") {
              let val = String(child.value ?? "");
              if (runs.length === 0) val = val.replace(/^[\s\r\n]+/, "");
              if (val) runs.push(val);
              continue;
            }
            if (child.type === "element") {
              const tag2 = (child.tagName || "").toLowerCase();
              if (isInlineTag(tag2)) {
                appendInlineSegments(inline([child]));
                continue;
              }
              if (tag2 === "p" || tag2 === "div") {
                flushRuns();
                const segs = inline(child.children || []);
                if (segs.length && typeof segs[0] === "string") segs[0] = segs[0].replace(/^\n+/, "");
                blocks.push({ text: segs, style: "paragraph", margin: [0, 2, 0, 2] });
                continue;
              }
              flushRuns();
              if (tag2 === "ul" || tag2 === "ol") {
                const nested = await mapHastToPdfContent({ type: "root", children: [child] }, ctx);
                blocks.push(...nested);
              } else if (tag2 === "img") {
                const src = child.properties?.src;
                const alt = child.properties?.alt || "";
                if (ctx.imageResolver) {
                  try {
                    const dataUrl = await ctx.imageResolver(src);
                    blocks.push({ image: dataUrl, margin: [0, 4, 0, 8] });
                  } catch {
                    if (alt) blocks.push({ text: alt, italics: true, color: "#666" });
                  }
                } else if (alt) {
                  blocks.push({ text: alt, italics: true, color: "#666" });
                }
              } else if (tag2 === "blockquote") {
                const nested = await mapHastToPdfContent({ type: "root", children: [child] }, ctx);
                blocks.push({ stack: nested, margin: [8, 4, 0, 8], style: "paragraph" });
              } else if (tag2 === "table") {
                blocks.push(buildTableElement(child));
              } else if (tag2 === "pre" || tag2 === "code") {
                const txt = textFromChildren(child.children || []);
                blocks.push({ text: txt, style: "code", preserveLeadingSpaces: true, margin: [0, 4, 0, 8] });
              } else if (tag2 === "hr") {
                blocks.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
              }
            }
          }
          flushRuns();
          items.push(blocks.length === 1 ? blocks[0] : { stack: blocks });
        }
        content.push(tag === "ol" ? { ol: items } : { ul: items });
        break;
      }
      case "table": {
        content.push(buildTableElement(node));
        break;
      }
      case "img": {
        const src = node.properties?.src;
        const alt = node.properties?.alt || "";
        if (ctx.imageResolver) {
          try {
            const dataUrl = await ctx.imageResolver(src);
            content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
          } catch {
            if (alt) content.push({ text: alt, italics: true, color: "#666" });
          }
        } else if (alt) {
          content.push({ text: alt, italics: true, color: "#666" });
        }
        break;
      }
      default: {
        if (node.children && node.children.length) {
          const txt = textFromChildren(node.children);
          if (txt) content.push({ text: txt, style: "paragraph" });
        }
      }
    }
  }
  await visit(tree);
  return content;
}

// src/index.ts
function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
async function markdownToPdf(markdown, options = {}) {
  invariant(typeof window !== "undefined" && typeof document !== "undefined", "markdownToPdf: must run in browser environment");
  invariant(typeof markdown === "string", "markdownToPdf: markdown must be a string");
  options.onProgress?.("parse");
  const { tree, flavor } = await parseMarkdown(markdown, {
    enableHtml: options.enableHtml,
    sanitize: options.html
  });
  console.log("tree", tree);
  options.onProgress?.("layout");
  let pdfContent;
  if (flavor === "mdast") {
    pdfContent = await mapRemarkToPdfContent(tree, { imageResolver: options.imageResolver });
  } else {
    pdfContent = await mapHastToPdfContent(tree, { imageResolver: options.imageResolver });
  }
  const docDefinition = buildDocDefinition(pdfContent, options);
  console.log("pdfContent", pdfContent);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  downloadPdf,
  markdownToPdf
});
