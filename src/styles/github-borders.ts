/**
 * GitHub 样式的边框和分隔线实现
 * 由于 pdfmake 不直接支持 CSS 边框，我们使用 canvas 绘制线条
 */

export interface BorderLine {
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
export function createH2Border(pageWidth: number = 515): any {
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
 * 创建引用块的左边框（GitHub 样式）
 * 左侧粗线，颜色为 #d0d7de
 */
export function createBlockquoteBorder(height: number = 20): any {
  return {
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 0,
        y2: height,
        lineWidth: 4,
        lineColor: '#d0d7de',
      } as BorderLine,
    ],
    margin: [0, 0, 8, 0], // 右侧间距
    width: 4,
  }
}

/**
 * 创建表格的边框样式
 * GitHub 表格使用细线边框
 */
export function createTableLayout(): any {
  return {
    hLineWidth: function (i: number, node: any) {
      return 1
    },
    vLineWidth: function (i: number, node: any) {
      return 1
    },
    hLineColor: function (i: number, node: any) {
      return '#d1d9e0'
    },
    vLineColor: function (i: number, node: any) {
      return '#d1d9e0'
    },
    paddingLeft: function (i: number, node: any) {
      return 13
    },
    paddingRight: function (i: number, node: any) {
      return 13
    },
    paddingTop: function (i: number, node: any) {
      return 6
    },
    paddingBottom: function (i: number, node: any) {
      return 6
    },
    fillColor: function (i: number) {
      if (i === 0) return null
      return i % 2 === 0 ? '#f6f8fa' : null
    },
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
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 16,
      paddingRight: () => 16,
      paddingTop: () => 16,
      paddingBottom: () => 16,
      fillColor: '#f0f1f2',
    },
    style: 'codeBlock',
  }
}
