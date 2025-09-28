import { describe, it, expect } from 'vitest'
import { 
  mapCssStyleToPdfMake,
  mergeStyles,
  createStyleArray,
  isEmptyStyle,
  extractStyleFromProperties,
  createStyledTextObject,
  PdfMakeStyleObject
} from '../src/mapping/utils/styleMapper'
import { ParsedStyles } from '../src/mapping/utils/styleParser'

describe('styleMapper', () => {
  describe('mapCssStyleToPdfMake', () => {
    it('should handle empty styles', () => {
      const result = mapCssStyleToPdfMake({})
      expect(result).toEqual({})
    })

    it('should map color properties', () => {
      const parsedStyles: ParsedStyles = {
        color: 'red',
        backgroundColor: '#00ff00'
      }
      const result = mapCssStyleToPdfMake(parsedStyles)
      
      expect(result.color).toBe('#FF0000')
      expect(result.background).toBe('#00FF00')
    })

    it('should map font-weight to bold', () => {
      expect(mapCssStyleToPdfMake({ fontWeight: 'bold' }).bold).toBe(true)
      expect(mapCssStyleToPdfMake({ fontWeight: 'normal' }).bold).toBe(false)
      expect(mapCssStyleToPdfMake({ fontWeight: '700' }).bold).toBe(true)
      expect(mapCssStyleToPdfMake({ fontWeight: '400' }).bold).toBe(false)
    })

    it('should map font-style to italics', () => {
      expect(mapCssStyleToPdfMake({ fontStyle: 'italic' }).italics).toBe(true)
      expect(mapCssStyleToPdfMake({ fontStyle: 'oblique' }).italics).toBe(true)
      expect(mapCssStyleToPdfMake({ fontStyle: 'normal' }).italics).toBe(false)
    })

    it('should map text-decoration', () => {
      expect(mapCssStyleToPdfMake({ textDecoration: 'underline' }).decoration).toBe('underline')
      expect(mapCssStyleToPdfMake({ textDecoration: 'line-through' }).decoration).toBe('lineThrough')
      expect(mapCssStyleToPdfMake({ textDecoration: 'none' }).decoration).toBeUndefined()
    })

    it('should map font-size', () => {
      expect(mapCssStyleToPdfMake({ fontSize: '12px' }).fontSize).toBe(9) // 12px * 0.75
      expect(mapCssStyleToPdfMake({ fontSize: '14pt' }).fontSize).toBe(14)
      expect(mapCssStyleToPdfMake({ fontSize: '1.5em' }).fontSize).toBe(18) // 1.5 * 12
      expect(mapCssStyleToPdfMake({ fontSize: '120%' }).fontSize).toBe(14) // 1.2 * 12
    })

    it('should handle invalid color values gracefully', () => {
      const parsedStyles: ParsedStyles = {
        color: 'invalidcolor',
        backgroundColor: 'notacolor'
      }
      const result = mapCssStyleToPdfMake(parsedStyles)
      
      expect(result.color).toBeUndefined()
      expect(result.background).toBeUndefined()
    })

    it('should map complex style combinations', () => {
      const parsedStyles: ParsedStyles = {
        color: '#ff0000',
        backgroundColor: 'rgba(0, 255, 0, 0.5)',
        fontWeight: 'bold',
        fontStyle: 'italic',
        textDecoration: 'underline',
        fontSize: '16px'
      }
      const result = mapCssStyleToPdfMake(parsedStyles)
      
      expect(result.color).toBe('#FF0000')
      expect(result.background).toBe('#00FF00')
      expect(result.bold).toBe(true)
      expect(result.italics).toBe(true)
      expect(result.decoration).toBe('underline')
      expect(result.fontSize).toBe(12) // 16px * 0.75
    })
  })

  describe('mergeStyles', () => {
    it('should merge two empty styles', () => {
      const result = mergeStyles({}, {})
      expect(result).toEqual({})
    })

    it('should merge non-overlapping styles', () => {
      const base: PdfMakeStyleObject = { color: '#ff0000' }
      const add: PdfMakeStyleObject = { background: '#00ff00' }
      const result = mergeStyles(base, add)
      
      expect(result).toEqual({
        color: '#ff0000',
        background: '#00ff00'
      })
    })

    it('should let new styles override base styles', () => {
      const base: PdfMakeStyleObject = { color: '#ff0000', bold: false }
      const add: PdfMakeStyleObject = { color: '#00ff00', italics: true }
      const result = mergeStyles(base, add)
      
      expect(result).toEqual({
        color: '#00ff00', // 被覆盖
        bold: false,
        italics: true
      })
    })

    it('should preserve base styles when new styles are empty', () => {
      const base: PdfMakeStyleObject = { color: '#ff0000', bold: true }
      const result = mergeStyles(base, {})
      
      expect(result).toEqual(base)
    })
  })

  describe('createStyleArray', () => {
    it('should return base styles when custom style is empty', () => {
      expect(createStyleArray({}, ['p'])).toBe('p')
      expect(createStyleArray({}, ['p', 'bold'])).toEqual(['p', 'bold'])
      expect(createStyleArray({}, [])).toEqual([])
    })

    it('should return custom style when base styles is empty', () => {
      const customStyle = { color: '#ff0000' }
      const result = createStyleArray(customStyle, [])
      
      expect(result).toEqual({ color: '#ff0000' })
    })

    it('should merge custom style with base styles', () => {
      const customStyle = { color: '#ff0000', bold: true }
      const result = createStyleArray(customStyle, ['p'])
      
      expect(result).toEqual({
        color: '#ff0000',
        bold: true,
        style: 'p'
      })
    })

    it('should handle multiple base styles', () => {
      const customStyle = { color: '#ff0000' }
      const result = createStyleArray(customStyle, ['p', 'large'])
      
      expect(result).toEqual({
        color: '#ff0000',
        style: ['p', 'large']
      })
    })
  })

  describe('isEmptyStyle', () => {
    it('should return true for empty objects', () => {
      expect(isEmptyStyle({})).toBe(true)
    })

    it('should return false for non-empty objects', () => {
      expect(isEmptyStyle({ color: '#ff0000' })).toBe(false)
      expect(isEmptyStyle({ bold: true })).toBe(false)
      expect(isEmptyStyle({ fontSize: 12 })).toBe(false)
    })
  })

  describe('extractStyleFromProperties', () => {
    it('should handle missing or empty properties', () => {
      expect(extractStyleFromProperties(null)).toEqual({})
      expect(extractStyleFromProperties(undefined)).toEqual({})
      expect(extractStyleFromProperties({})).toEqual({})
      expect(extractStyleFromProperties({ style: '' })).toEqual({})
    })

    it('should extract and parse style attribute', () => {
      const properties = {
        style: 'color: red; font-weight: bold; background-color: yellow'
      }
      const result = extractStyleFromProperties(properties)
      
      expect(result.color).toBe('#FF0000')
      expect(result.bold).toBe(true)
      expect(result.background).toBe('#FFFF00')
    })

    it('should handle other properties alongside style', () => {
      const properties = {
        id: 'test-id',
        className: 'test-class',
        style: 'color: blue'
      }
      const result = extractStyleFromProperties(properties)
      
      expect(result.color).toBe('#0000FF')
      // 其他属性不应影响样式提取
    })
  })

  describe('createStyledTextObject', () => {
    it('should return plain text when style is empty', () => {
      expect(createStyledTextObject('hello', {})).toBe('hello')
      expect(createStyledTextObject('hello', {}, 'p')).toEqual({ text: 'hello', style: 'p' })
    })

    it('should apply custom styles', () => {
      const style: PdfMakeStyleObject = { color: '#ff0000', bold: true }
      const result = createStyledTextObject('hello', style)
      
      expect(result).toEqual({
        text: 'hello',
        color: '#ff0000',
        bold: true
      })
    })

    it('should combine custom styles with base style name', () => {
      const style: PdfMakeStyleObject = { color: '#ff0000' }
      const result = createStyledTextObject('hello', style, 'p')
      
      expect(result).toEqual({
        text: 'hello',
        color: '#ff0000',
        style: 'p'
      })
    })

    it('should handle complex text objects', () => {
      const textArray = ['hello ', { text: 'world', bold: true }]
      const style: PdfMakeStyleObject = { color: '#ff0000' }
      const result = createStyledTextObject(textArray, style)
      
      expect(result).toEqual({
        text: textArray,
        color: '#ff0000'
      })
    })
  })

  describe('font size parsing', () => {
    it('should parse pixel values', () => {
      expect(mapCssStyleToPdfMake({ fontSize: '12px' }).fontSize).toBe(9)
      expect(mapCssStyleToPdfMake({ fontSize: '16px' }).fontSize).toBe(12)
      expect(mapCssStyleToPdfMake({ fontSize: '20px' }).fontSize).toBe(15)
    })

    it('should parse point values', () => {
      expect(mapCssStyleToPdfMake({ fontSize: '12pt' }).fontSize).toBe(12)
      expect(mapCssStyleToPdfMake({ fontSize: '14pt' }).fontSize).toBe(14)
    })

    it('should parse em values', () => {
      expect(mapCssStyleToPdfMake({ fontSize: '1em' }).fontSize).toBe(12)
      expect(mapCssStyleToPdfMake({ fontSize: '1.5em' }).fontSize).toBe(18)
      expect(mapCssStyleToPdfMake({ fontSize: '0.8em' }).fontSize).toBe(10)
    })

    it('should parse percentage values', () => {
      expect(mapCssStyleToPdfMake({ fontSize: '100%' }).fontSize).toBe(12)
      expect(mapCssStyleToPdfMake({ fontSize: '120%' }).fontSize).toBe(14)
      expect(mapCssStyleToPdfMake({ fontSize: '80%' }).fontSize).toBe(10)
    })

    it('should parse numeric values as points', () => {
      expect(mapCssStyleToPdfMake({ fontSize: '12' }).fontSize).toBe(12)
      expect(mapCssStyleToPdfMake({ fontSize: '14.5' }).fontSize).toBe(15)
    })

    it('should handle invalid font sizes', () => {
      expect(mapCssStyleToPdfMake({ fontSize: 'invalid' }).fontSize).toBeUndefined()
      expect(mapCssStyleToPdfMake({ fontSize: 'rem' }).fontSize).toBeUndefined()
      expect(mapCssStyleToPdfMake({ fontSize: '0px' }).fontSize).toBeUndefined()
      expect(mapCssStyleToPdfMake({ fontSize: '-10px' }).fontSize).toBeUndefined()
    })
  })
})
