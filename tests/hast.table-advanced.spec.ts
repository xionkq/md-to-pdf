import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapHastToPdfContent } from '../src/mapping/hast'

describe('HAST: advanced table scenarios', () => {
  it('表格单元格内包含列表', async () => {
    const html = `
<table>
  <tr>
    <th>任务列表</th>
    <th>普通列表</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li>项目1</li>
        <li>项目2</li>
      </ul>
    </td>
    <td>
      <ol>
        <li>步骤1</li>
        <li>步骤2</li>
      </ol>
    </td>
  </tr>
</table>
`
    const { tree } = await parseMarkdown(html, { enableHtml: true })
    const content = await mapHastToPdfContent(tree as any)

    console.log('表格内列表测试结果:', JSON.stringify(content, null, 2))

    const table = content.find((c: any) => 'table' in c)
    expect(table).toBeTruthy()

    // 应该包含列表内容
    const tableStr = JSON.stringify(table)
    expect(tableStr).toContain('项目1')
    expect(tableStr).toContain('步骤1')
  })

  it('表格单元格内包含代码和链接', async () => {
    const html = `
<table>
  <tr>
    <th>代码</th>
    <th>链接</th>
  </tr>
  <tr>
    <td>
      <code>console.log('hello')</code>
    </td>
    <td>
      <a href="https://example.com">示例链接</a>
    </td>
  </tr>
</table>
`
    const { tree } = await parseMarkdown(html, { enableHtml: true })
    const content = await mapHastToPdfContent(tree as any)

    console.log('表格内代码链接测试结果:', JSON.stringify(content, null, 2))

    const table = content.find((c: any) => 'table' in c)
    expect(table).toBeTruthy()

    const tableStr = JSON.stringify(table)
    expect(tableStr).toContain('console.log')
    expect(tableStr).toContain('示例链接')
    expect(tableStr).toContain('https://example.com')
  })

  it('表格单元格内包含强调和格式化', async () => {
    const html = `
<table>
  <tr>
    <th>格式化文本</th>
    <th>混合内容</th>
  </tr>
  <tr>
    <td>
      <strong>粗体</strong> 和 <em>斜体</em>
    </td>
    <td>
      普通文本<br/>
      <code>代码片段</code><br/>
      <a href="#link">内部链接</a>
    </td>
  </tr>
</table>
`
    const { tree } = await parseMarkdown(html, { enableHtml: true })
    const content = await mapHastToPdfContent(tree as any)

    console.log('表格内格式化测试结果:', JSON.stringify(content, null, 2))

    const table = content.find((c: any) => 'table' in c)
    expect(table).toBeTruthy()

    const tableStr = JSON.stringify(table)
    // 应该包含格式化信息
    expect(tableStr).toContain('"bold":true')
    expect(tableStr).toContain('"italics":true')
    expect(tableStr).toContain('代码片段')
  })
})
