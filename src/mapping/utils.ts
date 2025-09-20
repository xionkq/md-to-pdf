export function textFromChildren(children: any[]): string {
  let acc = ''
  for (const ch of children || []) {
    if (ch.type === 'text') acc += ch.value ?? ''
    else if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'br') acc += '\n'
    else if (ch.children) acc += textFromChildren(ch.children)
  }
  return acc
}

export function isInlineTag(tagName: string): boolean {
  const t = (tagName || '').toLowerCase()
  return (
    t === 'a' ||
    t === 'strong' ||
    t === 'b' ||
    t === 'em' ||
    t === 'i' ||
    t === 's' ||
    t === 'strike' ||
    t === 'del' ||
    t === 'u' ||
    t === 'span' ||
    t === 'br' ||
    t === 'img' ||
    t === 'svg'
  )
  // 注意：移除了 'code'，因为code标签可能是块级代码块或行内代码，需要单独判断
}

export function isInlineCodeTag(node: any): boolean {
  // 判断code标签是否为行内代码
  if (!node || node.tagName?.toLowerCase() !== 'code') return false

  // 如果包含换行符，则是块级代码
  const hasNewline = (node.children || []).some((c: any) => c.type === 'text' && (c.value || '').includes('\n'))

  return !hasNewline
}
