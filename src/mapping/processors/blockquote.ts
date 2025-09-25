import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'

/**
 * Blockquote处理器 - 使用统一的节点处理接口
 * 避免重复实现节点类型判断逻辑
 */
export class BlockquoteProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    return node.type === 'element' && node.tagName?.toLowerCase() === 'blockquote'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    const inner: any[] = []

    // 使用统一的访问机制处理每个子节点
    for (const child of node.children || []) {
      if (child.type === 'text') {
        const val = String(child.value ?? '').trim()
        if (val) {
          inner.push({ text: val, style: 'blockquote', margin: [0, 2, 0, 2] })
        }
      } else if (child.type === 'element') {
        // 通过context.visitNode递归处理子节点，无需重复switch-case逻辑
        const childResults = await context.visitNode(child, context)
        
        // 为引用块内容添加blockquote样式和缩进
        const styledResults = childResults.map((item: any) => {
          if (typeof item === 'object' && item !== null) {
            return {
              ...item,
              margin: this.adjustMargin(item.margin),
              style: this.mergeStyles(item.style, 'blockquote'),
            }
          }
          return item
        })
        
        inner.push(...styledResults)
      }
    }

    if (inner.length === 0) {
      return null
    }

    // 使用table + stack结构支持复杂的块级元素
    return {
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
    }
  }

  private adjustMargin(existingMargin?: number[]): number[] {
    if (Array.isArray(existingMargin)) {
      return [existingMargin[0] + 8, existingMargin[1], existingMargin[2], existingMargin[3] + 2]
    }
    return [8, 2, 0, 2]
  }

  private mergeStyles(existingStyle: any, newStyle: string): any {
    if (Array.isArray(existingStyle)) {
      return [...existingStyle, newStyle]
    } else if (existingStyle) {
      return [existingStyle, newStyle]
    } else {
      return newStyle
    }
  }
}
