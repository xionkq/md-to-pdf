/* HAST (HTML) → pdfmake 内容映射（基础版，GitHub 样式对齐） */

import { createH1Border, createCodeBlockStyle, createHrBorder } from '../styles/github-borders'
import { HastNodeBase } from '../types'

export type PdfContent = any[]

export interface MapContext {
  imageResolver?: (src: string) => Promise<string>
}

// TODO: 支持通过 reference 方式使用图片
// 提供默认的图片解析器
async function defaultImageResolver(src: string): Promise<string> {
  // 优先使用用户提供的 imageResolver，否则会默认将 url 转 base64（几乎必跨域）
  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // 如果是 dataURL，直接返回
  if (src.startsWith('data:')) {
    return src
  }

  // 如果是完整的 HTTP/HTTPS URL，尝试直接使用
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return await urlToBase64(src)
  }

  // 对于相对路径或其他格式，也直接返回让 pdfmake 尝试处理
  return src
}

function camelToKebab(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

const svgAttrMap: Record<string, string> = {
  // SVG 坐标 & 视图
  viewBox: 'viewBox',
  preserveAspectRatio: 'preserveAspectRatio',

  // 渐变 <linearGradient> / <radialGradient>
  gradientTransform: 'gradientTransform',
  gradientUnits: 'gradientUnits',
  spreadMethod: 'spreadMethod',

  // <pattern>
  patternTransform: 'patternTransform',
  patternUnits: 'patternUnits',

  // <clipPath> / <mask>
  clipPathUnits: 'clipPathUnits',
  maskContentUnits: 'maskContentUnits',
  maskUnits: 'maskUnits',

  // marker 相关
  markerHeight: 'markerHeight',
  markerWidth: 'markerWidth',
  markerUnits: 'markerUnits',

  // filter 相关
  filterUnits: 'filterUnits',
  primitiveUnits: 'primitiveUnits',
  kernelMatrix: 'kernelMatrix', // feConvolveMatrix
  kernelUnitLength: 'kernelUnitLength',
  baseFrequency: 'baseFrequency', // feTurbulence
  numOctaves: 'numOctaves',
  stitchTiles: 'stitchTiles',
  surfaceScale: 'surfaceScale',
  specularConstant: 'specularConstant',
  specularExponent: 'specularExponent',
  diffuseConstant: 'diffuseConstant',

  // feComposite
  in2: 'in2',

  // <fePointLight>, <feSpotLight>
  xChannelSelector: 'xChannelSelector',
  yChannelSelector: 'yChannelSelector',
  zChannelSelector: 'zChannelSelector',
  limitingConeAngle: 'limitingConeAngle',

  // xlink 属性 (旧标准，仍需支持)
  xlinkHref: 'xlink:href',
}

interface SvgNode {
  tagName: string
  properties: Record<string, any>
  children: SvgNode[]
}
function svgObjectToString(node: SvgNode): string {
  const children = node.children.reduce((acc, n) => {
    const a = svgObjectToString(n)
    console.log('a', a)
    return acc + a
  }, '')
  const propString = Object.keys(node.properties).reduce((acc, key) => {
    const hasMap = Object.keys(svgAttrMap).includes(key)
    return acc + ` ${hasMap ? svgAttrMap[key] : camelToKebab(key)}="${node.properties[key]}"`
  }, '')
  return `<${node.tagName}${propString}>${children}</${node.tagName}>`
}

export async function mapHastToPdfContent(tree: HastNodeBase, ctx: MapContext = {}): Promise<PdfContent> {
  const content: PdfContent = []

  // 如果没有提供 imageResolver，使用默认实现
  const imageResolver = ctx.imageResolver || defaultImageResolver

  function textFromChildren(children: any[]): string {
    let acc = ''
    for (const ch of children || []) {
      if (ch.type === 'text') acc += ch.value ?? ''
      else if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'br') acc += '\n'
      else if (ch.children) acc += textFromChildren(ch.children)
    }
    return acc
  }

  function isInlineTag(tagName: string): boolean {
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

  function isInlineCodeTag(node: any): boolean {
    // 判断code标签是否为行内代码
    if (!node || node.tagName?.toLowerCase() !== 'code') return false

    // 如果包含换行符，则是块级代码
    const hasNewline = (node.children || []).some((c: any) => c.type === 'text' && (c.value || '').includes('\n'))

    return !hasNewline
  }

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

  function inline(nodes: any[], baseStyle: TextStyle = {}): any[] {
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
            parts.push({ svg: svgObjectToString(n) })
            continue
        }

        // 递归处理子节点，传递累积的样式
        if (n.children && n.children.length > 0) {
          const nestedParts = inline(n.children, currentStyle)
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

  function buildTableElement(node: any): any {
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
                    const itemContent = inline(li.children || [])
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
                const inlineContent = inline(child.children || [])
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
                const inlineContent = inline([child])
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
          const inlineContent = inline(cell.children || [])
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

  async function visit(node: HastNodeBase) {
    if (node.type === 'root') {
      for (const child of node.children || []) await visit(child)
      return
    }
    if (node.type !== 'element') return

    const tag = (node.tagName || '').toLowerCase()
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = Number(tag[1])
        const txt = textFromChildren(node.children || [])

        // 添加标题内容
        content.push({ text: txt, style: `h${level}` })

        // GitHub 样式：H1 和 H2 添加底部边框
        if (level === 1 || level === 2) {
          content.push(createH1Border())
        }
        break
      }
      case 'p':
      case 'div': {
        const children = node.children || []
        const hasImage = !!children.find(
          (c: any) => c.type === 'element' && (c.tagName?.toLowerCase() === 'img' || c.tagName?.toLowerCase() === 'svg')
        )
        if (hasImage) {
          let runs: any[] = []
          const flush = () => {
            if (runs.length) {
              const filteredRuns = runs.filter((r) => typeof r !== 'string' || r.trim().length > 0)
              if (filteredRuns.length) content.push({ text: filteredRuns, style: 'p' })
              runs = []
            }
          }
          for (const ch of children) {
            if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'img') {
              flush()
              const src = ch.properties?.src as string
              const alt = (ch.properties?.alt as string) || ''
              try {
                console.log(2222)
                const dataUrl = await imageResolver(src)
                content.push({ image: dataUrl, margin: [0, 4, 0, 8] })
              } catch {
                if (alt) runs.push({ text: alt, italics: true, color: '#666' })
              }
            } else if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'svg') {
              content.push({ svg: svgObjectToString(ch) })
            } else {
              runs.push(...inline([ch] as any))
            }
          }
          flush()
        } else {
          const inlineContent = inline(children)
          const filteredContent = inlineContent.filter((c) => typeof c !== 'string' || c.trim().length > 0)
          if (filteredContent.length) {
            content.push({ text: filteredContent, style: 'p' })
          }
        }
        break
      }
      case 'br':
        content.push({ text: ['\n'], style: 'p' })
        break
      case 'hr':
        content.push(createHrBorder())
        break
      case 'blockquote': {
        // 处理引用嵌套，支持完整的块级元素
        const inner: any[] = []

        // 递归处理引用块中的每个子元素
        const processBlockquoteChild = async (child: any): Promise<any[]> => {
          if (child.type === 'element') {
            const tag = child.tagName?.toLowerCase()

            switch (tag) {
              case 'p':
              case 'div': {
                // 段落：使用inline处理支持嵌套格式
                const inlineContent = inline(child.children || [])
                if (inlineContent.length > 0) {
                  return [{ text: inlineContent, style: 'blockquote', margin: [0, 2, 0, 2] }]
                }
                return []
              }

              case 'h1':
              case 'h2':
              case 'h3':
              case 'h4':
              case 'h5':
              case 'h6': {
                // 标题：在引用块中的标题
                const level = Number(tag[1])
                const txt = textFromChildren(child.children || [])
                if (txt) {
                  return [{ text: txt, style: [`h${level}`, 'blockquote'], margin: [0, 4, 0, 8] }]
                }
                return []
              }

              case 'ul':
              case 'ol': {
                // 列表：递归处理并保持结构
                const nestedList = await mapHastToPdfContent({ type: 'root', children: [child] } as any, ctx)
                // 为引用块中的列表添加特殊样式和缩进
                return nestedList.map((item: any) => ({
                  ...item,
                  margin: [8, 2, 0, 2],
                  style: Array.isArray(item.style)
                    ? [...item.style, 'blockquote']
                    : item.style
                      ? [item.style, 'blockquote']
                      : 'blockquote',
                }))
              }

              case 'blockquote': {
                // 嵌套引用：递归处理
                const nestedQuote = await mapHastToPdfContent({ type: 'root', children: [child] } as any, ctx)
                return nestedQuote.map((item: any) => ({
                  ...item,
                  margin: [8, 2, 0, 2],
                }))
              }

              case 'table': {
                // 表格：直接处理并添加引用样式
                const tableElement = buildTableElement(child)
                return [
                  {
                    ...tableElement,
                    margin: [8, 4, 0, 8],
                    style: Array.isArray(tableElement.style)
                      ? [...tableElement.style, 'blockquote']
                      : tableElement.style
                        ? [tableElement.style, 'blockquote']
                        : 'blockquote',
                  },
                ]
              }
              // TODO: 引用中嵌套代码块时，导致字体大小会使用引用的而非代码块的
              case 'pre': {
                // 代码块：保持格式
                const txt = textFromChildren(child.children || [])
                if (txt) {
                  const codeBlock = createCodeBlockStyle(txt)
                  return [
                    {
                      ...codeBlock,
                      margin: [8, 4, 0, 8],
                      style: Array.isArray(codeBlock.style)
                        ? [...codeBlock.style, 'blockquote']
                        : codeBlock.style
                          ? [codeBlock.style, 'blockquote']
                          : 'blockquote',
                    },
                  ]
                }
                return []
              }

              case 'code': {
                // 独立代码块
                const txt = textFromChildren(child.children || [])
                const isBlock = child.children?.some((c: any) => c.type === 'text' && (c.value || '').includes('\n'))
                if (txt) {
                  if (isBlock) {
                    const codeBlock = createCodeBlockStyle(txt)
                    return [
                      {
                        ...codeBlock,
                        margin: [8, 4, 0, 8],
                        style: Array.isArray(codeBlock.style)
                          ? [...codeBlock.style, 'blockquote']
                          : codeBlock.style
                            ? [codeBlock.style, 'blockquote']
                            : 'blockquote',
                      },
                    ]
                  } else {
                    return [{ text: txt, style: ['code', 'blockquote'], margin: [0, 2, 0, 2] }]
                  }
                }
                return []
              }

              case 'hr': {
                // 分割线
                return [{ ...createHrBorder(), margin: [8, 4, 0, 8] }]
              }

              case 'img': {
                // 图片
                const src = child.properties?.src as string
                const alt = (child.properties?.alt as string) || ''
                try {
                  const dataUrl = await imageResolver(src)
                  return [{ image: dataUrl, margin: [8, 4, 0, 8] }]
                } catch {
                  if (alt) {
                    return [{ text: alt, italics: true, color: '#666', style: 'blockquote', margin: [0, 2, 0, 2] }]
                  }
                }
                return []
              }

              default: {
                // 其他元素：使用inline处理
                const inlineContent = inline([child])
                if (inlineContent.length > 0) {
                  return [{ text: inlineContent, style: 'blockquote', margin: [0, 2, 0, 2] }]
                }
                return []
              }
            }
          } else if (child.type === 'text') {
            const val = String(child.value ?? '').trim()
            if (val) {
              return [{ text: val, style: 'blockquote', margin: [0, 2, 0, 2] }]
            }
          }

          return []
        }

        // 处理所有子元素
        for (const child of node.children || []) {
          const childElements = await processBlockquoteChild(child)
          inner.push(...childElements)
        }

        // 使用stack结构而不是table text，以支持复杂的块级元素
        if (inner.length > 0) {
          content.push({
            layout: 'blockquoteLayout',
            style: 'blockquote',
            table: {
              body: [
                [
                  {
                    stack: inner,
                  },
                ],
              ],
            },
          })
        }
        break
      }
      case 'pre': {
        // TODO: 代码中的空格字符被删除，应该保留
        const txt = textFromChildren(node.children || [])
        // 使用 GitHub 样式的代码块
        content.push(createCodeBlockStyle(txt))
        break
      }
      case 'code': {
        // 独立的 <code> 视作代码块，否则通常由 inline 处理
        const isBlock = node.children?.some((c: any) => c.type === 'text' && (c.value || '').includes('\n'))
        const txt = textFromChildren(node.children || [])
        if (isBlock) {
          content.push(createCodeBlockStyle(txt))
        } else {
          // 行内代码，如果不在其他上下文中，直接输出
          content.push({ text: txt, style: 'code' })
        }
        break
      }
      case 'ul':
      case 'ol': {
        const items: any[] = []
        for (const li of (node.children || []).filter(
          (c: any) => c.type === 'element' && c.tagName?.toLowerCase() === 'li'
        )) {
          const blocks: any[] = []
          let runs: any[] = []
          const flushRuns = () => {
            if (runs.length) {
              // 过滤空内容和多余空白，清理连续的空白字符
              let filteredRuns = runs.filter((r) => {
                if (typeof r === 'string') return r.trim().length > 0
                return true
              })
              // 清理连续空格和换行
              filteredRuns = filteredRuns
                .map((r) => {
                  if (typeof r === 'string') return r.replace(/\s+/g, ' ').trim()
                  return r
                })
                .filter((r) => typeof r !== 'string' || r.length > 0)

              if (filteredRuns.length) {
                blocks.push({ text: filteredRuns, style: 'p', margin: [0, 2, 0, 2] })
              }
              runs = []
            }
          }
          const appendInlineSegments = (segs: any[]) => {
            for (const seg of segs || []) {
              if (typeof seg === 'string') {
                if (seg === '\n') {
                  // 开头的换行不输出，避免空段落
                  if (runs.length) runs.push(seg)
                } else {
                  const s = runs.length === 0 ? seg.replace(/^[\s\r\n]+/, '') : seg
                  if (s) runs.push(s)
                }
              } else if (seg && typeof seg === 'object') {
                runs.push(seg)
              }
            }
          }
          for (const child of li.children || []) {
            if (child.type === 'text') {
              let val = String(child.value ?? '')
              // 只在列表项开头清理前导空白
              if (runs.length === 0 && blocks.length === 0) {
                val = val.replace(/^[\s\r\n]+/, '')
              }
              // 清理多余的连续空白，但保留单个空格
              val = val.replace(/[\s\r\n]+/g, ' ')
              if (val && val !== ' ') runs.push(val)
              continue
            }
            if (child.type === 'element') {
              const tag = (child.tagName || '').toLowerCase()
              // 特殊处理code标签：如果是行内代码，则视为内联标签
              if (tag === 'code' && isInlineCodeTag(child)) {
                appendInlineSegments(inline([child] as any))
                continue
              } else if (isInlineTag(tag)) {
                appendInlineSegments(inline([child] as any))
                continue
              }
              if (tag === 'p' || tag === 'div') {
                // p/div 视作块：先合并当前行内，再输出该段落（支持嵌套格式）
                flushRuns()
                const segs = inline(child.children || [])
                // 段落内部避免首尾空白和连续换行
                const cleanedSegs = segs.filter((seg) => {
                  if (typeof seg === 'string') return seg.trim().length > 0
                  return true
                })
                // 清理首尾空白（只对纯字符串）
                if (cleanedSegs.length && typeof cleanedSegs[0] === 'string') {
                  cleanedSegs[0] = (cleanedSegs[0] as string).replace(/^[\n\s]+/, '').replace(/[\n\s]+$/, '')
                  // 如果清理后为空，移除
                  if (!cleanedSegs[0]) {
                    cleanedSegs.shift()
                  }
                }
                if (cleanedSegs.length && typeof cleanedSegs[cleanedSegs.length - 1] === 'string') {
                  const lastIdx = cleanedSegs.length - 1
                  cleanedSegs[lastIdx] = (cleanedSegs[lastIdx] as string).replace(/[\n\s]+$/, '')
                  // 如果清理后为空，移除
                  if (!cleanedSegs[lastIdx]) {
                    cleanedSegs.pop()
                  }
                }
                if (cleanedSegs.length) {
                  blocks.push({ text: cleanedSegs, style: 'p', margin: [0, 2, 0, 2] })
                }
                continue
              }
              // 其它块级元素：先冲刷当前行内，再单独处理
              flushRuns()
              if (tag === 'ul' || tag === 'ol') {
                const nested = await mapHastToPdfContent({ type: 'root', children: [child] } as any, ctx)
                blocks.push(...nested)
              } else if (tag === 'img') {
                const src = child.properties?.src as string
                const alt = (child.properties?.alt as string) || ''
                try {
                  console.log(3333)
                  const dataUrl = await imageResolver(src)

                  blocks.push({ image: dataUrl, margin: [0, 4, 0, 8] })
                } catch {
                  if (alt) blocks.push({ text: alt, italics: true, color: '#666' })
                }
              } else if (tag === 'blockquote') {
                // 在列表项中处理 blockquote，使用与主blockquote相同的逻辑
                const nestedQuote = await mapHastToPdfContent({ type: 'root', children: [child] } as any, ctx)
                blocks.push(
                  ...nestedQuote.map((item: any) => ({
                    ...item,
                    margin: [8, 4, 0, 8],
                  }))
                )
              } else if (tag === 'table') {
                blocks.push(buildTableElement(child))
              } else if (tag === 'pre') {
                // pre标签一定是代码块，使用完整的代码块样式
                const txt = textFromChildren(child.children || [])
                if (txt) {
                  blocks.push(createCodeBlockStyle(txt))
                }
              } else if (tag === 'code') {
                // code标签需要判断是否为块级代码块
                const txt = textFromChildren(child.children || [])
                const isBlock = child.children?.some((c: any) => c.type === 'text' && (c.value || '').includes('\n'))
                if (txt) {
                  if (isBlock) {
                    // 块级代码，使用代码块样式
                    blocks.push(createCodeBlockStyle(txt))
                  } else {
                    // 行内代码，使用简单样式但保持适当的边距
                    blocks.push({ text: txt, style: 'code', preserveLeadingSpaces: true, margin: [0, 2, 0, 2] })
                  }
                }
              } else if (tag === 'hr') {
                blocks.push(createHrBorder())
              }
            }
          }
          flushRuns()
          // 优化列表项结构：单个块时直接使用，多个块时用 stack
          if (blocks.length === 0) {
            // 空列表项，添加空文本
            items.push({ text: '', style: 'p', margin: [0, 2, 0, 2] })
          } else if (blocks.length === 1) {
            items.push(blocks[0])
          } else {
            items.push({ stack: blocks })
          }
        }
        // TODO: 嵌套的列表不应再次加上 style
        content.push(tag === 'ol' ? { ol: items, style: 'ol' } : { ul: items, style: 'ul' })
        break
      }
      case 'table': {
        content.push(buildTableElement(node))
        break
      }
      case 'img': {
        const src = node.properties?.src as string
        const alt = (node.properties?.alt as string) || ''
        try {
          const dataUrl = await imageResolver(src)
          content.push({ image: dataUrl, margin: [0, 4, 0, 8] })
        } catch {
          if (alt) content.push({ text: alt, italics: true, color: '#666' })
        }
        break
      }
      default: {
        // 未覆盖标签：降级遍历子节点，将文本内容合并到段落
        if (node.children && node.children.length) {
          const txt = textFromChildren(node.children)
          if (txt) content.push({ text: txt, style: 'p' })
        }
      }
    }
  }

  await visit(tree)
  console.log('content', content)
  return content
}
