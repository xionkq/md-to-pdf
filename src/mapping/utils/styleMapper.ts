/**
 * 样式映射器
 * 将解析后的CSS样式转换为pdfmake支持的样式格式
 */

import { ParsedStyles, parseStyleAttribute } from './styleParser'
import { convertColor } from './colorConverter'

/**
 * pdfmake样式对象接口
 */
export interface PdfMakeStyleObject {
  // 颜色相关
  color?: string
  background?: string
  
  // 文本样式
  bold?: boolean
  italics?: boolean
  
  // 文本装饰
  decoration?: 'underline' | 'lineThrough'
  
  // 字体大小（可选）
  fontSize?: number
  
  // 其他可能的样式（预留）
  [key: string]: any
}

/**
 * 将解析后的CSS样式映射为pdfmake样式对象
 * @param parsedStyles 解析后的CSS样式
 * @returns pdfmake样式对象
 */
export function mapCssStyleToPdfMake(parsedStyles: ParsedStyles): PdfMakeStyleObject {
  const pdfStyle: PdfMakeStyleObject = {}

  // 处理文字颜色
  if (parsedStyles.color) {
    const convertedColor = convertColor(parsedStyles.color)
    if (convertedColor) {
      pdfStyle.color = convertedColor
    }
  }

  // 处理背景颜色
  if (parsedStyles.backgroundColor) {
    const convertedBgColor = convertColor(parsedStyles.backgroundColor)
    if (convertedBgColor) {
      pdfStyle.background = convertedBgColor
    }
  }

  // 处理字体粗细
  if (parsedStyles.fontWeight) {
    pdfStyle.bold = normalizeFontWeightToBool(parsedStyles.fontWeight)
  }

  // 处理字体样式（斜体）
  if (parsedStyles.fontStyle) {
    pdfStyle.italics = parsedStyles.fontStyle === 'italic' || parsedStyles.fontStyle === 'oblique'
  }

  // 处理文本装饰
  if (parsedStyles.textDecoration) {
    const decoration = mapTextDecoration(parsedStyles.textDecoration)
    if (decoration) {
      pdfStyle.decoration = decoration
    }
  }

  // 处理字体大小（可选功能）
  if (parsedStyles.fontSize) {
    const fontSize = parseFontSize(parsedStyles.fontSize)
    if (fontSize) {
      pdfStyle.fontSize = fontSize
    }
  }

  return pdfStyle
}

/**
 * 合并两个pdfmake样式对象
 * 新样式会覆盖基础样式中的相同属性
 * @param baseStyle 基础样式
 * @param newStyle 新样式
 * @returns 合并后的样式对象
 */
export function mergeStyles(baseStyle: PdfMakeStyleObject, newStyle: PdfMakeStyleObject): PdfMakeStyleObject {
  return {
    ...baseStyle,
    ...newStyle
  }
}

/**
 * 创建样式数组，用于pdfmake的样式引用
 * @param customStyle 自定义样式对象
 * @param baseStyles 基础样式名称数组
 * @returns 包含自定义样式的完整样式配置
 */
export function createStyleArray(customStyle: PdfMakeStyleObject, baseStyles: string[] = []): any {
  if (Object.keys(customStyle).length === 0) {
    return baseStyles.length === 1 ? baseStyles[0] : baseStyles
  }

  // 如果有自定义样式，需要返回包含自定义样式的对象
  const result: any = { ...customStyle }
  
  if (baseStyles.length > 0) {
    result.style = baseStyles.length === 1 ? baseStyles[0] : baseStyles
  }

  return result
}

/**
 * 检查样式对象是否为空
 * @param style 样式对象
 * @returns 是否为空样式
 */
export function isEmptyStyle(style: PdfMakeStyleObject): boolean {
  return Object.keys(style).length === 0
}

/**
 * 将CSS font-weight值转换为布尔值
 * @param fontWeight CSS font-weight值
 * @returns 是否为粗体
 */
function normalizeFontWeightToBool(fontWeight: string): boolean {
  if (fontWeight === 'bold') return true
  if (fontWeight === 'normal') return false
  
  // 处理数字值
  const numValue = parseInt(fontWeight)
  if (!isNaN(numValue)) {
    return numValue >= 600
  }
  
  return false
}

/**
 * 映射CSS text-decoration到pdfmake decoration
 * @param textDecoration CSS text-decoration值
 * @returns pdfmake decoration值
 */
function mapTextDecoration(textDecoration: string): 'underline' | 'lineThrough' | undefined {
  switch (textDecoration) {
    case 'underline':
      return 'underline'
    case 'line-through':
      return 'lineThrough'
    case 'none':
    default:
      return undefined
  }
}

/**
 * 解析CSS字体大小并转换为数值
 * @param fontSize CSS字体大小值
 * @returns 数值型字体大小（pt）
 */
function parseFontSize(fontSize: string): number | undefined {
  // 移除空白字符
  const size = fontSize.trim().toLowerCase()
  
  // 处理像素值
  if (size.endsWith('px')) {
    const pxValue = parseFloat(size.replace('px', ''))
    if (isNaN(pxValue) || pxValue <= 0) return undefined
    // 像素转点：1pt ≈ 1.33px，所以 px * 0.75 ≈ pt
    return Math.round(pxValue * 0.75)
  }
  
  // 处理点值
  if (size.endsWith('pt')) {
    const ptValue = parseFloat(size.replace('pt', ''))
    if (isNaN(ptValue) || ptValue <= 0) return undefined
    return Math.round(ptValue)
  }
  
  // 处理em值（假设基础字体为12pt）
  if (size.endsWith('em')) {
    const emValue = parseFloat(size.replace('em', ''))
    if (isNaN(emValue) || emValue <= 0) return undefined
    return Math.round(emValue * 12)
  }
  
  // 处理百分比（假设基础字体为12pt）
  if (size.endsWith('%')) {
    const percentValue = parseFloat(size.replace('%', ''))
    if (isNaN(percentValue) || percentValue <= 0) return undefined
    return Math.round((percentValue / 100) * 12)
  }
  
  // 处理纯数字（假设为pt）
  const numValue = parseFloat(size)
  if (!isNaN(numValue) && numValue > 0) {
    return Math.round(numValue)
  }
  
  return undefined
}

/**
 * 从HTML元素的properties中提取并解析样式
 * @param properties HTML元素的properties对象
 * @returns pdfmake样式对象
 */
export function extractStyleFromProperties(properties: any): PdfMakeStyleObject {
  if (!properties || !properties.style) {
    return {}
  }
  
  const parsedStyles = parseStyleAttribute(properties.style)
  return mapCssStyleToPdfMake(parsedStyles)
}

/**
 * 创建带样式的文本对象
 * @param text 文本内容
 * @param style pdfmake样式对象
 * @param baseStyleName 基础样式名称
 * @returns pdfmake文本对象
 */
export function createStyledTextObject(text: any, style: PdfMakeStyleObject, baseStyleName?: string): any {
  if (isEmptyStyle(style)) {
    // 没有自定义样式，直接返回基础格式
    return baseStyleName ? { text, style: baseStyleName } : text
  }
  
  // 有自定义样式
  const result: any = { text, ...style }
  
  if (baseStyleName) {
    result.style = baseStyleName
  }
  
  return result
}
