import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapHastToPdfContent } from '../src/mapping/hast'

describe('节点嵌套关系测试', () => {
  it('列表项内包含段落和格式化文本', async () => {
    const md = `- 第一个列表项
- 第二个列表项包含**粗体文本**和*斜体文本*
- 第三个列表项包含\`行内代码\`和[链接](https://example.com)`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 查找无序列表
    const ul = content.find((node: any) => node.ul)
    expect(ul).toBeDefined()
    expect(ul.ul.length).toBe(3)

    // 检查第二个列表项是否包含格式化文本
    const secondItemStr = JSON.stringify(ul.ul[1])
    expect(secondItemStr.includes('style":"b"') || secondItemStr.includes('bold')).toBe(true) // 粗体
    expect(secondItemStr.includes('italics')).toBe(true) // 斜体

    // 检查第三个列表项是否包含代码和链接
    const thirdItemStr = JSON.stringify(ul.ul[2])
    expect(thirdItemStr.includes('style":"code"')).toBe(true) // 包含代码
    expect(thirdItemStr.includes('https://example.com')).toBe(true) // 包含链接
  })

  it('列表项内包含表格', async () => {
    const md = `- 列表项前文本
  | 表头1 | 表头2 |
  |------|------|
  | 数据1 | 数据2 |
- 普通列表项`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 验证内容中包含列表项文本和表格内容
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('列表项前文本')
    expect(contentStr).toContain('数据1')
    expect(contentStr).toContain('数据2')

    // 验证有列表结构
    const hasUl = contentStr.includes('"ul":')
    expect(hasUl).toBe(true)
  })

  it('引用块内包含列表', async () => {
    const md = `> 引用块内容
> - 引用内的列表项1
> - 引用内的列表项2`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查内容字符串中是否包含这两项
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('引用内的列表项1')
    expect(contentStr).toContain('引用内的列表项2')

    // 检查是否有引用块特征
    const hasBlockquote = contentStr.includes('blockquote') || contentStr.includes('blockquoteLayout')
    expect(hasBlockquote).toBe(true)
  })

  it('引用块内包含代码块', async () => {
    const md = `> 这是引用内容
> \`\`\`javascript
> function test() {
>   return true;
> }
> \`\`\``

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查内容字符串是否包含代码内容
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('function test()')
    expect(contentStr).toContain('return true')

    // 验证结果中包含代码和引用元素特征
    const hasCodeFeature =
      contentStr.includes('codeBlock') || contentStr.includes('code') || contentStr.includes('style":"code"')

    const hasQuoteFeature = contentStr.includes('blockquote') || contentStr.includes('blockquoteLayout')

    expect(hasCodeFeature).toBe(true)
    expect(hasQuoteFeature).toBe(true)
  })

  it('表格单元格内包含格式化文本', async () => {
    const md = `| 普通文本 | **粗体** 文本 | 
|---------|-------------|
| *斜体* 文本 | [链接](https://example.com) |`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查表格存在
    const table = content.find((node: any) => node.table)
    expect(table).toBeDefined()

    // 验证表格中包含格式化文本
    const tableStr = JSON.stringify(table)
    expect(tableStr.includes('style":"b"') || tableStr.includes('bold')).toBe(true) // 粗体
    expect(tableStr.includes('italics')).toBe(true) // 斜体
    expect(tableStr.includes('https://example.com')).toBe(true) // 链接
  })

  it('复杂嵌套: 列表内的引用块内的代码', async () => {
    const md = `- 列表项
  > 引用内容
  > \`\`\`
  > console.log("测试代码");
  > \`\`\`
- 另一个列表项`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查内容中是否包含关键元素
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('列表项')
    expect(contentStr).toContain('引用内容')
    expect(contentStr).toContain('console.log')
    expect(contentStr).toContain('测试代码')

    // 验证存在列表结构
    const hasList = contentStr.includes('"ul":')
    expect(hasList).toBe(true)
  })
})
