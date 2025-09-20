/* HAST (HTML) → pdfmake 内容映射（基础版，GitHub 样式对齐） */

import { createH1Border, createCodeBlockStyle, createHrBorder } from '../styles/github-borders'
import { HastNodeBase } from '../types'
import { handleSvgNode } from './node/svg'
import { handleH1ToH6Node } from './node/h1ToH6'
import { handleTableNode } from './node/table'
import { handleInlineNode } from './node/inline'
import { isInlineCodeTag, isInlineTag, textFromChildren } from './utils'

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

export async function mapHastToPdfContent(tree: HastNodeBase, ctx: MapContext = {}): Promise<PdfContent> {
  const content: PdfContent = []

  // 如果没有提供 imageResolver，使用默认实现
  const imageResolver = ctx.imageResolver || defaultImageResolver

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
        handleH1ToH6Node(node, content)
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
              content.push({ svg: handleSvgNode(ch) })
            } else {
              runs.push(...handleInlineNode([ch] as any))
            }
          }
          flush()
        } else {
          const inlineContent = handleInlineNode(children)
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
                const inlineContent = handleInlineNode(child.children || [])
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
                const tableElement = handleTableNode(child)
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
                const inlineContent = handleInlineNode([child])
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
                appendInlineSegments(handleInlineNode([child] as any))
                continue
              } else if (isInlineTag(tag)) {
                appendInlineSegments(handleInlineNode([child] as any))
                continue
              }
              if (tag === 'p' || tag === 'div') {
                // p/div 视作块：先合并当前行内，再输出该段落（支持嵌套格式）
                flushRuns()
                const segs = handleInlineNode(child.children || [])
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
                blocks.push(handleTableNode(child))
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
        content.push(handleTableNode(node))
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
