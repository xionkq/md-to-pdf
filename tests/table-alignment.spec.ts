import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapHastToPdfContent } from '../src/mapping/hast'

describe('Table alignment handling', () => {
  const testMarkdown = `| 左对齐 | 居中对齐 | 右对齐 |
|:------|:------:|-------:|
| Left  | Center | Right |
| 数据1  | 数据2   | 数据3  |`

  it('HAST (HTML) preserves table alignment', async () => {
    const tree = await parseMarkdown(testMarkdown)
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
})
