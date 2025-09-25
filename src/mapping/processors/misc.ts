import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'
import { createHrBorder } from '../../styles/github-borders'

/**
 * 换行处理器 (BR)
 */
export class BreakProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    return node.type === 'element' && node.tagName?.toLowerCase() === 'br'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    return { text: ['\n'], style: 'p' }
  }
}

/**
 * 分割线处理器 (HR)
 */
export class HorizontalRuleProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    return node.type === 'element' && node.tagName?.toLowerCase() === 'hr'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    return createHrBorder()
  }
}
