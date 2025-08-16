import type { TDocumentDefinitions, StyleDictionary } from 'pdfmake/interfaces';

export interface ThemeOptions {
  baseFontSize?: number;
  headingFontSizes?: number[]; // H1~H6
  linkColor?: string;
  code?: { 
    font?: string; 
    fontSize?: number; 
    background?: string; 
    borderColor?: string; 
  };
  blockquote?: {
    borderColor?: string;
    textColor?: string;
  };
  table?: {
    headerFill?: string;
    borderColor?: string;
    cellPadding?: number;
  };
}

/**
 * 创建与 GitHub Markdown 样式对齐的默认样式
 * 参考 GitHub Primer CSS 和 markdown-body 样式规范
 */
export function createDefaultStyles(theme: ThemeOptions = {}): StyleDictionary {
  const base = theme.baseFontSize ?? 12;
  // GitHub 标题字号规范 (相对于基础字号的倍数)
  const headingSizes = theme.headingFontSizes ?? [
    Math.round(base * 2.0),   // H1: 24px (2.0x)
    Math.round(base * 1.5),   // H2: 18px (1.5x)
    Math.round(base * 1.25),  // H3: 15px (1.25x)
    Math.round(base * 1.0),   // H4: 12px (1.0x)
    Math.round(base * 0.875), // H5: 10.5px (0.875x)
    Math.round(base * 0.85),  // H6: 10.2px (0.85x)
  ];
  
  // GitHub 配色方案
  const linkColor = theme.linkColor ?? '#0969da'; // GitHub 蓝色
  const codeFontSize = theme.code?.fontSize ?? base - 1;
  const codeBackground = theme.code?.background ?? '#f6f8fa'; // GitHub 代码背景
  const codeBorderColor = theme.code?.borderColor ?? '#d1d9e0';
  
  const blockquoteBorderColor = theme.blockquote?.borderColor ?? '#d0d7de';
  const blockquoteTextColor = theme.blockquote?.textColor ?? '#656d76';
  
  const tableHeaderFill = theme.table?.headerFill ?? '#f6f8fa';
  const tableBorderColor = theme.table?.borderColor ?? '#d1d9e0';
  const tableCellPadding = theme.table?.cellPadding ?? 6;

  return {
    // 段落：GitHub 行高和间距
    paragraph: { 
      fontSize: base, 
      lineHeight: 1.6, // GitHub 使用 1.6 行高
      margin: [0, 6, 0, 10] 
    },
    
    // 链接：GitHub 蓝色，悬停时下划线
    link: { 
      color: linkColor, 
      decoration: 'underline' 
    },
    
    // 行内代码：GitHub 样式
    code: { 
      fontSize: codeFontSize,
      background: codeBackground,
      color: '#1f2328', // GitHub 代码文字色
      margin: [2, 0, 2, 0] // 行内代码的小边距
    },
    
    // 代码块：GitHub 样式，更大的内边距
    codeBlock: {
      fontSize: codeFontSize,
      background: codeBackground,
      color: '#1f2328',
      margin: [0, 8, 0, 16],
      // 注意：pdfmake 不直接支持 border，我们可能需要用其他方法实现边框
    },
    
    // 标题样式：参考 GitHub Markdown
    h1: { 
      fontSize: headingSizes[0], 
      bold: true, 
      color: '#1f2328',
      margin: [0, 0, 0, 16], // 底部更大间距
      // GitHub H1 有底部边框，但 pdfmake 需要特殊处理
    },
    h2: { 
      fontSize: headingSizes[1], 
      bold: true, 
      color: '#1f2328',
      margin: [0, 24, 0, 16], // 顶部间距增加
      // GitHub H2 也有底部细线
    },
    h3: { 
      fontSize: headingSizes[2], 
      bold: true, 
      color: '#1f2328',
      margin: [0, 20, 0, 12] 
    },
    h4: { 
      fontSize: headingSizes[3], 
      bold: true, 
      color: '#1f2328',
      margin: [0, 16, 0, 8] 
    },
    h5: { 
      fontSize: headingSizes[4], 
      bold: true, 
      color: '#656d76', // H5/H6 使用灰色
      margin: [0, 16, 0, 8] 
    },
    h6: { 
      fontSize: headingSizes[5], 
      bold: true, 
      color: '#656d76',
      margin: [0, 16, 0, 8] 
    },
    
    // 引用块样式：GitHub blockquote
    blockquote: {
      fontSize: base,
      color: blockquoteTextColor,
      lineHeight: 1.6,
      margin: [16, 8, 0, 16], // 左侧间距用于边框效果
      // 左边框需要特殊实现
    },
    
    // 表格样式配置
    tableHeader: {
      fontSize: base,
      bold: true,
      fillColor: tableHeaderFill,
      color: '#1f2328',
      margin: [tableCellPadding, tableCellPadding, tableCellPadding, tableCellPadding]
    },
    
    tableCell: {
      fontSize: base,
      color: '#1f2328',
      lineHeight: 1.6,
      margin: [tableCellPadding, tableCellPadding, tableCellPadding, tableCellPadding]
    }
  } as any;
}


