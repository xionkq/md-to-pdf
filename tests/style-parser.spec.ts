import { describe, it, expect } from 'vitest'
import { parseStyleAttribute, ParsedStyles } from '../src/mapping/utils/styleParser'

describe('styleParser', () => {
  describe('parseStyleAttribute', () => {
    it('should handle empty or invalid input', () => {
      expect(parseStyleAttribute('')).toEqual({})
      expect(parseStyleAttribute('   ')).toEqual({})
      expect(parseStyleAttribute(null as any)).toEqual({})
      expect(parseStyleAttribute(undefined as any)).toEqual({})
    })

    it('should parse single CSS property', () => {
      const result = parseStyleAttribute('color: red')
      expect(result.color).toBe('red')
    })

    it('should parse multiple CSS properties', () => {
      const result = parseStyleAttribute('color: red; background-color: blue; font-weight: bold')
      expect(result.color).toBe('red')
      expect(result.backgroundColor).toBe('blue')
      expect(result.fontWeight).toBe('bold')
    })

    it('should handle properties with whitespace', () => {
      const result = parseStyleAttribute('  color  :  red  ;  font-weight  :  bold  ')
      expect(result.color).toBe('red')
      expect(result.fontWeight).toBe('bold')
    })

    it('should handle properties without semicolon at end', () => {
      const result = parseStyleAttribute('color: red; font-weight: bold')
      expect(result.color).toBe('red')
      expect(result.fontWeight).toBe('bold')
    })

    it('should ignore unknown properties', () => {
      const result = parseStyleAttribute('color: red; unknown-prop: value; font-weight: bold')
      expect(result.color).toBe('red')
      expect(result.fontWeight).toBe('bold')
      expect((result as any).unknownProp).toBeUndefined()
    })
  })

  describe('color property parsing', () => {
    it('should parse color property', () => {
      expect(parseStyleAttribute('color: red').color).toBe('red')
      expect(parseStyleAttribute('color: #ff0000').color).toBe('#ff0000')
      expect(parseStyleAttribute('color: rgb(255, 0, 0)').color).toBe('rgb(255, 0, 0)')
    })
  })

  describe('background-color property parsing', () => {
    it('should parse background-color', () => {
      expect(parseStyleAttribute('background-color: yellow').backgroundColor).toBe('yellow')
      expect(parseStyleAttribute('background-color: #ffff00').backgroundColor).toBe('#ffff00')
    })

    it('should parse background property and extract color', () => {
      expect(parseStyleAttribute('background: red').backgroundColor).toBe('red')
      expect(parseStyleAttribute('background: #ff0000').backgroundColor).toBe('#ff0000')
      expect(parseStyleAttribute('background: url(image.jpg) red').backgroundColor).toBe('red')
    })

    it('should handle transparent background', () => {
      expect(parseStyleAttribute('background-color: transparent').backgroundColor).toBeUndefined()
    })
  })

  describe('font-weight property parsing', () => {
    it('should parse font-weight keywords', () => {
      expect(parseStyleAttribute('font-weight: bold').fontWeight).toBe('bold')
      expect(parseStyleAttribute('font-weight: normal').fontWeight).toBe('normal')
      expect(parseStyleAttribute('font-weight: lighter').fontWeight).toBe('normal')
      expect(parseStyleAttribute('font-weight: bolder').fontWeight).toBe('bold')
    })

    it('should parse font-weight numbers', () => {
      expect(parseStyleAttribute('font-weight: 100').fontWeight).toBe('normal')
      expect(parseStyleAttribute('font-weight: 400').fontWeight).toBe('normal')
      expect(parseStyleAttribute('font-weight: 600').fontWeight).toBe('bold')
      expect(parseStyleAttribute('font-weight: 700').fontWeight).toBe('bold')
      expect(parseStyleAttribute('font-weight: 900').fontWeight).toBe('bold')
    })
  })

  describe('font-style property parsing', () => {
    it('should parse font-style values', () => {
      expect(parseStyleAttribute('font-style: italic').fontStyle).toBe('italic')
      expect(parseStyleAttribute('font-style: oblique').fontStyle).toBe('oblique')
      expect(parseStyleAttribute('font-style: normal').fontStyle).toBe('normal')
    })
  })

  describe('text-decoration property parsing', () => {
    it('should parse text-decoration values', () => {
      expect(parseStyleAttribute('text-decoration: underline').textDecoration).toBe('underline')
      expect(parseStyleAttribute('text-decoration: line-through').textDecoration).toBe('line-through')
      expect(parseStyleAttribute('text-decoration: none').textDecoration).toBe('none')
      expect(parseStyleAttribute('text-decoration: underline overline').textDecoration).toBe('underline')
    })
  })

  describe('font-size property parsing', () => {
    it('should parse font-size values', () => {
      expect(parseStyleAttribute('font-size: 12px').fontSize).toBe('12px')
      expect(parseStyleAttribute('font-size: 1.5em').fontSize).toBe('1.5em')
      expect(parseStyleAttribute('font-size: 120%').fontSize).toBe('120%')
      expect(parseStyleAttribute('font-size: 14pt').fontSize).toBe('14pt')
    })
  })

  describe('complex style strings', () => {
    it('should parse complex style combinations', () => {
      const complexStyle = 'color: #ff0000; background-color: rgba(255, 255, 0, 0.5); font-weight: bold; font-style: italic; text-decoration: underline; font-size: 14px'
      const result = parseStyleAttribute(complexStyle)
      
      expect(result.color).toBe('#ff0000')
      expect(result.backgroundColor).toBe('rgba(255, 255, 0, 0.5)')
      expect(result.fontWeight).toBe('bold')
      expect(result.fontStyle).toBe('italic')
      expect(result.textDecoration).toBe('underline')
      expect(result.fontSize).toBe('14px')
    })

    it('should handle malformed CSS gracefully', () => {
      // 缺少冒号
      expect(parseStyleAttribute('color red; font-weight: bold')).toEqual({
        fontWeight: 'bold'
      })
      
      // 多个冒号
      expect(parseStyleAttribute('color: red: blue; font-weight: bold')).toEqual({
        color: 'red: blue',
        fontWeight: 'bold'
      })
    })
  })
})
