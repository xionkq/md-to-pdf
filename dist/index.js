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
async function getHtmlProcessor() {
  if (cachedHtmlProcessor) return cachedHtmlProcessor;
  const [
    { unified },
    { default: remarkParse },
    { default: remarkGfm },
    { default: remarkRehype },
    { default: rehypeRaw }
  ] = await Promise.all([
    import("unified"),
    import("remark-parse"),
    import("remark-gfm"),
    import("remark-rehype"),
    import("rehype-raw")
  ]);
  cachedHtmlProcessor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
  return cachedHtmlProcessor;
}
async function parseMarkdown(markdown, enableHtml) {
  const mdast = (await getMdProcessor()).parse(markdown);
  if (!enableHtml) {
    return { tree: mdast, flavor: "mdast" };
  }
  const processor = await getHtmlProcessor();
  const hast = await processor.run(mdast);
  return { tree: hast, flavor: "hast" };
}

// src/styles/github-borders.ts
function createH1Border(pageWidth = 515) {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: pageWidth,
        y2: 0,
        lineWidth: 1,
        lineColor: "#d1d9e0"
      }
    ],
    margin: [0, 0, 0, 16]
    // 底部间距
  };
}
function createH2Border(pageWidth = 515) {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: pageWidth,
        y2: 0,
        lineWidth: 1,
        lineColor: "#d1d9e0"
      }
    ],
    margin: [0, 0, 0, 16]
    // 底部间距
  };
}
function createHrBorder(pageWidth = 515) {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: pageWidth,
        y2: 0,
        lineWidth: 3.5,
        lineColor: "#d1d9e0"
      }
    ],
    margin: [0, 0, 0, 24]
    // 底部间距
  };
}
function createBlockquoteBorder(height = 20) {
  return {
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: 0,
        y2: height,
        lineWidth: 4,
        lineColor: "#d0d7de"
      }
    ],
    margin: [0, 0, 8, 0],
    // 右侧间距
    width: 4
  };
}
function createTableLayout() {
  return {
    hLineWidth: function(i, node) {
      return 1;
    },
    vLineWidth: function(i, node) {
      return 1;
    },
    hLineColor: function(i, node) {
      return "#d1d9e0";
    },
    vLineColor: function(i, node) {
      return "#d1d9e0";
    },
    paddingLeft: function(i, node) {
      return 13;
    },
    paddingRight: function(i, node) {
      return 13;
    },
    paddingTop: function(i, node) {
      return 6;
    },
    paddingBottom: function(i, node) {
      return 6;
    },
    fillColor: function(i) {
      if (i === 0) return null;
      return i % 2 === 0 ? "#f6f8fa" : null;
    }
  };
}
function createCodeBlockStyle(content) {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: content,
            border: [false, false, false, false]
            // 禁用表格边框
          }
        ]
      ]
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 16,
      paddingRight: () => 16,
      paddingTop: () => 16,
      paddingBottom: () => 16,
      fillColor: "#f0f1f2"
    },
    style: "codeBlock"
  };
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
        if (level === 1) {
          content.push(createH1Border());
        } else if (level === 2) {
          content.push(createH2Border());
        }
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
          if (n.type === "paragraph")
            inner.push({ text: inline(n.children || []), style: "blockquote", margin: [0, 2, 0, 2] });
          else await visit(n);
        }
        content.push({
          columns: [
            createBlockquoteBorder(inner.length * 16),
            // 根据内容高度调整边框
            { stack: inner, width: "*" }
          ],
          columnGap: 0,
          margin: [0, 8, 0, 16]
        });
        break;
      }
      case "code": {
        const value = node.value ?? "";
        content.push(createCodeBlockStyle(value));
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
            const cellDef = { text: txt, style: "tableCell" };
            const alignment = aligns[c] || null;
            if (alignment === "center" || alignment === "right") {
              cellDef.alignment = alignment;
            }
            cells.push(cellDef);
          }
          rows.push(cells);
        }
        if (rows.length > 0) {
          rows[0] = rows[0].map((c) => ({
            ...c,
            style: "tableHeader",
            fillColor: "#f6f8fa"
          }));
        }
        content.push({
          table: { body: rows },
          layout: createTableLayout(),
          margin: [0, 8, 0, 16]
        });
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
          blocks.push(createCodeBlockStyle(child.value ?? ""));
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
        const cellDef = { text: txt, style: "tableCell" };
        const alignment = aligns[c] || null;
        if (alignment === "center" || alignment === "right") {
          cellDef.alignment = alignment;
        }
        cells.push(cellDef);
      }
      rows.push(cells);
    }
    if (rows.length > 0) {
      rows[0] = rows[0].map((c) => ({
        ...c,
        style: "tableHeader",
        fillColor: "#f6f8fa"
      }));
    }
    return {
      table: { body: rows },
      layout: createTableLayout(),
      margin: [0, 8, 0, 16]
    };
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
function createDefaultStyles() {
  return {
    // 一二级标题下边距为到下横线的距离，16px 的边距在下横线上
    h1: { fontSize: 28, bold: true, marginBottom: 8.4 },
    h2: { fontSize: 21, bold: true, marginBottom: 6.3 },
    h3: { fontSize: 17.5, bold: true, marginBottom: 16 },
    h4: { fontSize: 14, bold: true, marginBottom: 16 },
    h5: { fontSize: 12.25, bold: true, marginBottom: 16 },
    h6: { fontSize: 11.9, color: "#59636e", bold: true, marginBottom: 16 },
    p: { fontSize: 14, margin: [0, 0, 0, 16] },
    // 引用块样式：GitHub blockquote
    blockquote: { fontSize: 14, color: "#59636e", marginBottom: 16 },
    a: { color: "#0969da", decoration: "underline" },
    ul: { marginBottom: 16, marginLeft: 12 },
    ol: { marginBottom: 16, marginLeft: 12 },
    del: { decoration: "lineThrough" },
    b: { bold: true },
    table: { marginBottom: 16 },
    th: { bold: true },
    // 行内代码
    code: { background: "#f0f1f2" },
    // 代码块
    codeBlock: { fontSize: 11.9, margin: [0, 0, 0, 16] },
    // TODO: 待支持
    u: { decoration: "underline" },
    em: { italics: true },
    i: { italics: true }
  };
}
function createLayout() {
  return {
    // 使用表格布局模拟 blockquote
    blockquoteLayout: {
      hLineWidth: function() {
        return 0;
      },
      vLineWidth: function(i) {
        return i === 0 ? 3 : 0;
      },
      vLineColor: function() {
        return "#d1d9e0";
      },
      paddingLeft: function() {
        return 14;
      },
      paddingRight: function() {
        return 14;
      }
    },
    // createLayout
    tableLayout: {
      hLineWidth: function(i, node) {
        return 1;
      },
      vLineWidth: function(i, node) {
        return 1;
      },
      hLineColor: function(i, node) {
        return "#d1d9e0";
      },
      vLineColor: function(i, node) {
        return "#d1d9e0";
      },
      paddingLeft: function(i, node) {
        return 13;
      },
      paddingRight: function(i, node) {
        return 13;
      },
      paddingTop: function(i, node) {
        return 6;
      },
      paddingBottom: function(i, node) {
        return 6;
      },
      fillColor: function(i) {
        if (i === 0) return null;
        return i % 2 === 0 ? "#f6f8fa" : null;
      }
    }
  };
}

