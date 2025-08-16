import { describe, it, expect, vi } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapRemarkToPdfContent } from '../src/mapping'

describe('mapping: extended nodes (task list, table, code, image)', () => {
  it('task list and code block', async () => {
    const md = `- [x] 完成事项\n- [ ] 待办事项\n\n\n\`\`\`js\nconsole.log('hi');\n\`\`\``
    const { tree } = await parseMarkdown(md)
    const content = await mapRemarkToPdfContent(tree as any)

    const ul = content.find((c: any) => 'ul' in c)
    const firstStr = JSON.stringify(ul.ul[0])
    const secondStr = JSON.stringify(ul.ul[1])
    expect(firstStr).toContain('☑')
    expect(secondStr).toContain('☐')

    // 代码块现在使用表格结构包装
    const codeBlock = content.find(
      (c: any) =>
        c.table && c.table.body && c.table.body[0] && c.table.body[0][0] && c.table.body[0][0].style === 'codeBlock'
    )
    expect(codeBlock).toBeDefined()
    expect(codeBlock.table.body[0][0].text).toContain("console.log('hi')")
  })

  it('table alignment and image with resolver', async () => {
    const md = `| 左 | 中 | 右 |\n|:--|:--:|--:|\n| a | b | c |\n\n![alt](http://example.com/1.png)`
    const { tree } = await parseMarkdown(md)
    const resolver = vi.fn(async () => 'data:image/png;base64,AAAA')
    const content = await mapRemarkToPdfContent(tree as any, { imageResolver: resolver })

    const tbl = content.find((c: any) => 'table' in c)
    // 现在表头使用 style 和 fillColor 而不是 bold
    expect(tbl.table.body[0][0].style).toBe('tableHeader')
    expect(tbl.table.body[0][0].fillColor).toBe('#f6f8fa')
    expect(tbl.table.body[1][0].alignment).toBeUndefined()
    expect(tbl.table.body[1][1].alignment).toBe('center')
    expect(tbl.table.body[1][2].alignment).toBe('right')

    const img = content.find((c: any) => 'image' in c)
    expect(img.image.startsWith('data:image/png;base64,')).toBe(true)
  })
})
