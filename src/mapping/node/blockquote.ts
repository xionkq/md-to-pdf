import { handleInlineNode } from './inline'
import { textFromChildren } from '../utils'
import { handleTableNode } from './table'
import { createCodeBlockStyle, createHrBorder } from '../../styles/github-borders'
import { handleImgNode } from './img'

export async function handleBlockquoteNode(
  node: any,
  content: any[],
  recursion: (...p: any[]) => Promise<any>,
  ctx?: any
) {
  // 处理引用嵌套，支持完整的块级元素
  const inner: any[] = []

  // 递归处理引用块中的每个子元素
  const processBlockquoteChild = async (child: any): Promise<any[]> => {
    if (child.type === 'element') {
      const tag = child.tagName?.toLowerCase()

      switch (tag) {
        case 'p':
        case 'div': {
          // 段落：使用inline处理支持嵌套格式
          const inlineContent = handleInlineNode(child.children || [])
          if (inlineContent.length > 0) {
            return [{ text: inlineContent, style: 'blockquote', margin: [0, 2, 0, 2] }]
          }
          return []
        }

        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6': {
          // 标题：在引用块中的标题
          const level = Number(tag[1])
          const txt = textFromChildren(child.children || [])
          if (txt) {
            return [{ text: txt, style: [`h${level}`, 'blockquote'], margin: [0, 4, 0, 8] }]
          }
          return []
        }

        case 'ul':
        case 'ol': {
          // 列表：递归处理并保持结构
          const nestedList = await recursion({ type: 'root', children: [child] } as any, ctx)
          // 为引用块中的列表添加特殊样式和缩进
          return nestedList.map((item: any) => ({
            ...item,
            margin: [8, 2, 0, 2],
            style: Array.isArray(item.style)
              ? [...item.style, 'blockquote']
              : item.style
                ? [item.style, 'blockquote']
                : 'blockquote',
          }))
        }

        case 'blockquote': {
          // 嵌套引用：递归处理
          const nestedQuote = await recursion({ type: 'root', children: [child] } as any, ctx)
          return nestedQuote.map((item: any) => ({
            ...item,
            margin: [8, 2, 0, 2],
          }))
        }

        case 'table': {
          // 表格：直接处理并添加引用样式
          const tableElement = handleTableNode(child)
          return [
            {
              ...tableElement,
              margin: [8, 4, 0, 8],
              style: Array.isArray(tableElement.style)
                ? [...tableElement.style, 'blockquote']
                : tableElement.style
                  ? [tableElement.style, 'blockquote']
                  : 'blockquote',
            },
          ]
        }
        // TODO: 引用中嵌套代码块时，导致字体大小会使用引用的而非代码块的
        case 'pre': {
          // 代码块：保持格式
          const txt = textFromChildren(child.children || [])
          if (txt) {
            const codeBlock = createCodeBlockStyle(txt)
            return [
              {
                ...codeBlock,
                margin: [8, 4, 0, 8],
                style: Array.isArray(codeBlock.style)
                  ? [...codeBlock.style, 'blockquote']
                  : codeBlock.style
                    ? [codeBlock.style, 'blockquote']
                    : 'blockquote',
              },
            ]
          }
          return []
        }

        case 'code': {
          // 独立代码块
          const txt = textFromChildren(child.children || [])
          const isBlock = child.children?.some((c: any) => c.type === 'text' && (c.value || '').includes('\n'))
          if (txt) {
            if (isBlock) {
              const codeBlock = createCodeBlockStyle(txt)
              return [
                {
                  ...codeBlock,
                  margin: [8, 4, 0, 8],
                  style: Array.isArray(codeBlock.style)
                    ? [...codeBlock.style, 'blockquote']
                    : codeBlock.style
                      ? [codeBlock.style, 'blockquote']
                      : 'blockquote',
                },
              ]
            } else {
              return [{ text: txt, style: ['code', 'blockquote'], margin: [0, 2, 0, 2] }]
            }
          }
          return []
        }

        case 'hr': {
          // 分割线
          return [{ ...createHrBorder(), margin: [8, 4, 0, 8] }]
        }

        case 'img': {
          // 图片
          return [await handleImgNode(child, ctx.imageResolver, 'blockquote')]
        }

        default: {
          // 其他元素：使用inline处理
          const inlineContent = handleInlineNode([child])
          if (inlineContent.length > 0) {
            return [{ text: inlineContent, style: 'blockquote', margin: [0, 2, 0, 2] }]
          }
          return []
        }
      }
    } else if (child.type === 'text') {
      const val = String(child.value ?? '').trim()
      if (val) {
        return [{ text: val, style: 'blockquote', margin: [0, 2, 0, 2] }]
      }
    }

    return []
  }

  // 处理所有子元素
  for (const child of node.children || []) {
    const childElements = await processBlockquoteChild(child)
    inner.push(...childElements)
  }

  // 使用stack结构而不是table text，以支持复杂的块级元素
  if (inner.length > 0) {
    content.push({
      layout: 'blockquoteLayout',
      style: 'blockquote',
      table: {
        body: [
          [
            {
              stack: inner,
            },
          ],
        ],
      },
    })
  }
}
