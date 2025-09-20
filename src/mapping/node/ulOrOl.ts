import { isInlineCodeTag, isInlineTag, textFromChildren } from '../utils'
import { handleInlineNode } from './inline'
import { handleImgNode } from './img'
import { handleTableNode } from './table'
import { createCodeBlockStyle, createHrBorder } from '../../styles/github-borders'

export async function handleUlOrOlNode(node: any, content: any[], recursion: (...p: any[]) => Promise<any>, ctx?: any) {
  const tag = (node.tagName || '').toLowerCase()

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
          const nested = await recursion({ type: 'root', children: [child] } as any, ctx)
          blocks.push(...nested)
        } else if (tag === 'img') {
          blocks.push(await handleImgNode(child, ctx.imageResolver))
        } else if (tag === 'blockquote') {
          // 在列表项中处理 blockquote，使用与主blockquote相同的逻辑
          const nestedQuote = await recursion({ type: 'root', children: [child] } as any, ctx)
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
}
