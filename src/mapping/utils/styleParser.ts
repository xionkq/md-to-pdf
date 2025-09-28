/**
 * CSS样式属性解析器
 * 用于解析HTML元素的style属性字符串
 */

export interface ParsedStyles {
  color?: string
  backgroundColor?: string
  fontWeight?: 'bold' | 'normal' | string
  fontStyle?: 'italic' | 'normal' | 'oblique'
  textDecoration?: 'underline' | 'line-through' | 'none'
  fontSize?: string
}

/**
 * 解析CSS样式属性字符串
 * @param styleAttr CSS样式字符串，如 "color: red; font-weight: bold;"
 * @returns 解析后的样式对象
 */
export function parseStyleAttribute(styleAttr: string): ParsedStyles {
  if (!styleAttr || typeof styleAttr !== 'string') {
    return {}
  }

  const styles: ParsedStyles = {}
  
  // 更智能的CSS解析，处理函数值（如rgba、rgb等）
  const properties = parseStyleProperties(styleAttr)
  
  for (const [property, value] of properties) {
    const parsedValue = parseStyleProperty(property, value)
    if (parsedValue !== undefined) {
      Object.assign(styles, parsedValue)
    }
  }

  return styles
}

/**
 * 智能解析CSS属性，处理包含括号和逗号的函数值
 */
function parseStyleProperties(styleAttr: string): [string, string][] {
  const properties: [string, string][] = []
  
  // 首先按分号分割，但需要考虑函数内的分号
  let current = ''
  let inFunction = 0
  
  for (let i = 0; i < styleAttr.length; i++) {
    const char = styleAttr[i]
    
    if (char === '(') {
      inFunction++
    } else if (char === ')') {
      inFunction--
    }
    
    if (char === ';' && inFunction === 0) {
      // 到了一个真正的分割点
      if (current.trim()) {
        const colonIndex = current.indexOf(':')
        if (colonIndex > 0) {
          const property = current.substring(0, colonIndex).trim().toLowerCase()
          const value = current.substring(colonIndex + 1).trim()
          if (property && value) {
            properties.push([property, value])
          }
        }
      }
      current = ''
    } else {
      current += char
    }
  }
  
  // 处理最后一个属性（可能没有分号结尾）
  if (current.trim()) {
    const colonIndex = current.indexOf(':')
    if (colonIndex > 0) {
      const property = current.substring(0, colonIndex).trim().toLowerCase()
      const value = current.substring(colonIndex + 1).trim()
      if (property && value) {
        properties.push([property, value])
      }
    }
  }
  
  return properties
}

/**
 * 解析单个CSS属性
 * @param property CSS属性名
 * @param value CSS属性值
 * @returns 解析后的属性对象
 */
function parseStyleProperty(property: string, value: string): Partial<ParsedStyles> | undefined {
  switch (property) {
    case 'color':
      return { color: value }
    
    case 'background-color':
    case 'background':
      // 简单处理background属性，仅提取颜色部分
      const colorValue = extractColorFromBackground(value)
      return colorValue ? { backgroundColor: colorValue } : undefined
    
    case 'font-weight':
      return { fontWeight: normalizeFontWeight(value) }
    
    case 'font-style':
      return { fontStyle: normalizeFontStyle(value) }
    
    case 'text-decoration':
      return { textDecoration: normalizeTextDecoration(value) }
    
    case 'font-size':
      return { fontSize: value }
    
    default:
      // 未知属性，忽略
      return undefined
  }
}

/**
 * 从background属性中提取颜色值
 * 处理如 "yellow", "url(...) red", "#ff0000" 等情况
 */
function extractColorFromBackground(value: string): string | undefined {
  // 移除url()部分
  const withoutUrl = value.replace(/url\([^)]*\)/g, '').trim()
  
  // 检查是否包含颜色值
  const colorPart = withoutUrl.split(/\s+/).find(part => 
    part.startsWith('#') || 
    part.startsWith('rgb') || 
    part.startsWith('hsl') ||
    isValidColorName(part)
  )
  
  return colorPart || (withoutUrl && withoutUrl !== 'transparent' ? withoutUrl : undefined)
}

/**
 * 标准化font-weight值
 */
function normalizeFontWeight(value: string): 'bold' | 'normal' | string {
  const lowerValue = value.toLowerCase()
  switch (lowerValue) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return 'bold'
    case 'normal':
    case '400':
      return 'normal'
    case 'lighter':
    case '100':
    case '200':
    case '300':
      return 'normal'
    case 'bolder':
    case '500':
    case '600':
      return 'bold'
    default:
      // 对于数字值，简单判断
      const numValue = parseInt(value)
      if (!isNaN(numValue)) {
        return numValue >= 600 ? 'bold' : 'normal'
      }
      return value
  }
}

/**
 * 标准化font-style值
 */
function normalizeFontStyle(value: string): 'italic' | 'normal' | 'oblique' {
  const lowerValue = value.toLowerCase()
  switch (lowerValue) {
    case 'italic':
      return 'italic'
    case 'oblique':
      return 'oblique'
    case 'normal':
    default:
      return 'normal'
  }
}

/**
 * 标准化text-decoration值
 */
function normalizeTextDecoration(value: string): 'underline' | 'line-through' | 'none' {
  const lowerValue = value.toLowerCase()
  if (lowerValue.includes('underline')) {
    return 'underline'
  } else if (lowerValue.includes('line-through')) {
    return 'line-through'
  } else {
    return 'none'
  }
}

/**
 * 检查是否为有效的CSS颜色名称
 */
function isValidColorName(value: string): boolean {
  const cssColorNames = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta',
    'gray', 'grey', 'darkgray', 'darkgrey', 'lightgray', 'lightgrey',
    'maroon', 'navy', 'olive', 'purple', 'silver', 'teal', 'lime', 'aqua',
    'fuchsia', 'orange', 'pink', 'brown', 'gold', 'violet', 'indigo',
    'darkred', 'darkgreen', 'darkblue', 'lightblue', 'lightgreen', 'lightred'
  ]
  return cssColorNames.includes(value.toLowerCase())
}
