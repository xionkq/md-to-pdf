/* HAST (HTML) → pdfmake 内容映射（基础版） */

export type PdfContent = any[];

interface HastNodeBase { type: string; [key: string]: any }

export interface MapContext { imageResolver?: (src: string) => Promise<string> }

export async function mapHastToPdfContent(tree: HastNodeBase, ctx: MapContext = {}): Promise<PdfContent> {
  const content: PdfContent = [];

  function textFromChildren(children: any[]): string {
    let acc = '';
    for (const ch of children || []) {
      if (ch.type === 'text') acc += ch.value ?? '';
      else if (ch.children) acc += textFromChildren(ch.children);
    }
    return acc;
  }

  function isInlineTag(tagName: string): boolean {
    const t = (tagName || '').toLowerCase();
    return (
      t === 'a' || t === 'strong' || t === 'b' || t === 'em' || t === 'i' ||
      t === 's' || t === 'strike' || t === 'del' || t === 'u' || t === 'code' ||
      t === 'span' || t === 'br' || t === 'img'
    );
  }

  function inline(nodes: any[]): any[] {
    const parts: any[] = [];
    for (const n of nodes || []) {
      if (n.type === 'text') {
        parts.push(n.value ?? '');
      } else if (n.type === 'element') {
        const tag = (n.tagName || '').toLowerCase();
        if (tag === 'strong' || tag === 'b') parts.push({ text: textFromChildren(n.children || []), bold: true });
        else if (tag === 'em' || tag === 'i') parts.push({ text: textFromChildren(n.children || []), italics: true });
        else if (tag === 's' || tag === 'strike' || tag === 'del') parts.push({ text: textFromChildren(n.children || []), decoration: 'lineThrough' });
        else if (tag === 'u') parts.push({ text: textFromChildren(n.children || []), decoration: 'underline' });
        else if (tag === 'code') parts.push({ text: textFromChildren(n.children || []), style: 'code' });
        else if (tag === 'a') parts.push({ text: textFromChildren(n.children || []), link: n.properties?.href, style: 'link' });
        else if (tag === 'br') parts.push('\n');
        else if (tag === 'img') {
          // 行内图片：尽量插入图片，否则退回 alt 文本
          const src = n.properties?.src as string;
          const alt = (n.properties?.alt as string) || '';
          parts.push({ text: alt }); // 在块级路径中处理图片；这里退回文本，避免内联破版
        } else if (n.children) {
          const inner = textFromChildren(n.children || []);
          if (inner) parts.push(inner);
        }
      }
    }
    return parts;
  }

  function buildTableElement(node: any): any {
    const rows: any[] = [];
    const sections = (node.children || []).filter((c: any) => c.type === 'element' && (c.tagName === 'thead' || c.tagName === 'tbody'));
    const trNodes = sections.length
      ? sections.flatMap((s: any) => (s.children || []).filter((x: any) => x.type === 'element' && x.tagName === 'tr'))
      : (node.children || []).filter((x: any) => x.type === 'element' && x.tagName === 'tr');
    for (const tr of trNodes) {
      const cells: any[] = [];
      for (const cell of (tr.children || []).filter((c: any) => c.type === 'element')) {
        const txt = textFromChildren(cell.children || []);
        const isTh = cell.tagName === 'th';
        const cellDef: any = { text: txt };
        if (isTh) cellDef.bold = true;
        cells.push(cellDef);
      }
      if (cells.length) rows.push(cells);
    }
    return { table: { body: rows }, layout: 'lightHorizontalLines', margin: [0, 4, 0, 8] };
  }

  async function visit(node: HastNodeBase) {
    if (node.type === 'root') {
      for (const child of node.children || []) await visit(child);
      return;
    }
    if (node.type !== 'element') return;

    const tag = (node.tagName || '').toLowerCase();
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = Number(tag[1]);
        const txt = textFromChildren(node.children || []);
        content.push({ text: txt, style: `h${level}` });
        break;
      }
      case 'p':
      case 'div': {
        const children = node.children || [];
        const hasImage = !!children.find((c: any) => c.type === 'element' && c.tagName?.toLowerCase() === 'img');
        if (hasImage && ctx.imageResolver) {
          let runs: any[] = [];
          const flush = () => { if (runs.length) { content.push({ text: runs, style: 'paragraph' }); runs = []; } };
          for (const ch of children) {
            if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'img') {
              flush();
              const src = ch.properties?.src as string;
              const alt = (ch.properties?.alt as string) || '';
              try {
                const dataUrl = await ctx.imageResolver(src);
                content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
              } catch {
                if (alt) runs.push({ text: alt, italics: true, color: '#666' });
              }
            } else {
              runs.push(...inline([ch] as any));
            }
          }
          flush();
        } else {
          content.push({ text: inline(children), style: 'paragraph' });
        }
        break;
      }
      case 'br':
        content.push({ text: ['\n'], style: 'paragraph' });
        break;
      case 'hr':
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
        break;
      case 'blockquote': {
        const inner: any[] = [];
        for (const n of node.children || []) {
          if (n.type === 'element' && (n.tagName === 'p' || n.tagName === 'div')) inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] });
          else if (n.type === 'text') {
            const val = String(n.value ?? '');
            if (val.trim()) inner.push({ text: val, margin: [0, 2, 0, 2] });
          }
        }
        content.push({ stack: inner, margin: [8, 4, 0, 8], style: 'paragraph' });
        break;
      }
      case 'pre': {
        const txt = textFromChildren(node.children || []);
        content.push({ text: txt, style: 'code', preserveLeadingSpaces: true, margin: [0, 4, 0, 8] });
        break;
      }
      case 'code': {
        // 独立的 <code> 视作代码块，否则通常由 inline 处理
        const isBlock = !node.children?.some((c: any) => c.type === 'text' && (c.value || '').includes('\n')) ? false : true;
        const txt = textFromChildren(node.children || []);
        content.push({ text: txt, style: 'code', preserveLeadingSpaces: isBlock, margin: [0, 4, 0, 8] });
        break;
      }
      case 'ul':
      case 'ol': {
        const items: any[] = [];
        for (const li of (node.children || []).filter((c: any) => c.type === 'element' && c.tagName?.toLowerCase() === 'li')) {
          const blocks: any[] = [];
          let runs: any[] = [];
          const flushRuns = () => {
            if (runs.length) {
              blocks.push({ text: runs, style: 'paragraph', margin: [0, 2, 0, 2] });
              runs = [];
            }
          };
          const appendInlineSegments = (segs: any[]) => {
            for (const seg of segs || []) {
              if (typeof seg === 'string') {
                if (seg === '\n') {
                  // 开头的换行不输出，避免空段落
                  if (runs.length) runs.push(seg);
                } else {
                  const s = runs.length === 0 ? seg.replace(/^[\s\r\n]+/, '') : seg;
                  if (s) runs.push(s);
                }
              } else if (seg && typeof seg === 'object') {
                runs.push(seg);
              }
            }
          };
          for (const child of li.children || []) {
            if (child.type === 'text') {
              let val = String(child.value ?? '');
              if (runs.length === 0) val = val.replace(/^[\s\r\n]+/, '');
              if (val) runs.push(val);
              continue;
            }
            if (child.type === 'element') {
              const tag = (child.tagName || '').toLowerCase();
              if (isInlineTag(tag)) {
                appendInlineSegments(inline([child] as any));
                continue;
              }
              if (tag === 'p' || tag === 'div') {
                // p/div 视作块：先合并当前行内，再输出该段落
                flushRuns();
                const segs = inline(child.children || []);
                // 段落内部也避免首字符为换行
                if (segs.length && typeof segs[0] === 'string') segs[0] = (segs[0] as string).replace(/^\n+/, '');
                blocks.push({ text: segs, style: 'paragraph', margin: [0, 2, 0, 2] });
                continue;
              }
              // 其它块级元素：先冲刷当前行内，再单独处理
              flushRuns();
              if (tag === 'ul' || tag === 'ol') {
                const nested = await mapHastToPdfContent({ type: 'root', children: [child] } as any, ctx);
                blocks.push(...nested);
              } else if (tag === 'img') {
                const src = child.properties?.src as string;
                const alt = (child.properties?.alt as string) || '';
                if (ctx.imageResolver) {
                  try {
                    const dataUrl = await ctx.imageResolver(src);
                    blocks.push({ image: dataUrl, margin: [0, 4, 0, 8] });
                  } catch { if (alt) blocks.push({ text: alt, italics: true, color: '#666' }); }
                } else if (alt) {
                  blocks.push({ text: alt, italics: true, color: '#666' });
                }
              } else if (tag === 'blockquote') {
                const nested = await mapHastToPdfContent({ type: 'root', children: [child] } as any, ctx);
                blocks.push({ stack: nested, margin: [8, 4, 0, 8], style: 'paragraph' });
              } else if (tag === 'table') {
                blocks.push(buildTableElement(child));
              } else if (tag === 'pre' || tag === 'code') {
                const txt = textFromChildren(child.children || []);
                blocks.push({ text: txt, style: 'code', preserveLeadingSpaces: true, margin: [0, 4, 0, 8] });
              } else if (tag === 'hr') {
                blocks.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
              }
            }
          }
          flushRuns();
          items.push(blocks.length === 1 ? blocks[0] : { stack: blocks });
        }
        content.push(tag === 'ol' ? { ol: items } : { ul: items });
        break;
      }
      case 'table': {
        content.push(buildTableElement(node));
        break;
      }
      case 'img': {
        const src = node.properties?.src as string;
        const alt = (node.properties?.alt as string) || '';
        if (ctx.imageResolver) {
          try {
            const dataUrl = await ctx.imageResolver(src);
            content.push({ image: dataUrl, margin: [0, 4, 0, 8] });
          } catch {
            if (alt) content.push({ text: alt, italics: true, color: '#666' });
          }
        } else if (alt) {
          content.push({ text: alt, italics: true, color: '#666' });
        }
        break;
      }
      default: {
        // 未覆盖标签：降级遍历子节点，将文本内容合并到段落
        if (node.children && node.children.length) {
          const txt = textFromChildren(node.children);
          if (txt) content.push({ text: txt, style: 'paragraph' });
        }
      }
    }
  }

  await visit(tree);
  return content;
}


