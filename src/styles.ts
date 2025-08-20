import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces'

export interface ThemeOptions {
  baseFontSize?: number
  headingFontSizes?: number[] // H1~H6
  linkColor?: string
  code?: {
    font?: string
    fontSize?: number
    background?: string
    borderColor?: string
  }
  blockquote?: {
    borderColor?: string
    textColor?: string
  }
  table?: {
    headerFill?: string
    borderColor?: string
    cellPadding?: number
  }
}

/**
 * 创建与 GitHub Markdown 样式对齐的默认样式
 * 参考 GitHub Primer CSS 和 markdown-body 样式规范
 */
export function createDefaultStyles(theme: ThemeOptions = {}): StyleDictionary {
  const base = theme.baseFontSize ?? 14

  // GitHub 配色方案
  const codeFontSize = theme.code?.fontSize ?? base - 1
  const codeBackground = theme.code?.background ?? '#f6f8fa' // GitHub 代码背景
  const codeBorderColor = theme.code?.borderColor ?? '#d1d9e0'

  const tableHeaderFill = theme.table?.headerFill ?? '#f6f8fa'
  const tableBorderColor = theme.table?.borderColor ?? '#d1d9e0'
  const tableCellPadding = theme.table?.cellPadding ?? 6

  return {
    // 一二级标题下边距为到下横线的距离，16px 的边距在下横线上
    h1: { fontSize: 28, bold: true, marginBottom: 8.4 },
    h2: { fontSize: 21, bold: true, marginBottom: 6.3 },
    h3: { fontSize: 17.5, bold: true, marginBottom: 16 },
    h4: { fontSize: 14, bold: true, marginBottom: 16 },
    h5: { fontSize: 12.25, bold: true, marginBottom: 16 },
    h6: { fontSize: 11.9, color: '#59636e', bold: true, marginBottom: 16 },
    p: { fontSize: 14, margin: [0, 0, 0, 16] },
    // 引用块样式：GitHub blockquote
    blockquote: { fontSize: 14, color: '#59636e', marginBottom: 16 },
    a: { color: '#0969da', decoration: 'underline' },
    ul: { marginBottom: 16, marginLeft: 12 },
    ol: { marginBottom: 16, marginLeft: 12 },
    del: { decoration: 'lineThrough' },

    b: { bold: true },
    strong: { bold: true },
    u: { decoration: 'underline' },
    s: { decoration: 'lineThrough' },
    em: { italics: true },
    i: { italics: true },
    strike: { decoration: 'lineThrough' },
    table: { marginBottom: 5 },
    th: { bold: true, fillColor: '#EEEEEE' },

    // 表格样式配置
    tableHeader: {
      fontSize: base,
      bold: true,
      fillColor: tableHeaderFill,
      color: '#1f2328',
      margin: [tableCellPadding, tableCellPadding, tableCellPadding, tableCellPadding],
    },

    tableCell: {
      fontSize: base,
      color: '#1f2328',
      lineHeight: 1.6,
      margin: [tableCellPadding, tableCellPadding, tableCellPadding, tableCellPadding],
    },

    // 行内代码：GitHub 样式
    code: {
      fontSize: codeFontSize,
      background: codeBackground,
      color: '#1f2328', // GitHub 代码文字色
      margin: [2, 0, 2, 0], // 行内代码的小边距
    },

    // 代码块：GitHub 样式，更大的内边距
    codeBlock: {
      fontSize: codeFontSize,
      background: codeBackground,
      color: '#1f2328',
      margin: [0, 8, 0, 16],
      // 注意：pdfmake 不直接支持 border，我们可能需要用其他方法实现边框
    },
  } as any
}

export function createLayout() {
  return {
    // 使用表格布局模拟 blockquote
    blockquoteLayout: {
      hLineWidth: function () {
        return 0
      },
      vLineWidth: function (i: number) {
        return i === 0 ? 3 : 0
      },
      vLineColor: function () {
        return '#d1d9e0'
      },
      paddingLeft: function () {
        return 14
      },
      paddingRight: function () {
        return 14
      },
    },
  }
}
