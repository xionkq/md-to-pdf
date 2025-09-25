/* HAST (HTML) → pdfmake 内容映射 */

import { HastNodeBase } from '../types'
import { ProcessorManager, createProcessContext } from './processor'

// 导入所有处理器
import { BlockquoteProcessor } from './processors/blockquote'
import { HeadingProcessor } from './processors/heading'
import { ParagraphProcessor } from './processors/paragraph'
import { ListProcessor } from './processors/list'
import { TableProcessor } from './processors/table'
import { ImageProcessor } from './processors/image'
import { CodeProcessor } from './processors/code'
import { BreakProcessor, HorizontalRuleProcessor } from './processors/misc'

export type PdfContent = any[]

export interface MapContext {
  imageResolver?: (src: string) => Promise<string>
}

/**
 * 使用统一的处理器架构
 */
export async function mapHastToPdfContent(tree: HastNodeBase, ctx: MapContext = {}): Promise<PdfContent> {
  const manager = new ProcessorManager()

  // 注册所有处理器
  manager.register(new HeadingProcessor())        // h1-h6
  manager.register(new ParagraphProcessor())      // p, div
  manager.register(new BlockquoteProcessor())     // blockquote
  manager.register(new ListProcessor())           // ul, ol
  manager.register(new TableProcessor())          // table
  manager.register(new ImageProcessor())          // img
  manager.register(new CodeProcessor())           // pre, code
  manager.register(new BreakProcessor())          // br
  manager.register(new HorizontalRuleProcessor()) // hr

  // 创建处理上下文
  const context = createProcessContext(manager, ctx.imageResolver)

  // 处理整个树
  const content = await manager.processNode(tree, context)
  console.log('fully refactored content', content)
  return content
}