// src/pdf/builder.ts
function buildDocDefinition(content, options) {
  const styles = createDefaultStyles();
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
function registerFonts(pdfMakeRuntime, fonts) {
  if (!fonts || !fonts.length) return null;
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
var DEFAULT_CJK_BOLD_FONT_URL = "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf";
async function loadDefaultCjkFont(options = {}) {
  const name = options.name ?? "NotoSansSC";
  const normal = options.url ?? DEFAULT_CJK_FONT_URL;
  const bold = options.boldUrl ?? DEFAULT_CJK_BOLD_FONT_URL;
  const urls = { normal, bold, italics: normal, bolditalics: bold };
  return buildFontResourceFromUrls(name, urls, options.requestInit);
}

// src/mapping/hast.ts
async function defaultImageResolver(src) {
  const urlToBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  if (src.startsWith("data:")) {
    return src;
  }
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return await urlToBase64(src);
  }
  return src;
}
function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Z])([A-Z][a-z])/g, "$1-$2").toLowerCase();
}
var svgAttrMap = {
  // SVG 坐标 & 视图
  viewBox: "viewBox",
  preserveAspectRatio: "preserveAspectRatio",
  // 渐变 <linearGradient> / <radialGradient>
  gradientTransform: "gradientTransform",
  gradientUnits: "gradientUnits",
  spreadMethod: "spreadMethod",
  // <pattern>
  patternTransform: "patternTransform",
  patternUnits: "patternUnits",
  // <clipPath> / <mask>
  clipPathUnits: "clipPathUnits",
  maskContentUnits: "maskContentUnits",
  maskUnits: "maskUnits",
  // marker 相关
  markerHeight: "markerHeight",
  markerWidth: "markerWidth",
  markerUnits: "markerUnits",
  // filter 相关
  filterUnits: "filterUnits",
  primitiveUnits: "primitiveUnits",
  kernelMatrix: "kernelMatrix",
  // feConvolveMatrix
  kernelUnitLength: "kernelUnitLength",
  baseFrequency: "baseFrequency",
  // feTurbulence
  numOctaves: "numOctaves",
  stitchTiles: "stitchTiles",
  surfaceScale: "surfaceScale",
  specularConstant: "specularConstant",
  specularExponent: "specularExponent",
  diffuseConstant: "diffuseConstant",
  // feComposite
  in2: "in2",
  // <fePointLight>, <feSpotLight>
  xChannelSelector: "xChannelSelector",
  yChannelSelector: "yChannelSelector",
  zChannelSelector: "zChannelSelector",
  limitingConeAngle: "limitingConeAngle",
  // xlink 属性 (旧标准，仍需支持)
  xlinkHref: "xlink:href"
};
function svgObjectToString(node) {
  const children = node.children.reduce((acc, n) => {
    const a = svgObjectToString(n);
    console.log("a", a);
    return acc + a;
  }, "");
  const propString = Object.keys(node.properties).reduce((acc, key) => {
    const hasMap = Object.keys(svgAttrMap).includes(key);
    return acc + ` ${hasMap ? svgAttrMap[key] : camelToKebab(key)}="${node.properties[key]}"`;
  }, "");
  return `<${node.tagName}${propString}>${children}</${node.tagName}>`;
}
async function mapHastToPdfContent(tree, ctx = {}) {
  const content = [];
  const imageResolver = ctx.imageResolver || defaultImageResolver;
  function textFromChildren(children) {
    let acc = "";
    for (const ch of children || []) {
      if (ch.type === "text") acc += ch.value ?? "";
      else if (ch.type === "element" && ch.tagName?.toLowerCase() === "br") acc += "\n";
      else if (ch.children) acc += textFromChildren(ch.children);
    }
    return acc;
  }
  function isInlineTag(tagName) {
    const t = (tagName || "").toLowerCase();
    return t === "a" || t === "strong" || t === "b" || t === "em" || t === "i" || t === "s" || t === "strike" || t === "del" || t === "u" || t === "span" || t === "br" || t === "img" || t === "svg";
  }
  function isInlineCodeTag(node) {
    if (!node || node.tagName?.toLowerCase() !== "code") return false;
    const hasNewline = (node.children || []).some(
      (c) => c.type === "text" && (c.value || "").includes("\n")
    );
    return !hasNewline;
  }
  function mergeStyles(base, add) {
    return {
      bold: base.bold || add.bold,
      italic: base.italic || add.italic,
      underline: base.underline || add.underline,
      strike: base.strike || add.strike,
      code: base.code || add.code,
      link: add.link || base.link,
      // 新的链接覆盖旧的
      style: [...base.style || [], ...add.style || []]
    };
  }
  function styleToObject(style, text) {
    const result = { text };
    if (style.bold) result.style = result.style ? [result.style, "b"].flat() : "b";
    if (style.italic) result.italics = true;
    if (style.underline) result.style = result.style ? [result.style, "u"].flat() : "u";
    if (style.strike) result.style = result.style ? [result.style, "del"].flat() : "del";
    if (style.code) result.style = result.style ? [result.style, "code"].flat() : "code";
    if (style.link) {
      result.link = style.link;
      result.style = result.style ? [result.style, "a"].flat() : "a";
    }
    if (style.style && style.style.length > 0) {
      result.style = result.style ? [result.style, ...style.style].flat() : style.style;
    }
    return result;
  }
  function inline(nodes, baseStyle = {}) {
    const parts = [];
    for (const n of nodes || []) {
      if (n.type === "text") {
        const textValue = n.value ?? "";
        if (textValue) {
          if (Object.keys(baseStyle).length > 0) {
            parts.push(styleToObject(baseStyle, textValue));
          } else {
            parts.push(textValue);
          }
        }
      } else if (n.type === "element") {
        const tag = (n.tagName || "").toLowerCase();
        let currentStyle = { ...baseStyle };
        switch (tag) {
          case "strong":
          case "b":
            currentStyle = mergeStyles(currentStyle, { bold: true });
            break;
          case "em":
          case "i":
            currentStyle = mergeStyles(currentStyle, { italic: true });
            break;
          case "s":
          case "strike":
          case "del":
            currentStyle = mergeStyles(currentStyle, { strike: true });
            break;
          case "u":
            currentStyle = mergeStyles(currentStyle, { underline: true });
            break;
          case "code":
            currentStyle = mergeStyles(currentStyle, { code: true });
            break;
          case "a":
            currentStyle = mergeStyles(currentStyle, { link: n.properties?.href });
            break;
          case "br":
            parts.push("\n");
            continue;
          case "img":
            const alt = n.properties?.alt || "";
            const altText = alt || "[\u56FE\u7247]";
            if (Object.keys(baseStyle).length > 0) {
              parts.push(styleToObject(baseStyle, altText));
            } else {
              parts.push(altText);
            }
            continue;
          case "svg":
            parts.push({ svg: svgObjectToString(n) });
            continue;
        }
        if (n.children && n.children.length > 0) {
          const nestedParts = inline(n.children, currentStyle);
          parts.push(...nestedParts);
        } else if (tag === "br") {
        } else if (tag === "img" || tag === "svg") {
        } else {
          const textContent = textFromChildren([n]);
          if (textContent) {
            if (Object.keys(baseStyle).length > 0) {
              parts.push(styleToObject(baseStyle, textContent));
            } else {
              parts.push(textContent);
            }
          }
        }
      }
    }
    return parts;
  }
  function buildTableElement(node) {
    console.log("buildTableElement node", node);
    const rows = [];
    const sections = (node.children || []).filter(
      (c) => c.type === "element" && (c.tagName === "thead" || c.tagName === "tbody")
    );
    const trNodes = sections.length ? sections.flatMap((s) => (s.children || []).filter((x) => x.type === "element" && x.tagName === "tr")) : (node.children || []).filter((x) => x.type === "element" && x.tagName === "tr");
    for (const tr of trNodes) {
      const cells = [];
      for (const cell of (tr.children || []).filter((c) => c.type === "element")) {
        const isTh = cell.tagName === "th";
        let cellContent;
        const hasBlockElements = (cell.children || []).some(
          (c) => c.type === "element" && ["ul", "ol", "p", "div", "blockquote", "pre"].includes(c.tagName?.toLowerCase())
        );
        if (hasBlockElements) {
          const parts = [];
          for (const child of cell.children || []) {
            if (child.type === "element") {
              const tag = child.tagName?.toLowerCase();
              if (tag === "ul" || tag === "ol") {
                const listItems = (child.children || []).filter((li) => li.type === "element" && li.tagName?.toLowerCase() === "li").map((li) => {
                  const itemContent = inline(li.children || []);
                  const itemText = itemContent.length > 0 ? itemContent : "[\u7A7A]";
                  return "\u2022 " + (Array.isArray(itemText) ? itemText.map((p) => typeof p === "string" ? p : p.text || "").join("") : itemText);
                }).join("\n");
                if (listItems) parts.push(listItems);
              } else if (tag === "p" || tag === "div") {
                const inlineContent = inline(child.children || []);
                if (inlineContent.length > 0) {
                  const hasFormat = inlineContent.some((item) => typeof item !== "string");
                  if (hasFormat) {
                    parts.push(inlineContent);
                  } else {
                    const text = inlineContent.join("").trim();
                    if (text) parts.push(text);
                  }
                }
              } else {
                const inlineContent = inline([child]);
                if (inlineContent.length > 0) {
                  const hasFormat = inlineContent.some((item) => typeof item !== "string");
                  if (hasFormat) {
                    parts.push(inlineContent);
                  } else {
                    const text = inlineContent.join("").trim();
                    if (text) parts.push(text);
                  }
                }
              }
            } else if (child.type === "text") {
              const txt = String(child.value || "").trim();
              if (txt) parts.push(txt);
            }
          }
          if (parts.length === 0) {
            cellContent = { text: "" };
          } else if (parts.length === 1 && typeof parts[0] === "string") {
            cellContent = { text: parts[0] };
          } else {
            const flatParts = [];
            for (let i = 0; i < parts.length; i++) {
              if (i > 0) flatParts.push("\n");
              if (Array.isArray(parts[i])) {
                flatParts.push(...parts[i]);
              } else {
                flatParts.push(parts[i]);
              }
            }
            cellContent = { text: flatParts };
          }
        } else {
          const inlineContent = inline(cell.children || []);
          const cleanedContent = inlineContent.filter((item) => {
            if (typeof item === "string") {
              return item.trim().length > 0;
            }
            return true;
          });
          while (cleanedContent.length > 0 && typeof cleanedContent[0] === "string" && !cleanedContent[0].trim()) {
            cleanedContent.shift();
          }
          while (cleanedContent.length > 0 && typeof cleanedContent[cleanedContent.length - 1] === "string" && !cleanedContent[cleanedContent.length - 1].trim()) {
            cleanedContent.pop();
          }
          cellContent = { text: cleanedContent.length > 0 ? cleanedContent : "" };
        }
        if (isTh) {
          cellContent.style = "th";
        } else {
          cellContent.style = "td";
        }
        const alignment = cell.properties?.align;
        if (alignment === "center" || alignment === "right") {
          cellContent.alignment = alignment;
        }
        cells.push(cellContent);
      }
      if (cells.length) rows.push(cells);
    }
    return {
      table: { body: rows },
      layout: "tableLayout",
      style: "table"
    };
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
        if (level === 1) {
          content.push(createH1Border());
        } else if (level === 2) {
          content.push(createH2Border());
        }
        break;
      }
      case "p":
      case "div": {
        const children = node.children || [];
        const hasImage = !!children.find(
          (c) => c.type === "element" && (c.tagName?.toLowerCase() === "img" || c.tagName?.toLowerCase() === "svg")
        );
        if (hasImage) {
          let runs = [];
          const flush = () => {
            if (runs.length) {
              const filteredRuns = runs.filter((r) => typeof r !== "string" || r.trim().length > 0);
              if (filteredRuns.length) content.push({ text: filteredRuns, style: "p" });
              runs = [];
            }
          };
          for (const ch of children) {
            if (ch.type === "element" && ch.tagName?.toLowerCase() === "img") {
              flush();
              const src = ch.properties?.src;
              const alt = ch.properties?.alt || "";
              try {
                console.log(2222);
                const dataUrl = await imageResolver(src);
                content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
              } catch {
                if (alt) runs.push({ text: alt, italics: true, color: "#666" });
              }
            } else if (ch.type === "element" && ch.tagName?.toLowerCase() === "svg") {
              content.push({ svg: svgObjectToString(ch) });
            } else {
              runs.push(...inline([ch]));
            }
          }
          flush();
        } else {
          const inlineContent = inline(children);
          const filteredContent = inlineContent.filter((c) => typeof c !== "string" || c.trim().length > 0);
          if (filteredContent.length) {
            content.push({ text: filteredContent, style: "p" });
          }
        }
        break;
      }
      case "br":
        content.push({ text: ["\n"], style: "p" });
        break;
      case "hr":
        content.push(createHrBorder());
        break;
      case "blockquote": {
        const inner = [];
        const processBlockquoteChild = async (child) => {
          if (child.type === "element") {
            const tag2 = child.tagName?.toLowerCase();
            switch (tag2) {
              case "p":
              case "div": {
                const inlineContent = inline(child.children || []);
                if (inlineContent.length > 0) {
                  return [{ text: inlineContent, style: "blockquote", margin: [0, 2, 0, 2] }];
                }
                return [];
              }
              case "h1":
              case "h2":
              case "h3":
              case "h4":
              case "h5":
              case "h6": {
                const level = Number(tag2[1]);
                const txt = textFromChildren(child.children || []);
                if (txt) {
                  return [{ text: txt, style: [`h${level}`, "blockquote"], margin: [0, 4, 0, 8] }];
                }
                return [];
              }
              case "ul":
              case "ol": {
                const nestedList = await mapHastToPdfContent({ type: "root", children: [child] }, ctx);
                return nestedList.map((item) => ({
                  ...item,
                  margin: [8, 2, 0, 2],
                  style: Array.isArray(item.style) ? [...item.style, "blockquote"] : item.style ? [item.style, "blockquote"] : "blockquote"
                }));
              }
              case "blockquote": {
                const nestedQuote = await mapHastToPdfContent({ type: "root", children: [child] }, ctx);
                return nestedQuote.map((item) => ({
                  ...item,
                  margin: [8, 2, 0, 2]
                }));
              }
              case "table": {
                const tableElement = buildTableElement(child);
                return [{
                  ...tableElement,
                  margin: [8, 4, 0, 8],
                  style: Array.isArray(tableElement.style) ? [...tableElement.style, "blockquote"] : tableElement.style ? [tableElement.style, "blockquote"] : "blockquote"
                }];
              }
              // TODO: 引用中嵌套代码块时，导致字体大小会使用引用的而非代码块的
              case "pre": {
                const txt = textFromChildren(child.children || []);
                if (txt) {
                  const codeBlock = createCodeBlockStyle(txt);
                  return [{
                    ...codeBlock,
                    margin: [8, 4, 0, 8],
                    style: Array.isArray(codeBlock.style) ? [...codeBlock.style, "blockquote"] : codeBlock.style ? [codeBlock.style, "blockquote"] : "blockquote"
                  }];
                }
                return [];
              }
              case "code": {
                const txt = textFromChildren(child.children || []);
                const isBlock = child.children?.some((c) => c.type === "text" && (c.value || "").includes("\n"));
                if (txt) {
                  if (isBlock) {
                    const codeBlock = createCodeBlockStyle(txt);
                    return [{
                      ...codeBlock,
                      margin: [8, 4, 0, 8],
                      style: Array.isArray(codeBlock.style) ? [...codeBlock.style, "blockquote"] : codeBlock.style ? [codeBlock.style, "blockquote"] : "blockquote"
                    }];
                  } else {
                    return [{ text: txt, style: ["code", "blockquote"], margin: [0, 2, 0, 2] }];
                  }
                }
                return [];
              }
              case "hr": {
                return [{ ...createHrBorder(), margin: [8, 4, 0, 8] }];
              }
              case "img": {
                const src = child.properties?.src;
                const alt = child.properties?.alt || "";
                try {
                  const dataUrl = await imageResolver(src);
                  return [{ image: dataUrl, margin: [8, 4, 0, 8] }];
                } catch {
                  if (alt) {
                    return [{ text: alt, italics: true, color: "#666", style: "blockquote", margin: [0, 2, 0, 2] }];
                  }
                }
                return [];
              }
              default: {
                const inlineContent = inline([child]);
                if (inlineContent.length > 0) {
                  return [{ text: inlineContent, style: "blockquote", margin: [0, 2, 0, 2] }];
                }
                return [];
              }
            }
          } else if (child.type === "text") {
            const val = String(child.value ?? "").trim();
            if (val) {
              return [{ text: val, style: "blockquote", margin: [0, 2, 0, 2] }];
            }
          }
          return [];
        };
        for (const child of node.children || []) {
          const childElements = await processBlockquoteChild(child);
          inner.push(...childElements);
        }
        if (inner.length > 0) {
          content.push({
            layout: "blockquoteLayout",
            style: "blockquote",
            table: {
              body: [
                [
                  {
                    stack: inner
                  }
                ]
              ]
            }
          });
        }
        break;
      }
      case "pre": {
        const txt = textFromChildren(node.children || []);
        content.push(createCodeBlockStyle(txt));
        break;
      }
      case "code": {
        const isBlock = node.children?.some((c) => c.type === "text" && (c.value || "").includes("\n"));
        const txt = textFromChildren(node.children || []);
        if (isBlock) {
          content.push(createCodeBlockStyle(txt));
        } else {
          content.push({ text: txt, style: "code" });
        }
        break;
      }
      case "ul":
      case "ol": {
        const items = [];
        for (const li of (node.children || []).filter(
          (c) => c.type === "element" && c.tagName?.toLowerCase() === "li"
        )) {
          const blocks = [];
          let runs = [];
          const flushRuns = () => {
            if (runs.length) {
              let filteredRuns = runs.filter((r) => {
                if (typeof r === "string") return r.trim().length > 0;
                return true;
              });
              filteredRuns = filteredRuns.map((r) => {
                if (typeof r === "string") return r.replace(/\s+/g, " ").trim();
                return r;
              }).filter((r) => typeof r !== "string" || r.length > 0);
              if (filteredRuns.length) {
                blocks.push({ text: filteredRuns, style: "p", margin: [0, 2, 0, 2] });
              }
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
              if (runs.length === 0 && blocks.length === 0) {
                val = val.replace(/^[\s\r\n]+/, "");
              }
              val = val.replace(/[\s\r\n]+/g, " ");
              if (val && val !== " ") runs.push(val);
              continue;
            }
            if (child.type === "element") {
              const tag2 = (child.tagName || "").toLowerCase();
              if (tag2 === "code" && isInlineCodeTag(child)) {
                appendInlineSegments(inline([child]));
                continue;
              } else if (isInlineTag(tag2)) {
                appendInlineSegments(inline([child]));
                continue;
              }
              if (tag2 === "p" || tag2 === "div") {
                flushRuns();
                const segs = inline(child.children || []);
                const cleanedSegs = segs.filter((seg) => {
                  if (typeof seg === "string") return seg.trim().length > 0;
                  return true;
                });
                if (cleanedSegs.length && typeof cleanedSegs[0] === "string") {
                  cleanedSegs[0] = cleanedSegs[0].replace(/^[\n\s]+/, "").replace(/[\n\s]+$/, "");
                  if (!cleanedSegs[0]) {
                    cleanedSegs.shift();
                  }
                }
                if (cleanedSegs.length && typeof cleanedSegs[cleanedSegs.length - 1] === "string") {
                  const lastIdx = cleanedSegs.length - 1;
                  cleanedSegs[lastIdx] = cleanedSegs[lastIdx].replace(/[\n\s]+$/, "");
                  if (!cleanedSegs[lastIdx]) {
                    cleanedSegs.pop();
                  }
                }
                if (cleanedSegs.length) {
                  blocks.push({ text: cleanedSegs, style: "p", margin: [0, 2, 0, 2] });
                }
                continue;
              }
              flushRuns();
              if (tag2 === "ul" || tag2 === "ol") {
                const nested = await mapHastToPdfContent({ type: "root", children: [child] }, ctx);
                blocks.push(...nested);
              } else if (tag2 === "img") {
                const src = child.properties?.src;
                const alt = child.properties?.alt || "";
                try {
                  console.log(3333);
                  const dataUrl = await imageResolver(src);
                  blocks.push({ image: dataUrl, margin: [0, 4, 0, 8] });
                } catch {
                  if (alt) blocks.push({ text: alt, italics: true, color: "#666" });
                }
              } else if (tag2 === "blockquote") {
                const nestedQuote = await mapHastToPdfContent({ type: "root", children: [child] }, ctx);
                blocks.push(...nestedQuote.map((item) => ({
                  ...item,
                  margin: [8, 4, 0, 8]
                })));
              } else if (tag2 === "table") {
                blocks.push(buildTableElement(child));
              } else if (tag2 === "pre") {
                const txt = textFromChildren(child.children || []);
                if (txt) {
                  blocks.push(createCodeBlockStyle(txt));
                }
              } else if (tag2 === "code") {
                const txt = textFromChildren(child.children || []);
                const isBlock = child.children?.some((c) => c.type === "text" && (c.value || "").includes("\n"));
                if (txt) {
                  if (isBlock) {
                    blocks.push(createCodeBlockStyle(txt));
                  } else {
                    blocks.push({ text: txt, style: "code", preserveLeadingSpaces: true, margin: [0, 2, 0, 2] });
                  }
                }
              } else if (tag2 === "hr") {
                blocks.push(createHrBorder());
              }
            }
          }
          flushRuns();
          if (blocks.length === 0) {
            items.push({ text: "", style: "p", margin: [0, 2, 0, 2] });
          } else if (blocks.length === 1) {
            items.push(blocks[0]);
          } else {
            items.push({ stack: blocks });
          }
        }
        content.push(tag === "ol" ? { ol: items, style: "ol" } : { ul: items, style: "ul" });
        break;
      }
      case "table": {
        content.push(buildTableElement(node));
        break;
      }
      case "img": {
        const src = node.properties?.src;
        const alt = node.properties?.alt || "";
        try {
          const dataUrl = await imageResolver(src);
          content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
        } catch {
          if (alt) content.push({ text: alt, italics: true, color: "#666" });
        }
        break;
      }
      default: {
        if (node.children && node.children.length) {
          const txt = textFromChildren(node.children);
          if (txt) content.push({ text: txt, style: "p" });
        }
      }
    }
  }
  await visit(tree);
  console.log("content", content);
  return content;
}

