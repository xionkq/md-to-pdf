import { HastNodeBase } from '../types'

/**
 * 统一的节点处理上下文
 */
export interface ProcessContext {
  imageResolver?: (src: string) => Promise<string>
  visitNode: (node: HastNodeBase, ctx?: ProcessContext) => Promise<any[]>
  currentStyles?: string[]
}

/**
 * 节点处理器接口
 */
export interface NodeProcessor {
  canHandle(node: HastNodeBase): boolean
  process(node: HastNodeBase, context: ProcessContext): Promise<any>
}

/**
 * 处理器管理器
 * 负责分发节点到对应的处理器，提供统一的访问机制
 */
export class ProcessorManager {
  private processors: NodeProcessor[] = []

  register(processor: NodeProcessor) {
    this.processors.push(processor)
  }

  async processNode(node: HastNodeBase, context: ProcessContext): Promise<any[]> {
    const results: any[] = []

    if (node.type === 'root') {
      for (const child of node.children || []) {
        const childResults = await this.processNode(child, context)
        results.push(...childResults)
      }
      return results
    }

    if (node.type !== 'element') return results

    // 寻找合适的处理器
    const processor = this.processors.find(p => p.canHandle(node))
    if (processor) {
      const result = await processor.process(node, context)
      if (result !== undefined && result !== null) {
        if (Array.isArray(result)) {
          results.push(...result)
        } else {
          results.push(result)
        }
      }
    } else {
      // 默认处理：提取文本内容
      if (node.children && node.children.length) {
        const textContent = this.extractTextContent(node.children)
        if (textContent) {
          results.push({ text: textContent, style: 'p' })
        }
      }
    }

    return results
  }

  private extractTextContent(children: any[]): string {
    let acc = ''
    for (const ch of children || []) {
      if (ch.type === 'text') {
        acc += ch.value ?? ''
      } else if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'br') {
        acc += '\n'
      } else if (ch.children) {
        acc += this.extractTextContent(ch.children)
      }
    }
    return acc
  }
}

/**
 * 创建带有统一访问机制的上下文
 */
export function createProcessContext(
  manager: ProcessorManager, 
  imageResolver?: (src: string) => Promise<string>
): ProcessContext {
  const context: ProcessContext = {
    imageResolver,
    visitNode: async (node: HastNodeBase, ctx?: ProcessContext) => {
      const actualCtx = ctx || context
      return manager.processNode(node, actualCtx)
    }
  }
  return context
}
