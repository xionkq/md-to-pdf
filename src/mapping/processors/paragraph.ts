import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'
import { handleInlineNode } from '../utils/inline'
import { handleSvgNode } from '../utils/svg'
import { isInlineTag } from '../utils'
import { extractStyleFromProperties, PdfMakeStyleObject, isEmptyStyle } from '../utils/styleMapper'

/**
 * 段落和Div处理器
 * 统一处理p和div标签，支持递归处理块级元素
 */
export class ParagraphProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    if (node.type !== 'element' || !node.tagName) return false
    const tag = node.tagName.toLowerCase()
    return tag === 'p' || tag === 'div'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any[]> {
    const children = node.children || []
    const results: any[] = []
    
    // 提取当前节点的样式信息
    const nodeStyle = extractStyleFromProperties(node.properties)
    const hasCustomStyle = !isEmptyStyle(nodeStyle)
    
    // 检查是否包含需要特殊处理的元素
    const hasSpecialElements = children.some((c: any) => 
      c.type === 'element' && (
        c.tagName?.toLowerCase() === 'img' || 
        c.tagName?.toLowerCase() === 'svg' ||
        // 块级元素
        ['ul', 'ol', 'blockquote', 'table', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre'].includes(c.tagName?.toLowerCase())
      )
    )

    if (hasSpecialElements) {
      let runs: any[] = []
      const flush = () => {
        if (runs.length) {
          const filteredRuns = runs.filter((r) => typeof r !== 'string' || r.trim().length > 0)
          if (filteredRuns.length) {
            const textResult: any = { text: filteredRuns, style: 'p' }
            // 应用自定义样式到文本对象
            if (hasCustomStyle) {
              Object.assign(textResult, nodeStyle)
            }
            results.push(textResult)
          }
          runs = []
        }
      }

      for (const ch of children) {
        if (ch.type === 'element') {
          const tag = ch.tagName?.toLowerCase()
          
          if (tag === 'img') {
            flush()
            // 使用统一的处理机制处理图片
            const imgResults = await context.visitNode(ch, context)
            results.push(...imgResults)
          } else if (tag === 'svg') {
            flush()
            results.push({ svg: handleSvgNode(ch) })
          } else if (isInlineTag(tag) || tag === 'code') {
            // 行内元素继续累积
            runs.push(...handleInlineNode([ch] as any))
          } else {
            // 块级元素：先flush当前内容，然后递归处理
            flush()
            const blockResults = await context.visitNode(ch, context)
            results.push(...blockResults)
          }
        } else if (ch.type === 'text') {
          runs.push(ch.value || '')
        }
      }
      flush()
    } else {
      // 只有行内内容的情况
      const inlineContent = handleInlineNode(children)
      const filteredContent = inlineContent.filter((c) => typeof c !== 'string' || c.trim().length > 0)
      if (filteredContent.length) {
        const textResult: any = { text: filteredContent, style: 'p' }
        // 应用自定义样式到文本对象
        if (hasCustomStyle) {
          Object.assign(textResult, nodeStyle)
        }
        results.push(textResult)
      }
    }

    return results
  }
}
