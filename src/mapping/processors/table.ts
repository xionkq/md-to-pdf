import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'
import { handleInlineNode } from '../utils/inline'

/**
 * 表格处理器
 * 处理HTML表格并转换为pdfmake格式，支持复杂的表格内容
 */
export class TableProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    return node.type === 'element' && node.tagName?.toLowerCase() === 'table'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    console.log('TableProcessor processing node', node)
    
    const rows: any[] = []
    
    // 获取所有表格行
    const trNodes = this.extractTableRows(node)
    
    for (const tr of trNodes) {
      const cells: any[] = []
      
      // 处理每个单元格
      const cellNodes = (tr.children || []).filter((c: any) => c.type === 'element')
      
      for (const cell of cellNodes) {
        const cellContent = await this.processCellContent(cell, context)
        cells.push(cellContent)
      }
      
      if (cells.length) {
        rows.push(cells)
      }
    }

    return {
      table: { body: rows },
      layout: 'tableLayout',
      style: 'table',
    }
  }

  /**
   * 提取表格中的所有行
   */
  private extractTableRows(node: any): any[] {
    const sections = (node.children || []).filter(
      (c: any) => c.type === 'element' && (c.tagName === 'thead' || c.tagName === 'tbody')
    )
    
    // 如果有thead/tbody结构，从中提取tr
    if (sections.length) {
      return sections.flatMap((s: any) => 
        (s.children || []).filter((x: any) => x.type === 'element' && x.tagName === 'tr')
      )
    }
    
    // 否则直接从table下获取tr
    return (node.children || []).filter((x: any) => x.type === 'element' && x.tagName === 'tr')
  }

  /**
   * 处理单元格内容
   */
  private async processCellContent(cell: any, context: ProcessContext): Promise<any> {
    const isTh = cell.tagName === 'th'
    
    // 检查是否包含复杂的块级元素
    const hasBlockElements = this.hasBlockElements(cell)
    
    let cellContent: any
    
    if (hasBlockElements) {
      cellContent = await this.processComplexCellContent(cell, context)
    } else {
      cellContent = this.processSimpleCellContent(cell)
    }

    // 设置样式
    cellContent.style = isTh ? 'th' : 'td'

    // 处理对齐信息
    this.applyAlignment(cellContent, cell)

    return cellContent
  }

  /**
   * 检查是否包含块级元素
   */
  private hasBlockElements(cell: any): boolean {
    return (cell.children || []).some(
      (c: any) => c.type === 'element' && 
        ['ul', 'ol', 'p', 'div', 'blockquote', 'pre', 'table', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
          c.tagName?.toLowerCase()
        )
    )
  }

  /**
   * 处理包含复杂块级元素的单元格
   */
  private async processComplexCellContent(cell: any, context: ProcessContext): Promise<any> {
    const parts: any[] = []
    
    for (const child of cell.children || []) {
      if (child.type === 'element') {
        const tag = child.tagName?.toLowerCase()
        
        if (tag === 'ul' || tag === 'ol') {
          // 处理列表：将列表项转换为简单的文本表示
          const listText = this.convertListToText(child)
          if (listText) parts.push(listText)
          
        } else if (tag === 'p' || tag === 'div') {
          // 处理段落
          const inlineContent = handleInlineNode(child.children || [])
          if (inlineContent.length > 0) {
            this.addContentToParts(parts, inlineContent)
          }
          
        } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag || '')) {
          // 处理标题
          const inlineContent = handleInlineNode(child.children || [])
          if (inlineContent.length > 0) {
            // 标题在表格中以粗体显示
            const boldContent = inlineContent.map(item => 
              typeof item === 'string' ? { text: item, bold: true } : { ...item, bold: true }
            )
            this.addContentToParts(parts, boldContent)
          }
          
        } else if (tag === 'blockquote') {
          // 处理引用
          const inlineContent = handleInlineNode(child.children || [])
          if (inlineContent.length > 0) {
            // 引用在表格中以斜体显示
            const italicContent = inlineContent.map(item => 
              typeof item === 'string' ? { text: item, italics: true } : { ...item, italics: true }
            )
            this.addContentToParts(parts, italicContent)
          }
          
        } else if (tag === 'pre' || tag === 'code') {
          // 处理代码
          const codeText = this.extractTextFromNode(child)
          if (codeText) {
            parts.push({ text: codeText, style: 'code' })
          }
          
        } else {
          // 其他元素使用行内处理
          const inlineContent = handleInlineNode([child])
          if (inlineContent.length > 0) {
            this.addContentToParts(parts, inlineContent)
          }
        }
      } else if (child.type === 'text') {
        const txt = String(child.value || '').trim()
        if (txt) parts.push(txt)
      }
    }

    return this.buildCellContentFromParts(parts)
  }

  /**
   * 处理简单行内内容的单元格
   */
  private processSimpleCellContent(cell: any): any {
    const inlineContent = handleInlineNode(cell.children || [])
    
    // 清理空内容
    const cleanedContent = inlineContent.filter((item) => {
      if (typeof item === 'string') {
        return item.trim().length > 0
      }
      return true
    })

    // 清理首尾空白字符串
    this.cleanupStringContent(cleanedContent)

    return { text: cleanedContent.length > 0 ? cleanedContent : '' }
  }

  /**
   * 将列表转换为文本表示
   */
  private convertListToText(listNode: any): string {
    const listItems = (listNode.children || [])
      .filter((li: any) => li.type === 'element' && li.tagName?.toLowerCase() === 'li')
      .map((li: any) => {
        const itemContent = handleInlineNode(li.children || [])
        const itemText = this.flattenContentToText(itemContent)
        return '• ' + itemText
      })
      .filter(item => item.trim() !== '• ')
      .join('\n')
    
    return listItems
  }

  /**
   * 将内容扁平化为文本
   */
  private flattenContentToText(content: any[]): string {
    if (!Array.isArray(content)) return String(content || '')
    
    return content
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && item.text) {
          return Array.isArray(item.text) ? this.flattenContentToText(item.text) : String(item.text)
        }
        return ''
      })
      .join('')
      .trim()
  }

  /**
   * 从节点中提取纯文本
   */
  private extractTextFromNode(node: any): string {
    if (node.type === 'text') {
      return String(node.value || '')
    }
    
    if (node.type === 'element' && node.children) {
      return node.children
        .map((child: any) => this.extractTextFromNode(child))
        .join('')
    }
    
    return ''
  }

  /**
   * 向parts数组添加内容
   */
  private addContentToParts(parts: any[], content: any[]): void {
    const hasFormat = content.some((item) => typeof item !== 'string')
    
    if (hasFormat) {
      parts.push(content)
    } else {
      const text = content.join('').trim()
      if (text) parts.push(text)
    }
  }

  /**
   * 从parts构建单元格内容
   */
  private buildCellContentFromParts(parts: any[]): any {
    if (parts.length === 0) {
      return { text: '' }
    } else if (parts.length === 1 && typeof parts[0] === 'string') {
      return { text: parts[0] }
    } else {
      // 有多个部分或包含格式，需要特殊处理
      const flatParts: any[] = []
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) flatParts.push('\n') // 段落之间换行
        if (Array.isArray(parts[i])) {
          flatParts.push(...parts[i])
        } else {
          flatParts.push(parts[i])
        }
      }
      return { text: flatParts }
    }
  }

  /**
   * 清理字符串内容的首尾空白
   */
  private cleanupStringContent(content: any[]): void {
    while (content.length > 0 && typeof content[0] === 'string' && !content[0].trim()) {
      content.shift()
    }
    while (
      content.length > 0 &&
      typeof content[content.length - 1] === 'string' &&
      !content[content.length - 1].trim()
    ) {
      content.pop()
    }
  }

  /**
   * 应用对齐样式
   */
  private applyAlignment(cellContent: any, cell: any): void {
    const alignment = cell.properties?.align as string
    if (alignment === 'center' || alignment === 'right') {
      cellContent.alignment = alignment
    }
  }
}
