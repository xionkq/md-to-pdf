import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapRemarkToPdfContent } from '../src/mapping'

describe('mapping: nested structures', () => {
  it('unordered list with nested ordered list', async () => {
    const md = `- parent\n  1. child-a\n  2. child-b`
    const { tree } = await parseMarkdown(md)
    const content = await mapRemarkToPdfContent(tree as any)
    const ul = content.find((c: any) => 'ul' in c)
    expect(ul).toBeTruthy()
    const firstItem = ul.ul[0]
    // firstItem could be a stack; ensure it contains an ol
    const hasOl = JSON.stringify(firstItem).includes('"ol"')
    expect(hasOl).toBe(true)
  })

  it('table nested inside list item', async () => {
    const md = `- item with table\n\n  | H1 | H2 |\n  |----|----|\n  | a  | b  |`
    const { tree } = await parseMarkdown(md)
    const content = await mapRemarkToPdfContent(tree as any)
    const ul = content.find((c: any) => 'ul' in c)
    const firstItem = ul.ul[0]
    const hasTable = JSON.stringify(firstItem).includes('"table"')
    expect(hasTable).toBe(true)
  })
})
