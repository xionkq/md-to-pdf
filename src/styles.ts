import type { StyleDictionary } from 'pdfmake/interfaces'
import { createCodeBlockStyle } from './styles/github-borders'

/**
 * 创建与 GitHub Markdown 样式对齐的默认样式
 * 参考 GitHub Primer CSS 和 markdown-body 样式规范
 */
export function createDefaultStyles(): StyleDictionary {
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
    table: { marginBottom: 16 },
    th: { bold: true },
    // 行内代码
    code: { background: '#f0f1f2' },
    // 代码块
    codeBlock: { fontSize: 11.9, margin: [0, 0, 0, 16] },
    u: { decoration: 'underline' },

    // TODO: 待支持
    em: { italics: true },
    i: { italics: true },
  } as any
}

export function createLayout() {
  return {
    // 使用表格布局模拟 blockquote
    blockquoteLayout: {
      hLineWidth: () => 0,
      vLineWidth: (i: number) => (i === 0 ? 3 : 0),
      vLineColor: () => '#d1d9e0',
      paddingLeft: () => 14,
      paddingRight: () => 14,
    },
    tableLayout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#d1d9e0',
      vLineColor: () => '#d1d9e0',
      paddingLeft: () => 13,
      paddingRight: () => 13,
      paddingTop: () => 6,
      paddingBottom: () => 6,
      fillColor: function (i: number) {
        if (i === 0) return null
        return i % 2 === 0 ? '#f6f8fa' : null
      },
    },
    codeBlockLayout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 16,
      paddingRight: () => 16,
      paddingTop: () => 16,
      paddingBottom: () => 16,
      fillColor: '#f0f1f2',
    },
  }
}