// src/index.ts
function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
async function markdownToPdf(markdown, options = {}) {
  invariant(
    typeof window !== "undefined" && typeof document !== "undefined",
    "markdownToPdf: must run in browser environment"
  );
  invariant(typeof markdown === "string", "markdownToPdf: markdown must be a string");
  options.onProgress?.("parse");
  const { tree, flavor } = await parseMarkdown(markdown, options.enableHtml);
  options.onProgress?.("layout");
  let pdfContent;
  if (flavor === "mdast") {
    pdfContent = await mapRemarkToPdfContent(tree, { imageResolver: options.imageResolver });
  } else {
    pdfContent = await mapHastToPdfContent(tree, { imageResolver: options.imageResolver });
  }
  const docDefinition = buildDocDefinition(pdfContent, options);
  options.onProgress?.("emit");
  const pdfMakeAny = options.pdfMakeInstance ?? await import("pdfmake/build/pdfmake.js");
  const pdfMakeResolved = pdfMakeAny.default ?? pdfMakeAny;
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
  let registered = null;
  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(markdown);
  if (hasCjk) {
    try {
      const cjkFont = await loadDefaultCjkFont();
      registered = registerFonts(pdfMakeResolved, [cjkFont]);
      docDefinition.fonts = { ...docDefinition.fonts, ...registered?.fontsDef || {} };
      docDefinition.defaultStyle = { ...docDefinition.defaultStyle, font: cjkFont.name };
    } catch (e) {
    }
  }
  if (registered) {
    ;
    docDefinition.fonts = { ...docDefinition.fonts, ...registered.fontsDef };
  }
  return new Promise((resolve, reject) => {
    try {
      const runtime = pdfMakeResolved;
      console.log("docDefinition", docDefinition);
      const pdfDoc = runtime.createPdf(docDefinition, createLayout());
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
  mapHastToPdfContent,
  mapRemarkToPdfContent,
  markdownToPdf,
  parseMarkdown
};
