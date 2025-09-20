import { handleInlineNode } from './inline'

export function handleTableNode(node: any): any {
  console.log('buildTableElement node', node)
  const rows: any[] = []
  const sections = (node.children || []).filter(
    (c: any) => c.type === 'element' && (c.tagName === 'thead' || c.tagName === 'tbody')
  )
  const trNodes = sections.length
    ? sections.flatMap((s: any) => (s.children || []).filter((x: any) => x.type === 'element' && x.tagName === 'tr'))
    : (node.children || []).filter((x: any) => x.type === 'element' && x.tagName === 'tr')
  for (const tr of trNodes) {
    const cells: any[] = []
    for (const cell of (tr.children || []).filter((c: any) => c.type === 'element')) {
      const isTh = cell.tagName === 'th'
      let cellContent: any

      // 判断是否有需要特殊处理的复杂块级元素
      const hasBlockElements = (cell.children || []).some(
        (c: any) =>
          c.type === 'element' && ['ul', 'ol', 'p', 'div', 'blockquote', 'pre'].includes(c.tagName?.toLowerCase())
      )

      if (hasBlockElements) {
        // 包含块级元素：特殊处理，保持格式和结构信息
        const parts: any[] = []
        for (const child of cell.children || []) {
          if (child.type === 'element') {
            const tag = child.tagName?.toLowerCase()
            if (tag === 'ul' || tag === 'ol') {
              // 列表：提取列表项并保持格式，用换行分隔
              const listItems = (child.children || [])
                .filter((li: any) => li.type === 'element' && li.tagName?.toLowerCase() === 'li')
                .map((li: any) => {
                  const itemContent = handleInlineNode(li.children || [])
                  const itemText = itemContent.length > 0 ? itemContent : '[空]'
                  return (
                    '• ' +
                    (Array.isArray(itemText)
                      ? itemText.map((p) => (typeof p === 'string' ? p : p.text || '')).join('')
                      : itemText)
                  )
                })
                .join('\n')
              if (listItems) parts.push(listItems)
            } else if (tag === 'p' || tag === 'div') {
              // 段落和div：使用inline处理保持格式
              const inlineContent = handleInlineNode(child.children || [])
              if (inlineContent.length > 0) {
                // 对于段落内容，如果是纯文本则直接添加，否则保持结构
                const hasFormat = inlineContent.some((item) => typeof item !== 'string')
                if (hasFormat) {
                  parts.push(inlineContent)
                } else {
                  const text = inlineContent.join('').trim()
                  if (text) parts.push(text)
                }
              }
            } else {
              // 其他元素：使用inline处理
              const inlineContent = handleInlineNode([child])
              if (inlineContent.length > 0) {
                const hasFormat = inlineContent.some((item) => typeof item !== 'string')
                if (hasFormat) {
                  parts.push(inlineContent)
                } else {
                  const text = inlineContent.join('').trim()
                  if (text) parts.push(text)
                }
              }
            }
          } else if (child.type === 'text') {
            const txt = String(child.value || '').trim()
            if (txt) parts.push(txt)
          }
        }

        // 构建单元格内容，支持混合格式
        if (parts.length === 0) {
          cellContent = { text: '' }
        } else if (parts.length === 1 && typeof parts[0] === 'string') {
          cellContent = { text: parts[0] }
        } else {
          // 有多个部分或包含格式，需要特殊处理
          const flatParts: any[] = []
          for (let i = 0; i < parts.length; i++) {
            if (i > 0) flatParts.push('\n') // 段落之间换行
            if (Array.isArray(parts[i])) {
              flatParts.push(...parts[i])
            } else {
              flatParts.push(parts[i])
            }
          }
          cellContent = { text: flatParts }
        }
      } else {
        // 简单内容或行内元素：使用新的inline处理支持嵌套
        const inlineContent = handleInlineNode(cell.children || [])
        const cleanedContent = inlineContent.filter((item) => {
          if (typeof item === 'string') {
            return item.trim().length > 0
          }
          return true
        })
        // 清理首尾的纯空白字符串
        while (cleanedContent.length > 0 && typeof cleanedContent[0] === 'string' && !cleanedContent[0].trim()) {
          cleanedContent.shift()
        }
        while (
          cleanedContent.length > 0 &&
          typeof cleanedContent[cleanedContent.length - 1] === 'string' &&
          !cleanedContent[cleanedContent.length - 1].trim()
        ) {
          cleanedContent.pop()
        }
        cellContent = { text: cleanedContent.length > 0 ? cleanedContent : '' }
      }

      if (isTh) {
        cellContent.style = 'th'
      } else {
        cellContent.style = 'td'
      }

      // 处理对齐信息 - 从HTML属性中读取
      const alignment = cell.properties?.align as string
      if (alignment === 'center' || alignment === 'right') {
        cellContent.alignment = alignment
      }

      cells.push(cellContent)
    }
    if (cells.length) rows.push(cells)
  }
  return {
    table: { body: rows },
    layout: 'tableLayout',
    style: 'table',
  }
}
