import type { TDocumentDefinitions } from 'pdfmake/interfaces'
import type { MarkdownToPdfOptions } from '../index'
import { createDefaultStyles } from '../styles'

export function buildDocDefinition(content: any[], options: MarkdownToPdfOptions): TDocumentDefinitions {
  // 组合 pdfmake 文档定义：页面设置、内容与样式
  const styles = createDefaultStyles(options.theme)
  const doc: TDocumentDefinitions = {
    pageSize: (options.pageSize as any) ?? 'A4',
    pageMargins: options.pageMargins ?? [40, 60, 40, 60],
    pageOrientation: options.pageOrientation ?? 'portrait',
    content,
    styles,
  }

  // 页眉/页脚回调，允许调用方自定义页码等
  if (options.header) doc.header = options.header as any
  if (options.footer) doc.footer = options.footer as any
  return doc
}
