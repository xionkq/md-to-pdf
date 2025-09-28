import { describe, it, expect } from 'vitest'
import { 
  convertColor, 
  parseHexColor, 
  parseRgbColor, 
  parseHslColor, 
  parseColorName,
  isValidColor,
  getColorBrightness 
} from '../src/mapping/utils/colorConverter'

describe('colorConverter', () => {
  describe('convertColor', () => {
    it('should handle empty or invalid input', () => {
      expect(convertColor('')).toBeUndefined()
      expect(convertColor('   ')).toBeUndefined()
      expect(convertColor(null as any)).toBeUndefined()
      expect(convertColor(undefined as any)).toBeUndefined()
      expect(convertColor('transparent')).toBeUndefined()
      expect(convertColor('none')).toBeUndefined()
    })

    it('should convert hex colors', () => {
      expect(convertColor('#ff0000')).toBe('#FF0000')
      expect(convertColor('#f00')).toBe('#FF0000')
      expect(convertColor('#123456')).toBe('#123456')
      expect(convertColor('#abc')).toBe('#AABBCC')
    })

    it('should convert RGB colors', () => {
      expect(convertColor('rgb(255, 0, 0)')).toBe('#FF0000')
      expect(convertColor('rgb(0, 255, 0)')).toBe('#00FF00')
      expect(convertColor('rgb(0, 0, 255)')).toBe('#0000FF')
      expect(convertColor('rgba(255, 0, 0, 0.5)')).toBe('#FF0000')
    })

    it('should convert HSL colors', () => {
      expect(convertColor('hsl(0, 100%, 50%)')).toBe('#FF0000')
      expect(convertColor('hsl(120, 100%, 50%)')).toBe('#00FF00')
      expect(convertColor('hsl(240, 100%, 50%)')).toBe('#0000FF')
      expect(convertColor('hsla(0, 100%, 50%, 0.5)')).toBe('#FF0000')
    })

    it('should convert color names', () => {
      expect(convertColor('red')).toBe('#FF0000')
      expect(convertColor('green')).toBe('#008000')
      expect(convertColor('blue')).toBe('#0000FF')
      expect(convertColor('white')).toBe('#FFFFFF')
      expect(convertColor('black')).toBe('#000000')
    })

    it('should handle case insensitive input', () => {
      expect(convertColor('RED')).toBe('#FF0000')
      expect(convertColor('Blue')).toBe('#0000FF')
      expect(convertColor('#FF0000')).toBe('#FF0000')
      expect(convertColor('#ff0000')).toBe('#FF0000')
    })
  })

  describe('parseHexColor', () => {
    it('should parse valid hex colors', () => {
      expect(parseHexColor('#ff0000')).toBe('#FF0000')
      expect(parseHexColor('#f00')).toBe('#FF0000')
      expect(parseHexColor('#123456')).toBe('#123456')
      expect(parseHexColor('#abc')).toBe('#AABBCC')
      expect(parseHexColor('#AbC')).toBe('#AABBCC')
    })

    it('should reject invalid hex colors', () => {
      expect(parseHexColor('#')).toBeUndefined()
      expect(parseHexColor('#f')).toBeUndefined()
      expect(parseHexColor('#ff')).toBeUndefined()
      expect(parseHexColor('#ffff')).toBeUndefined()
      expect(parseHexColor('#fffff')).toBeUndefined()
      expect(parseHexColor('#fffffff')).toBeUndefined()
      expect(parseHexColor('#gggggg')).toBeUndefined()
      expect(parseHexColor('ff0000')).toBeUndefined() // 缺少#
    })
  })

  describe('parseRgbColor', () => {
    it('should parse valid RGB colors', () => {
      expect(parseRgbColor('rgb(255, 0, 0)')).toBe('#FF0000')
      expect(parseRgbColor('rgb(0, 255, 0)')).toBe('#00FF00')
      expect(parseRgbColor('rgb(0, 0, 255)')).toBe('#0000FF')
      expect(parseRgbColor('rgb(128, 128, 128)')).toBe('#808080')
      expect(parseRgbColor('rgb(255, 255, 255)')).toBe('#FFFFFF')
    })

    it('should parse RGBA colors (ignoring alpha)', () => {
      expect(parseRgbColor('rgba(255, 0, 0, 1)')).toBe('#FF0000')
      expect(parseRgbColor('rgba(255, 0, 0, 0.5)')).toBe('#FF0000')
      expect(parseRgbColor('rgba(255, 0, 0, 0)')).toBe('#FF0000')
    })

    it('should handle whitespace', () => {
      expect(parseRgbColor('rgb( 255 , 0 , 0 )')).toBe('#FF0000')
      expect(parseRgbColor('rgba( 255 , 0 , 0 , 0.5 )')).toBe('#FF0000')
    })

    it('should handle decimal values', () => {
      expect(parseRgbColor('rgb(255.5, 0.9, 0.1)')).toBe('#FF0000')
    })

    it('should reject invalid RGB colors', () => {
      expect(parseRgbColor('rgb(256, 0, 0)')).toBeUndefined() // 超出范围
      expect(parseRgbColor('rgb(-1, 0, 0)')).toBeUndefined() // 负数
      expect(parseRgbColor('rgb(255, 0)')).toBeUndefined() // 参数不足
      expect(parseRgbColor('rgb(255, 0, 0, 0, 0)')).toBeUndefined() // 参数过多
      expect(parseRgbColor('rgb(a, b, c)')).toBeUndefined() // 非数字
      expect(parseRgbColor('255, 0, 0')).toBeUndefined() // 缺少rgb()
    })
  })

  describe('parseHslColor', () => {
    it('should parse valid HSL colors', () => {
      expect(parseHslColor('hsl(0, 100%, 50%)')).toBe('#FF0000')
      expect(parseHslColor('hsl(120, 100%, 50%)')).toBe('#00FF00')
      expect(parseHslColor('hsl(240, 100%, 50%)')).toBe('#0000FF')
      expect(parseHslColor('hsl(0, 0%, 0%)')).toBe('#000000') // 黑色
      expect(parseHslColor('hsl(0, 0%, 100%)')).toBe('#FFFFFF') // 白色
    })

    it('should parse HSLA colors (ignoring alpha)', () => {
      expect(parseHslColor('hsla(0, 100%, 50%, 1)')).toBe('#FF0000')
      expect(parseHslColor('hsla(0, 100%, 50%, 0.5)')).toBe('#FF0000')
    })

    it('should handle hue wraparound', () => {
      expect(parseHslColor('hsl(360, 100%, 50%)')).toBe('#FF0000')
      expect(parseHslColor('hsl(720, 100%, 50%)')).toBe('#FF0000')
      expect(parseHslColor('hsl(-120, 100%, 50%)')).toBe('#00FF00')
    })

    it('should clamp saturation and lightness', () => {
      expect(parseHslColor('hsl(0, 150%, 50%)')).toBe('#FF0000') // 饱和度超过100%
      expect(parseHslColor('hsl(0, 100%, 150%)')).toBe('#FFFFFF') // 亮度超过100%
      expect(parseHslColor('hsl(0, -10%, 50%)')).toBe('#808080') // 负饱和度
    })

    it('should reject invalid HSL colors', () => {
      expect(parseHslColor('hsl(0, 100%)')).toBeUndefined() // 参数不足
      expect(parseHslColor('hsl(a, b%, c%)')).toBeUndefined() // 非数字
      expect(parseHslColor('0, 100%, 50%')).toBeUndefined() // 缺少hsl()
    })
  })

  describe('parseColorName', () => {
    it('should parse common color names', () => {
      expect(parseColorName('red')).toBe('#FF0000')
      expect(parseColorName('green')).toBe('#008000')
      expect(parseColorName('blue')).toBe('#0000FF')
      expect(parseColorName('white')).toBe('#FFFFFF')
      expect(parseColorName('black')).toBe('#000000')
      expect(parseColorName('yellow')).toBe('#FFFF00')
      expect(parseColorName('cyan')).toBe('#00FFFF')
      expect(parseColorName('magenta')).toBe('#FF00FF')
    })

    it('should handle case insensitive names', () => {
      expect(parseColorName('RED')).toBe('#FF0000')
      expect(parseColorName('Blue')).toBe('#0000FF')
      expect(parseColorName('GREEN')).toBe('#008000')
    })

    it('should handle extended color names', () => {
      expect(parseColorName('orange')).toBe('#FFA500')
      expect(parseColorName('pink')).toBe('#FFC0CB')
      expect(parseColorName('brown')).toBe('#A52A2A')
      expect(parseColorName('gold')).toBe('#FFD700')
      expect(parseColorName('silver')).toBe('#C0C0C0')
    })

    it('should return undefined for unknown color names', () => {
      expect(parseColorName('unknowncolor')).toBeUndefined()
      expect(parseColorName('notacolor')).toBeUndefined()
      expect(parseColorName('')).toBeUndefined()
    })
  })

  describe('isValidColor', () => {
    it('should return true for valid colors', () => {
      expect(isValidColor('#ff0000')).toBe(true)
      expect(isValidColor('red')).toBe(true)
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true)
      expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true)
    })

    it('should return false for invalid colors', () => {
      expect(isValidColor('invalid')).toBe(false)
      expect(isValidColor('#gggggg')).toBe(false)
      expect(isValidColor('rgb(300, 0, 0)')).toBe(false)
      expect(isValidColor('')).toBe(false)
      expect(isValidColor('transparent')).toBe(false)
    })
  })

  describe('getColorBrightness', () => {
    it('should calculate brightness correctly', () => {
      expect(getColorBrightness('#FFFFFF')).toBe(255) // 白色最亮
      expect(getColorBrightness('#000000')).toBe(0)   // 黑色最暗
      expect(getColorBrightness('#FF0000')).toBe(76)  // 红色
      expect(getColorBrightness('#00FF00')).toBe(150) // 绿色
      expect(getColorBrightness('#0000FF')).toBe(29)  // 蓝色
    })

    it('should handle lowercase hex colors', () => {
      expect(getColorBrightness('#ffffff')).toBe(255)
      expect(getColorBrightness('#ff0000')).toBe(76)
    })
  })
})
