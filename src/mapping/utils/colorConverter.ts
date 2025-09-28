/**
 * CSS颜色格式转换工具
 * 将各种CSS颜色格式转换为pdfmake支持的格式
 */

/**
 * CSS标准颜色名称到十六进制的映射
 */
const CSS_COLOR_NAMES: Record<string, string> = {
  // 基本颜色
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  green: '#008000',
  blue: '#0000FF',
  yellow: '#FFFF00',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  
  // 常用颜色
  gray: '#808080',
  grey: '#808080',
  darkgray: '#A9A9A9',
  darkgrey: '#A9A9A9',
  lightgray: '#D3D3D3',
  lightgrey: '#D3D3D3',
  
  // 系统颜色
  maroon: '#800000',
  navy: '#000080',
  olive: '#808000',
  purple: '#800080',
  silver: '#C0C0C0',
  teal: '#008080',
  lime: '#00FF00',
  aqua: '#00FFFF',
  fuchsia: '#FF00FF',
  
  // 扩展颜色
  orange: '#FFA500',
  pink: '#FFC0CB',
  brown: '#A52A2A',
  gold: '#FFD700',
  violet: '#EE82EE',
  indigo: '#4B0082',
  
  // 深色变体
  darkred: '#8B0000',
  darkgreen: '#006400',
  darkblue: '#00008B',
  
  // 浅色变体
  lightblue: '#ADD8E6',
  lightgreen: '#90EE90',
  lightred: '#FFB6C1',
  
  // 透明
  transparent: 'transparent'
}

/**
 * 将CSS颜色值转换为pdfmake支持的格式
 * @param cssColor CSS颜色值（十六进制、RGB、颜色名等）
 * @returns pdfmake支持的颜色格式，失败时返回undefined
 */
export function convertColor(cssColor: string): string | undefined {
  if (!cssColor || typeof cssColor !== 'string') {
    return undefined
  }

  const color = cssColor.trim().toLowerCase()
  
  // 处理透明色
  if (color === 'transparent' || color === 'none') {
    return undefined
  }

  // 1. 十六进制颜色
  if (color.startsWith('#')) {
    return parseHexColor(color)
  }
  
  // 2. RGB/RGBA颜色
  if (color.startsWith('rgb')) {
    return parseRgbColor(color)
  }
  
  // 3. HSL颜色（基本支持）
  if (color.startsWith('hsl')) {
    return parseHslColor(color)
  }
  
  // 4. CSS颜色名称
  return parseColorName(color)
}

/**
 * 解析十六进制颜色
 * @param hex 十六进制颜色值，如 #ff0000 或 #f00
 * @returns 标准化的十六进制颜色值
 */
export function parseHexColor(hex: string): string | undefined {
  const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i
  const match = hex.match(HEX_COLOR_REGEX)
  
  if (!match) {
    return undefined
  }
  
  const colorValue = match[1]
  
  // 处理3位十六进制颜色（如 #f00 -> #ff0000）
  if (colorValue.length === 3) {
    return '#' + colorValue.split('').map(c => c + c).join('').toUpperCase()
  }
  
  // 6位十六进制颜色直接返回（转换为大写）
  return '#' + colorValue.toUpperCase()
}

/**
 * 解析RGB/RGBA颜色
 * @param rgb RGB颜色值，如 rgb(255, 0, 0) 或 rgba(255, 0, 0, 0.5)
 * @returns 十六进制颜色值（忽略alpha通道）
 */
export function parseRgbColor(rgb: string): string | undefined {
  // 匹配 rgb(r, g, b) 或 rgba(r, g, b, a)，支持小数和整数
  const RGB_REGEX = /rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*(?:,\s*[\d.]+)?\s*\)/i
  const match = rgb.match(RGB_REGEX)
  
  if (!match) {
    return undefined
  }
  
  let r = parseFloat(match[1])
  let g = parseFloat(match[2])
  let b = parseFloat(match[3])
  
  // 如果是NaN，返回undefined
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return undefined
  }
  
  // 将小数四舍五入到最接近的整数
  r = Math.round(r)
  g = Math.round(g)
  b = Math.round(b)
  
  // 验证RGB值范围
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return undefined
  }
  
  // 转换为十六进制
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
}

/**
 * 解析HSL颜色（基本支持，转换为RGB再转十六进制）
 * @param hsl HSL颜色值，如 hsl(0, 100%, 50%)
 * @returns 十六进制颜色值
 */
export function parseHslColor(hsl: string): string | undefined {
  const HSL_REGEX = /hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)%\s*,\s*(-?\d+(?:\.\d+)?)%\s*(?:,\s*[\d.]+)?\s*\)/i
  const match = hsl.match(HSL_REGEX)
  
  if (!match) {
    return undefined
  }
  
  let h = parseFloat(match[1])
  let s = parseFloat(match[2])
  let l = parseFloat(match[3])
  
  // 处理色调的负值和超过360度的情况
  h = h % 360
  if (h < 0) h += 360
  
  // 将饱和度和亮度限制在0-100%范围内，然后转换为0-1
  s = Math.min(100, Math.max(0, s)) / 100
  l = Math.min(100, Math.max(0, l)) / 100
  
  // HSL到RGB转换
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  
  let r = 0, g = 0, b = 0
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x
  }
  
  // 转换为0-255范围
  const red = Math.round((r + m) * 255)
  const green = Math.round((g + m) * 255)
  const blue = Math.round((b + m) * 255)
  
  return '#' + [red, green, blue].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('')
}

/**
 * 解析CSS颜色名称
 * @param name CSS颜色名称，如 red、blue等
 * @returns 对应的十六进制颜色值
 */
export function parseColorName(name: string): string | undefined {
  const lowerName = name.toLowerCase()
  return CSS_COLOR_NAMES[lowerName] || undefined
}

/**
 * 检查颜色值是否有效
 * @param color 颜色值
 * @returns 是否为有效颜色
 */
export function isValidColor(color: string): boolean {
  return convertColor(color) !== undefined
}

/**
 * 获取颜色的亮度值（用于判断文字颜色）
 * @param color 十六进制颜色值
 * @returns 亮度值（0-255）
 */
export function getColorBrightness(color: string): number {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)  
  const b = parseInt(hex.substr(4, 2), 16)
  
  // 使用感知亮度公式
  return Math.round((r * 299 + g * 587 + b * 114) / 1000)
}
