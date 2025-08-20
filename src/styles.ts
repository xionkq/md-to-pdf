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
  const linkColor = theme.linkColor ?? '#0969da' // GitHub 蓝色
  const codeFontSize = theme.code?.fontSize ?? base - 1
  const codeBackground = theme.code?.background ?? '#f6f8fa' // GitHub 代码背景
  const codeBorderColor = theme.code?.borderColor ?? '#d1d9e0'

  const blockquoteBorderColor = theme.blockquote?.borderColor ?? '#d0d7de'
  const blockquoteTextColor = theme.blockquote?.textColor ?? '#59636e'

  const tableHeaderFill = theme.table?.headerFill ?? '#f6f8fa'
  const tableBorderColor = theme.table?.borderColor ?? '#d1d9e0'
  const tableCellPadding = theme.table?.cellPadding ?? 6

  return {
    // 段落：GitHub 行高和间距
    paragraph: {
      fontSize: 14,
      lineHeight: 1.5,
      margin: [0, 0, 0, 16],
    },

    // 链接：GitHub 蓝色，悬停时下划线
    link: {
      color: linkColor,
      decoration: 'underline',
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

    // 引用块样式：GitHub blockquote
    blockquote: {
      fontSize: base,
      color: '#59636e',
    },

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

    b: { bold: true },
    strong: { bold: true },
    u: { decoration: 'underline' },
    del: { decoration: 'lineThrough' },
    s: { decoration: 'lineThrough' },
    em: { italics: true },
    i: { italics: true },
    h1: { fontSize: 24, bold: true, marginBottom: 5 },
    h2: { fontSize: 22, bold: true, marginBottom: 5 },
    h3: { fontSize: 20, bold: true, marginBottom: 5 },
    h4: { fontSize: 18, bold: true, marginBottom: 5 },
    h5: { fontSize: 16, bold: true, marginBottom: 5 },
    h6: { fontSize: 14, bold: true, marginBottom: 5 },
    a: { color: 'blue', decoration: 'underline' },
    strike: { decoration: 'lineThrough' },
    p: { margin: [0, 5, 0, 10] },
    ul: { marginBottom: 5, marginLeft: 5 },
    table: { marginBottom: 5 },
    th: { bold: true, fillColor: '#EEEEEE' },
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
