/**
 * GitHub 样式的边框和分隔线实现
 * 由于 pdfmake 不直接支持 CSS 边框，我们使用 canvas 绘制线条
 */

interface BorderLine {
  type: 'line'
  x1: number
  y1: number
  x2: number
  y2: number
  lineWidth: number
  lineColor?: string
}

/**
 * 创建 H1 标题的底部边框（GitHub 样式）
 * 粗线，颜色为 #d1d9e0
 */
export function createH1Border(pageWidth: number = 515): any {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: pageWidth,
        y2: 0,
        lineWidth: 1,
        lineColor: '#d1d9e0',
      } as BorderLine,
    ],
    margin: [0, 0, 0, 16], // 底部间距
  }
}

/**
 * 创建 H2 标题的底部细线（GitHub 样式）
 * 细线，颜色为 #d1d9e0
 */
export function createHrBorder(pageWidth: number = 515): any {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: pageWidth,
        y2: 0,
        lineWidth: 3.5,
        lineColor: '#d1d9e0',
      } as BorderLine,
    ],
    margin: [0, 0, 0, 24], // 底部间距
  }
}

/**
 * 创建代码块的背景和边框样式
 * GitHub 代码块有浅灰背景和细边框
 */
export function createCodeBlockStyle(content: string): any {
  return {
    table: {
      widths: ['*'],
      body: [
        [
          {
            text: content,
            border: [false, false, false, false], // 禁用表格边框
          },
        ],
      ],
    },
    layout: 'codeBlockLayout',
    style: 'codeBlock',
  }
}
