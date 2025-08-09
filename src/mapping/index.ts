/* Minimal remark AST → pdfmake content mapping (v1 step) */

export type PdfContent = any[];

interface NodeBase { type: string; [key: string]: any }

export function mapRemarkToPdfContent(tree: NodeBase): PdfContent {
  const content: PdfContent = [];

  function textFromChildren(children: any[]): string {
    let acc = '';
    for (const ch of children || []) {
      if (ch.type === 'text') acc += ch.value ?? '';
      else if (ch.type === 'inlineCode') acc += ch.value ?? '';
      else if (ch.children) acc += textFromChildren(ch.children);
    }
    return acc;
  }

  function visit(node: NodeBase) {
    switch (node.type) {
      case 'root':
        (node.children || []).forEach(visit);
        break;
      case 'heading': {
        const txt = textFromChildren(node.children || []);
        const level = Math.max(1, Math.min(6, node.depth || 1));
        content.push({ text: txt, style: `h${level}` });
        break;
      }
      case 'paragraph': {
        const parts: any[] = inline(node.children || []);
        content.push({ text: parts, style: 'paragraph' });
        break;
      }
      case 'thematicBreak':
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] });
        break;
      case 'list': {
        const items = (node.children || []).map((li: any) => ({ text: textFromChildren(li.children || []) }));
        if (node.ordered) content.push({ ol: items.map(i => i.text) });
        else content.push({ ul: items.map(i => i.text) });
        break;
      }
      case 'blockquote': {
        const inner: any[] = [];
        (node.children || []).forEach((n: any) => {
          if (n.type === 'paragraph') inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] });
          else visit(n);
        });
        content.push({ stack: inner, margin: [8, 4, 0, 8], style: 'paragraph' });
        break;
      }
      default:
        // Not handled yet; extend in later milestones
        break;
    }
  }

  function inline(nodes: any[]): any[] {
    const parts: any[] = [];
    for (const n of nodes) {
      if (n.type === 'text') parts.push(n.value ?? '');
      else if (n.type === 'strong') parts.push({ text: textFromChildren(n.children || []), bold: true });
      else if (n.type === 'emphasis') parts.push({ text: textFromChildren(n.children || []), italics: true });
      else if (n.type === 'delete') parts.push({ text: textFromChildren(n.children || []), decoration: 'lineThrough' });
      else if (n.type === 'inlineCode') parts.push({ text: n.value ?? '', style: 'code' });
      else if (n.type === 'link') parts.push({ text: textFromChildren(n.children || []), link: n.url, style: 'link' });
      else if (n.children) parts.push(textFromChildren(n.children));
    }
    return parts;
  }

  visit(tree);
  return content;
}


