import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'
import { createH1Border } from '../../styles/github-borders'
import { textFromChildren } from '../utils'

/**
 * 标题处理器 (H1-H6)
 */
export class HeadingProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    if (node.type !== 'element' || !node.tagName) return false
    const tag = node.tagName.toLowerCase()
    return ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any[]> {
    const level = Number((node.tagName || '').toLowerCase()[1])
    const txt = textFromChildren(node.children || [])
    
    const results: any[] = []
    
    // 添加标题内容
    results.push({ text: txt, style: `h${level}` })

    // GitHub 样式：H1 和 H2 添加底部边框
    if (level === 1 || level === 2) {
      results.push(createH1Border())
    }

    return results
  }
}
