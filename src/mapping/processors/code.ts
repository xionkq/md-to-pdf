import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'
import { textFromChildren } from '../utils'
import { createCodeBlockStyle } from '../../styles/github-borders'

/**
 * 代码处理器
 * 处理 pre 和 code 标签，支持块级代码和行内代码
 */
export class CodeProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    if (node.type !== 'element' || !node.tagName) return false
    const tag = node.tagName.toLowerCase()
    return tag === 'pre' || tag === 'code'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    const tag = node.tagName!.toLowerCase()
    const txt = textFromChildren(node.children || [])
    
    if (!txt.trim()) {
      // 空代码块
      return null
    }

    if (tag === 'pre') {
      // pre 标签总是块级代码
      return createCodeBlockStyle(txt)
    }

    if (tag === 'code') {
      // code 标签需要判断是否为块级
      const isBlock = this.isBlockCode(node)
      
      if (isBlock) {
        return createCodeBlockStyle(txt)
      } else {
        // 行内代码
        return { text: txt, style: 'code' }
      }
    }

    return null
  }

  /**
   * 判断 code 标签是否应该作为块级代码处理
   */
  private isBlockCode(node: any): boolean {
    // 如果包含换行符，认为是块级代码
    const hasNewline = (node.children || []).some((child: any) => 
      child.type === 'text' && (child.value || '').includes('\n')
    )
    
    if (hasNewline) return true

    // 如果父节点是 pre，也认为是块级代码
    // 注意：这个逻辑在实际处理中可能不会触发，因为通常 pre > code 结构会先被 pre 处理器捕获
    const parentIsPre = false // 这里暂时不实现父节点检查，因为我们的架构中每个节点独立处理
    
    return parentIsPre
  }
}
