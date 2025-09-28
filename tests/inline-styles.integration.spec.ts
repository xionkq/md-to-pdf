import { describe, it, expect, beforeEach } from 'vitest'
import { markdownToPdf } from '../src/index'
import { mapHastToPdfContent } from '../src/mapping/hast'
import { parseMarkdown } from '../src/core/parseMarkdown'

// Mock pdfMake for testing
const mockPdfMake = {
  vfs: {},
  createPdf: () => ({
    getBuffer: (callback: (buffer: ArrayBuffer) => void) => {
      const buffer = new ArrayBuffer(100)
      callback(buffer)
    }
  })
}

describe('inline styles integration', () => {
  // Setup browser-like environment for tests
  beforeEach(() => {
    if (typeof window === 'undefined') {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {
        createElement: () => ({ click: () => {}, remove: () => {}, style: {} }),
        body: { appendChild: () => {} },
      } as any
      ;(globalThis as any).URL = { 
        createObjectURL: () => 'blob://x', 
        revokeObjectURL: () => {} 
      } as any
    }
  })

  describe('basic inline styles', () => {
    it('should process color styles in span elements', async () => {
      const markdown = 'This is <span style="color: red;">red text</span> in a paragraph.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      // 应该包含带颜色的文本对象
      expect(content).toHaveLength(1)
      expect(content[0]).toHaveProperty('text')
      expect(content[0].text).toBeInstanceOf(Array)
      
      // 检查红色文本是否正确设置
      const textArray = content[0].text
      const redTextObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'red text' && item.color === '#FF0000'
      )
      expect(redTextObj).toBeDefined()
    })

    it('should process background color styles', async () => {
      const markdown = 'Text with <span style="background-color: yellow;">yellow background</span>.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      expect(content).toHaveLength(1)
      const textArray = content[0].text
      const yellowBgObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'yellow background' && item.background === '#FFFF00'
      )
      expect(yellowBgObj).toBeDefined()
    })

    it('should process font-weight styles', async () => {
      const markdown = 'This is <span style="font-weight: bold;">bold text</span>.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const boldObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'bold text' && item.bold === true
      )
      expect(boldObj).toBeDefined()
    })

    it('should process font-style italic', async () => {
      const markdown = 'This is <span style="font-style: italic;">italic text</span>.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const italicObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'italic text' && item.italics === true
      )
      expect(italicObj).toBeDefined()
    })

    it('should process text-decoration underline', async () => {
      const markdown = 'This is <span style="text-decoration: underline;">underlined text</span>.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const underlineObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'underlined text' && item.decoration === 'underline'
      )
      expect(underlineObj).toBeDefined()
    })

    it('should process multiple style properties', async () => {
      const markdown = 'Complex <span style="color: red; font-weight: bold; background-color: yellow;">styled text</span>.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const styledObj = textArray.find((item: any) => 
        typeof item === 'object' && 
        item.text === 'styled text' && 
        item.color === '#FF0000' &&
        item.bold === true &&
        item.background === '#FFFF00'
      )
      expect(styledObj).toBeDefined()
    })
  })

  describe('div and p element styles', () => {
    it('should apply styles to div elements', async () => {
      const markdown = '<div style="color: blue;">This is a blue div</div>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      expect(content).toHaveLength(1)
      expect(content[0]).toHaveProperty('color', '#0000FF')
      expect(content[0].style).toBe('p')
    })

    it('should apply styles to p elements', async () => {
      const markdown = '<p style="background-color: lightgray; color: darkblue;">Styled paragraph</p>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      expect(content).toHaveLength(1)
      expect(content[0]).toHaveProperty('background', '#D3D3D3')
      expect(content[0]).toHaveProperty('color', '#00008B')
    })
  })

  describe('nested styles', () => {
    it('should handle nested inline elements with styles', async () => {
      const markdown = '<div style="color: blue;">Blue text with <span style="color: red;">red nested text</span> and more blue.</div>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      expect(content).toHaveLength(1)
      
      // 整个div应该是蓝色
      expect(content[0]).toHaveProperty('color', '#0000FF')
      
      // 检查嵌套的红色文本
      const textArray = content[0].text
      const redNestedObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'red nested text' && item.color === '#FF0000'
      )
      expect(redNestedObj).toBeDefined()
    })

    it('should handle multiple nested styles', async () => {
      const markdown = '<div style="background-color: lightblue;">Light blue background with <strong style="color: red;">red bold</strong> and <em style="color: green;">green italic</em></div>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      
      // 检查红色粗体
      const redBoldObj = textArray.find((item: any) => 
        typeof item === 'object' && 
        item.text === 'red bold' && 
        item.color === '#FF0000'
      )
      expect(redBoldObj).toBeDefined()
      expect(redBoldObj.style).toContain('b') // bold style
      
      // 检查绿色斜体
      const greenItalicObj = textArray.find((item: any) => 
        typeof item === 'object' && 
        item.text === 'green italic' && 
        item.color === '#008000' &&
        item.italics === true
      )
      expect(greenItalicObj).toBeDefined()
    })
  })

  describe('color format support', () => {
    it('should support hex color formats', async () => {
      const markdown = '<span style="color: #ff6600;">Hex color</span>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const hexColorObj = textArray.find((item: any) => 
        typeof item === 'object' && item.color === '#FF6600'
      )
      expect(hexColorObj).toBeDefined()
    })

    it('should support RGB color formats', async () => {
      const markdown = '<span style="color: rgb(255, 102, 0);">RGB color</span>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const rgbColorObj = textArray.find((item: any) => 
        typeof item === 'object' && item.color === '#FF6600'
      )
      expect(rgbColorObj).toBeDefined()
    })

    it('should support named colors', async () => {
      const markdown = '<span style="color: orange;">Named color</span>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      const textArray = content[0].text
      const namedColorObj = textArray.find((item: any) => 
        typeof item === 'object' && item.color === '#FFA500'
      )
      expect(namedColorObj).toBeDefined()
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle invalid CSS properties gracefully', async () => {
      const markdown = '<span style="invalid-property: value; color: red;">Text with invalid CSS</span>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      // 应该仍然处理有效的color属性
      const textArray = content[0].text
      const validColorObj = textArray.find((item: any) => 
        typeof item === 'object' && item.color === '#FF0000'
      )
      expect(validColorObj).toBeDefined()
    })

    it('should handle invalid color values gracefully', async () => {
      const markdown = '<span style="color: invalidcolor;">Text with invalid color</span>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      // 无效颜色应该被忽略，但文本仍应存在
      const textArray = content[0].text
      expect(textArray.some((item: any) => 
        typeof item === 'string' ? item.includes('Text with invalid color') :
        item.text === 'Text with invalid color'
      )).toBe(true)
    })

    it('should handle empty style attributes', async () => {
      const markdown = '<span style="">Text with empty style</span>'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      // 应该正常处理文本
      expect(content).toHaveLength(1)
      expect(content[0].text.some((item: any) => 
        typeof item === 'string' ? item.includes('Text with empty style') :
        item.text === 'Text with empty style'
      )).toBe(true)
    })

    it('should maintain backward compatibility with non-styled elements', async () => {
      const markdown = 'Regular text with **bold** and *italic* formatting.'
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      // 应该正常处理传统的Markdown格式
      expect(content).toHaveLength(1)
      const textArray = content[0].text
      
      // 检查粗体
      const boldObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'bold'
      )
      expect(boldObj).toBeDefined()
      expect(boldObj.style).toContain('b')
      
      // 检查斜体
      const italicObj = textArray.find((item: any) => 
        typeof item === 'object' && item.text === 'italic' && item.italics === true
      )
      expect(italicObj).toBeDefined()
    })
  })

  describe('end-to-end PDF generation', () => {
    it('should process complex styled document without errors', async () => {
      const markdown = `
# Styled Document

This document contains <span style="color: red;">red text</span> and 
<span style="background-color: yellow; font-weight: bold;">yellow background with bold text</span>.

<div style="color: blue;">
This is a blue div with <span style="color: green;">green nested text</span>.
</div>
      `
      
      const tree = await parseMarkdown(markdown)
      const content = await mapHastToPdfContent(tree)
      
      // 验证处理结果的结构
      expect(content).toHaveLength(4) // 标题 + 分隔线 + 段落 + div
      
      // 验证蓝色div被正确处理
      const blueDiv = content.find((item: any) => item.color === '#0000FF')
      expect(blueDiv).toBeDefined()
      expect(blueDiv.style).toBe('p')
    })
  })
})
