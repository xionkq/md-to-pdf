/* HAST (HTML) → pdfmake 内容映射（基础版，GitHub 样式对齐） */

import { createCodeBlockStyle, createHrBorder } from '../styles/github-borders'
import { HastNodeBase } from '../types'
import { handleH1ToH6Node } from './node/h1ToH6'
import { handleTableNode } from './node/table'
import { textFromChildren } from './utils'
import { handleImgNode } from './node/img'
import { handleDivNode } from './node/div'
import { handleUlOrOlNode } from './node/ulOrOl'
import { handleBlockquoteNode } from './node/blockquote'

export type PdfContent = any[]

export interface MapContext {
  imageResolver?: (src: string) => Promise<string>
}

export async function mapHastToPdfContent(tree: HastNodeBase, ctx: MapContext = {}): Promise<PdfContent> {
  const content: PdfContent = []

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
        await handleDivNode(node, content, ctx.imageResolver)
        break
      }
      case 'br':
        content.push({ text: ['\n'], style: 'p' })
        break
      case 'hr':
        content.push(createHrBorder())
        break
      case 'blockquote': {
        await handleBlockquoteNode(node, content, mapHastToPdfContent, ctx)
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
        await handleUlOrOlNode(node, content, mapHastToPdfContent, ctx)
        break
      }
      case 'table': {
        content.push(handleTableNode(node))
        break
      }
      case 'img': {
        content.push(await handleImgNode(node, ctx.imageResolver))
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
