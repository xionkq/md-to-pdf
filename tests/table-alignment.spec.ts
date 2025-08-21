import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapRemarkToPdfContent } from '../src/mapping'
import { mapHastToPdfContent } from '../src/mapping/hast'

describe('Table alignment handling', () => {
  const testMarkdown = `| 左对齐 | 居中对齐 | 右对齐 |
|:------|:------:|-------:|
| Left  | Center | Right |
| 数据1  | 数据2   | 数据3  |`

  it('remark (mdast) preserves table alignment', async () => {
    const { tree } = await parseMarkdown(testMarkdown, { enableHtml: false })
    const content = await mapRemarkToPdfContent(tree as any, {})

    const table = content.find((c: any) => 'table' in c)
    expect(table).toBeDefined()

    const headers = table.table.body[0]
    const firstRow = table.table.body[1]

    // 检查表头对齐
    expect(headers[0].alignment).toBeUndefined() // 左对齐是默认的
    expect(headers[1].alignment).toBe('center')
    expect(headers[2].alignment).toBe('right')

    // 检查数据行对齐
    expect(firstRow[0].alignment).toBeUndefined() // 左对齐是默认的
    expect(firstRow[1].alignment).toBe('center')
    expect(firstRow[2].alignment).toBe('right')
  })

  it('HAST (HTML) preserves table alignment', async () => {
    const { tree } = await parseMarkdown(testMarkdown, { enableHtml: true })
    const content = await mapHastToPdfContent(tree as any, {})

    const table = content.find((c: any) => 'table' in c)
    expect(table).toBeDefined()

    const headers = table.table.body[0]
    const firstRow = table.table.body[1]

    // 检查表头对齐
    expect(headers[0].alignment).toBeUndefined() // 左对齐是默认的
    expect(headers[1].alignment).toBe('center')
    expect(headers[2].alignment).toBe('right')

    // 检查数据行对齐
    expect(firstRow[0].alignment).toBeUndefined() // 左对齐是默认的
    expect(firstRow[1].alignment).toBe('center')
    expect(firstRow[2].alignment).toBe('right')
  })

  it('both mdast and HAST produce consistent alignment results', async () => {
    const mdResult = await parseMarkdown(testMarkdown, { enableHtml: false })
    const hastResult = await parseMarkdown(testMarkdown, { enableHtml: true })

    const mdContent = await mapRemarkToPdfContent(mdResult.tree as any, {})
    const hastContent = await mapHastToPdfContent(hastResult.tree as any, {})

    const mdTable = mdContent.find((c: any) => 'table' in c)
    const hastTable = hastContent.find((c: any) => 'table' in c)

    // 比较表头对齐
    expect(mdTable.table.body[0][1].alignment).toBe(hastTable.table.body[0][1].alignment)
    expect(mdTable.table.body[0][2].alignment).toBe(hastTable.table.body[0][2].alignment)

    // 比较数据行对齐
    expect(mdTable.table.body[1][1].alignment).toBe(hastTable.table.body[1][1].alignment)
    expect(mdTable.table.body[1][2].alignment).toBe(hastTable.table.body[1][2].alignment)
  })
})
