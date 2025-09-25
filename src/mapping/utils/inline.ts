import { textFromChildren } from '../utils'
import { handleSvgNode } from './svg'

// 累积样式接口，支持样式叠加
interface TextStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  code?: boolean
  link?: string
  style?: string[]
}

function mergeStyles(base: TextStyle, add: TextStyle): TextStyle {
  return {
    bold: base.bold || add.bold,
    italic: base.italic || add.italic,
    underline: base.underline || add.underline,
    strike: base.strike || add.strike,
    code: base.code || add.code,
    link: add.link || base.link, // 新的链接覆盖旧的
    style: [...(base.style || []), ...(add.style || [])],
  }
}

function styleToObject(style: TextStyle, text: any): any {
  const result: any = { text }

  if (style.bold) result.style = result.style ? [result.style, 'b'].flat() : 'b'
  if (style.italic) result.italics = true
  if (style.underline) result.style = result.style ? [result.style, 'u'].flat() : 'u'
  if (style.strike) result.style = result.style ? [result.style, 'del'].flat() : 'del'
  if (style.code) result.style = result.style ? [result.style, 'code'].flat() : 'code'
  if (style.link) {
    result.link = style.link
    result.style = result.style ? [result.style, 'a'].flat() : 'a'
  }

  // 处理自定义样式数组
  if (style.style && style.style.length > 0) {
    result.style = result.style ? [result.style, ...style.style].flat() : style.style
  }

  return result
}

/**
 * 处理行内元素，支持嵌套样式
 */
export function handleInlineNode(nodes: any[], baseStyle: TextStyle = {}): any[] {
  const parts: any[] = []

  for (const n of nodes || []) {
    if (n.type === 'text') {
      const textValue = n.value ?? ''
      if (textValue) {
        // 如果有累积的样式，应用到文本上
        if (Object.keys(baseStyle).length > 0) {
          parts.push(styleToObject(baseStyle, textValue))
        } else {
          parts.push(textValue)
        }
      }
    } else if (n.type === 'element') {
      const tag = (n.tagName || '').toLowerCase()
      let currentStyle = { ...baseStyle }

      // 根据标签添加样式
      switch (tag) {
        case 'strong':
        case 'b':
          currentStyle = mergeStyles(currentStyle, { bold: true })
          break
        case 'em':
        case 'i':
          currentStyle = mergeStyles(currentStyle, { italic: true })
          break
        case 's':
        case 'strike':
        case 'del':
          currentStyle = mergeStyles(currentStyle, { strike: true })
          break
        case 'u':
          currentStyle = mergeStyles(currentStyle, { underline: true })
          break
        case 'code':
          currentStyle = mergeStyles(currentStyle, { code: true })
          break
        case 'a':
          currentStyle = mergeStyles(currentStyle, { link: n.properties?.href })
          break
        case 'br':
          parts.push('\n')
          continue
        case 'img':
          // 行内图片：由于 inline 函数不是异步的，且行内图片会破坏版面布局
          // 所以这里只返回 alt 文本，实际图片处理在块级元素中完成
          const alt = (n.properties?.alt as string) || ''
          const altText = alt || '[图片]'
          if (Object.keys(baseStyle).length > 0) {
            parts.push(styleToObject(baseStyle, altText))
          } else {
            parts.push(altText)
          }
          continue
        case 'svg':
          parts.push({ svg: handleSvgNode(n) })
          continue
      }

      // 递归处理子节点，传递累积的样式
      if (n.children && n.children.length > 0) {
        const nestedParts = handleInlineNode(n.children, currentStyle)
        parts.push(...nestedParts)
      } else if (tag === 'br') {
        // br标签的特殊处理已在switch中完成
      } else if (tag === 'img' || tag === 'svg') {
        // img和svg的特殊处理已在switch中完成
      } else {
        // 对于未识别的标签，尝试提取文本内容
        const textContent = textFromChildren([n])
        if (textContent) {
          if (Object.keys(baseStyle).length > 0) {
            parts.push(styleToObject(baseStyle, textContent))
          } else {
            parts.push(textContent)
          }
        }
      }
    }
  }

  return parts
}
