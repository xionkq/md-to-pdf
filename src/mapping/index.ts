/* remark AST → pdfmake 内容映射（支持嵌套/任务列表/表格/代码块/图片） */

import {
  createH1Border,
  createH2Border,
  createBlockquoteBorder,
  createTableLayout,
  createCodeBlockStyle,
} from '../styles/github-borders'

export type PdfContent = any[]

interface NodeBase {
  type: string
  [key: string]: any
}

// 上下文：可注入图片解析器，用于将 URL 转为 dataURL 以便内嵌到 PDF
export interface MapContext {
  imageResolver?: (src: string) => Promise<string>
}

export async function mapRemarkToPdfContent(tree: NodeBase, ctx: MapContext = {}): Promise<PdfContent> {
  const content: PdfContent = []

  // 提取一组子节点中的纯文本（用于简单单元格/标题等场景）
  function textFromChildren(children: any[]): string {
    let acc = ''
    for (const ch of children || []) {
      if (ch.type === 'text') acc += ch.value ?? ''
      else if (ch.type === 'inlineCode') acc += ch.value ?? ''
      else if (ch.children) acc += textFromChildren(ch.children)
    }
    return acc
  }

  async function visit(node: NodeBase) {
    switch (node.type) {
      case 'root':
        for (const child of node.children || []) await visit(child)
        break
      case 'heading': {
        const txt = textFromChildren(node.children || [])
        const level = Math.max(1, Math.min(6, node.depth || 1))

        // 添加标题内容
        content.push({ text: txt, style: `h${level}` })

        // GitHub 样式：H1 和 H2 添加底部边框
        if (level === 1) {
          content.push(createH1Border())
        } else if (level === 2) {
          content.push(createH2Border())
        }
        break
      }
      case 'paragraph': {
        const children = node.children || []
        const hasImage = !!children.find((c: any) => c.type === 'image')
        if (hasImage && ctx.imageResolver) {
          let runs: any[] = []
          const flush = () => {
            if (runs.length) {
              content.push({ text: runs, style: 'paragraph' })
              runs = []
            }
          }
          for (const ch of children) {
            if (ch.type === 'image') {
              flush()
              try {
                const dataUrl = await ctx.imageResolver(ch.url)
                content.push({ image: dataUrl, margin: [0, 4, 0, 8] })
              } catch {
                if (ch.alt) runs.push({ text: ch.alt, italics: true, color: '#666' })
              }
            } else {
              const segs = inline([ch])
              runs.push(...segs)
            }
          }
          flush()
        } else {
          const parts: any[] = inline(children)
          content.push({ text: parts, style: 'paragraph' })
        }
        break
      }
      case 'thematicBreak':
        content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] })
        break
      case 'list': {
        const listObj = await buildListObject(node)
        content.push(listObj)
        break
      }
      case 'blockquote': {
        const inner: any[] = []
        for (const n of node.children || []) {
          if (n.type === 'paragraph')
            inner.push({ text: inline(n.children || []), style: 'blockquote', margin: [0, 2, 0, 2] })
          else await visit(n)
        }

        // GitHub 样式：使用左边框 + 内容的布局
        content.push({
          columns: [
            createBlockquoteBorder(inner.length * 16), // 根据内容高度调整边框
            { stack: inner, width: '*' },
          ],
          columnGap: 0,
          margin: [0, 8, 0, 16],
        })
        break
      }
      case 'code': {
        const value = node.value ?? ''
        // 使用 GitHub 样式的代码块
        content.push(createCodeBlockStyle(value))
        break
      }
      case 'table': {
        const rows: any[] = []
        const aligns: (string | null)[] = node.align || []
        for (const row of node.children || []) {
          const cells: any[] = []
          for (let c = 0; c < (row.children || []).length; c++) {
            const cell = row.children[c]
            const txt = textFromChildren(cell.children || [])
            const cellDef: any = { text: txt, style: 'tableCell' }
            const alignment = aligns[c] || null
            if (alignment === 'center' || alignment === 'right') {
              cellDef.alignment = alignment
            }
            cells.push(cellDef)
          }
          rows.push(cells)
        }

        // GitHub 样式：表头行使用特殊样式，带背景色
        if (rows.length > 0) {
          rows[0] = rows[0].map((c: any) => ({
            ...c,
            style: 'tableHeader',
            fillColor: '#f6f8fa',
          }))
        }

        content.push({
          table: { body: rows },
          layout: createTableLayout(),
          margin: [0, 8, 0, 16],
        })
        break
      }
      case 'image': {
        const src = node.url as string
        if (ctx.imageResolver) {
          try {
            const dataUrl = await ctx.imageResolver(src)
            content.push({ image: dataUrl, margin: [0, 4, 0, 8] })
          } catch {
            // fallback to alt text
            if (node.alt) content.push({ text: node.alt, italics: true, color: '#666' })
          }
        } else {
          if (node.alt) content.push({ text: node.alt, italics: true, color: '#666' })
        }
        break
      }
      default:
        // Not handled yet; extend later
        break
    }
  }

  // 构建 pdfmake 列表对象，支持嵌套列表及列表项中的复合块
  async function buildListObject(listNode: any): Promise<any> {
    const items: any[] = []
    for (const li of listNode.children || []) {
      const blocks: any[] = []
      let prefixed = false
      for (const child of li.children || []) {
        if (child.type === 'paragraph') {
          const runs = inline(child.children || [])
          if (typeof li.checked === 'boolean' && !prefixed) {
            const box = li.checked ? '☑ ' : '☐ '
            if (typeof runs[0] === 'string') runs[0] = box + runs[0]
            else runs.unshift(box)
            prefixed = true
          }
          blocks.push({ text: runs, style: 'paragraph', margin: [0, 2, 0, 2] })
        } else if (child.type === 'list') {
          blocks.push(await buildListObject(child))
        } else if (child.type === 'table') {
          blocks.push(buildTable(child))
        } else if (child.type === 'code') {
          blocks.push(createCodeBlockStyle(child.value ?? ''))
        } else if (child.type === 'blockquote') {
          const inner: any[] = []
          for (const n of child.children || []) {
            if (n.type === 'paragraph') inner.push({ text: inline(n.children || []), margin: [0, 2, 0, 2] })
            // could recurse others as needed
          }
          blocks.push({ stack: inner, margin: [8, 4, 0, 8], style: 'paragraph' })
        } else if (child.type === 'image') {
          if (ctx.imageResolver) {
            try {
              const dataUrl = await ctx.imageResolver(child.url)
              blocks.push({ image: dataUrl, margin: [0, 4, 0, 8] })
            } catch {
              if (child.alt) blocks.push({ text: child.alt, italics: true, color: '#666' })
            }
          } else if (child.alt) {
            blocks.push({ text: child.alt, italics: true, color: '#666' })
          }
        }
      }
      items.push(blocks.length === 1 ? blocks[0] : { stack: blocks })
    }
    return listNode.ordered ? { ol: items } : { ul: items }
  }

  // 构建表格（GitHub 样式，带表头背景和边框）
  function buildTable(node: any): any {
    const rows: any[] = []
    const aligns: (string | null)[] = node.align || []
    for (const row of node.children || []) {
      const cells: any[] = []
      for (let c = 0; c < (row.children || []).length; c++) {
        const cell = row.children[c]
        const txt = textFromChildren(cell.children || [])
        const cellDef: any = { text: txt, style: 'tableCell' }
        const alignment = aligns[c] || null
        if (alignment === 'center' || alignment === 'right') {
          cellDef.alignment = alignment
        }
        cells.push(cellDef)
      }
      rows.push(cells)
    }

    // GitHub 样式：表头行使用特殊样式，带背景色
    if (rows.length > 0) {
      rows[0] = rows[0].map((c: any) => ({
        ...c,
        style: 'tableHeader',
        fillColor: '#f6f8fa',
      }))
    }

    return {
      table: { body: rows },
      layout: createTableLayout(),
      margin: [0, 8, 0, 16],
    }
  }

  function inline(nodes: any[]): any[] {
    const parts: any[] = []
    for (const n of nodes) {
      if (n.type === 'text') parts.push(n.value ?? '')
      else if (n.type === 'strong') parts.push({ text: textFromChildren(n.children || []), bold: true })
      else if (n.type === 'emphasis') parts.push({ text: textFromChildren(n.children || []), italics: true })
      else if (n.type === 'delete') parts.push({ text: textFromChildren(n.children || []), decoration: 'lineThrough' })
      else if (n.type === 'inlineCode') parts.push({ text: n.value ?? '', style: 'code' })
      else if (n.type === 'link') parts.push({ text: textFromChildren(n.children || []), link: n.url, style: 'link' })
      else if (n.children) parts.push(textFromChildren(n.children))
    }
    return parts
  }

  await visit(tree)
  return content
}
