import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'
import { handleInlineNode } from '../utils/inline'
import { isInlineCodeTag, isInlineTag, textFromChildren } from '../utils'
import { createCodeBlockStyle, createHrBorder } from '../../styles/github-borders'

/**
 * 列表处理器 (UL/OL)
 * 支持嵌套列表和复杂的列表项内容
 */
export class ListProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    if (node.type !== 'element' || !node.tagName) return false
    const tag = node.tagName.toLowerCase()
    return tag === 'ul' || tag === 'ol'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    const tag = node.tagName!.toLowerCase()
    const items: any[] = []

    // 处理每个 li 元素
    const listItems = (node.children || []).filter(
      (c: any) => c.type === 'element' && c.tagName?.toLowerCase() === 'li'
    )

    for (const li of listItems) {
      const itemContent = await this.processListItem(li, context)
      items.push(itemContent)
    }

    // 返回列表结构
    return tag === 'ol' 
      ? { ol: items, style: 'ol' } 
      : { ul: items, style: 'ul' }
  }

  /**
   * 处理单个列表项
   */
  private async processListItem(li: any, context: ProcessContext): Promise<any> {
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

    // 处理列表项的每个子节点
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
        
        // 处理行内元素
        if (tag === 'code' && isInlineCodeTag(child)) {
          appendInlineSegments(handleInlineNode([child] as any))
          continue
        } else if (isInlineTag(tag)) {
          appendInlineSegments(handleInlineNode([child] as any))
          continue
        }

        // 处理段落
        if (tag === 'p' || tag === 'div') {
          flushRuns()
          const segs = handleInlineNode(child.children || [])
          // 段落内部避免首尾空白和连续换行
          const cleanedSegs = segs.filter((seg) => {
            if (typeof seg === 'string') return seg.trim().length > 0
            return true
          })
          
          // 清理首尾空白
          this.cleanStringSegments(cleanedSegs)
          
          if (cleanedSegs.length) {
            blocks.push({ text: cleanedSegs, style: 'p', margin: [0, 2, 0, 2] })
          }
          continue
        }

        // 处理块级元素
        flushRuns()
        await this.handleBlockElement(child, blocks, context)
      }
    }
    
    flushRuns()
    
    // 优化列表项结构
    return this.optimizeListItemStructure(blocks)
  }

  /**
   * 处理块级元素
   */
  private async handleBlockElement(child: any, blocks: any[], context: ProcessContext) {
    const tag = (child.tagName || '').toLowerCase()
    
    switch (tag) {
      case 'ul':
      case 'ol': {
        // 嵌套列表
        const nestedResult = await this.process(child, context)
        blocks.push(nestedResult)
        break
      }
      case 'img': {
        // 图片 - 通过统一的处理机制
        const imgResults = await context.visitNode(child, context)
        blocks.push(...imgResults)
        break
      }
      case 'blockquote': {
        // 引用块
        const quoteResults = await context.visitNode(child, context)
        blocks.push(
          ...quoteResults.map((item: any) => ({
            ...item,
            margin: [8, 4, 0, 8],
          }))
        )
        break
      }
      case 'table': {
        // 表格 - 通过统一的处理机制
        const tableResults = await context.visitNode(child, context)
        blocks.push(...tableResults)
        break
      }
      case 'pre': {
        // 代码块
        const txt = textFromChildren(child.children || [])
        if (txt) {
          blocks.push(createCodeBlockStyle(txt))
        }
        break
      }
      case 'code': {
        // 代码 - 判断是否为块级
        const txt = textFromChildren(child.children || [])
        const isBlock = child.children?.some((c: any) => 
          c.type === 'text' && (c.value || '').includes('\n')
        )
        
        if (txt) {
          if (isBlock) {
            blocks.push(createCodeBlockStyle(txt))
          } else {
            blocks.push({ 
              text: txt, 
              style: 'code', 
              preserveLeadingSpaces: true, 
              margin: [0, 2, 0, 2] 
            })
          }
        }
        break
      }
      case 'hr': {
        blocks.push(createHrBorder())
        break
      }
      default: {
        // 其他块级元素通过统一处理机制
        const results = await context.visitNode(child, context)
        blocks.push(...results)
      }
    }
  }

  /**
   * 清理字符串片段的首尾空白
   */
  private cleanStringSegments(segments: any[]) {
    // 清理首尾空白（只对纯字符串）
    if (segments.length && typeof segments[0] === 'string') {
      segments[0] = segments[0].replace(/^[\n\s]+/, '').replace(/[\n\s]+$/, '')
      // 如果清理后为空，移除
      if (!segments[0]) {
        segments.shift()
      }
    }
    
    if (segments.length && typeof segments[segments.length - 1] === 'string') {
      const lastIdx = segments.length - 1
      segments[lastIdx] = segments[lastIdx].replace(/[\n\s]+$/, '')
      // 如果清理后为空，移除
      if (!segments[lastIdx]) {
        segments.pop()
      }
    }
  }

  /**
   * 优化列表项结构
   */
  private optimizeListItemStructure(blocks: any[]): any {
    if (blocks.length === 0) {
      // 空列表项，添加空文本
      return { text: '', style: 'p', margin: [0, 2, 0, 2] }
    } else if (blocks.length === 1) {
      return blocks[0]
    } else {
      return { stack: blocks }
    }
  }
}
