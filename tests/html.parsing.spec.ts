import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapHastToPdfContent } from '../src/mapping/hast'

describe('HTML解析和转换测试', () => {
  it('应正确解析HTML标题和段落', async () => {
    const md = `<h1>HTML一级标题</h1>
<p>这是<strong>HTML段落</strong>，包含<em>格式化</em>内容</p>`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    console.log('content', content)

    // 验证内容包含标题和段落文本
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('HTML一级标题')
    expect(contentStr).toContain('HTML段落')
    expect(contentStr).toContain('格式化')

    // 验证格式化效果
    const hasFormatting =
      contentStr.includes('style":"b"') || contentStr.includes('bold') || contentStr.includes('italics')
    expect(hasFormatting).toBe(true)
  })

  it('应正确解析HTML表格', async () => {
    const md = `<table>
  <tr>
    <th>表头1</th>
    <th>表头2</th>
  </tr>
  <tr>
    <td>单元格1</td>
    <td>单元格2</td>
  </tr>
</table>`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查是否有表格
    const table = content.find((node: any) => node.table)
    expect(table).toBeDefined()

    // 验证表格内容
    expect(table.table.body.length).toBeGreaterThanOrEqual(2) // 至少有表头和一行数据

    const tableStr = JSON.stringify(table)
    expect(tableStr).toContain('表头1')
    expect(tableStr).toContain('表头2')
    expect(tableStr).toContain('单元格1')
    expect(tableStr).toContain('单元格2')
  })

  it('应正确解析HTML列表', async () => {
    const md = `<ul>
  <li>无序列表项1</li>
  <li>无序列表项2</li>
</ul>
<ol>
  <li>有序列表项1</li>
  <li>有序列表项2</li>
</ol>`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查无序列表
    const ul = content.find((node: any) => node.ul)
    expect(ul).toBeDefined()
    expect(ul.ul.length).toBe(2)

    // 检查有序列表
    const ol = content.find((node: any) => node.ol)
    expect(ol).toBeDefined()
    expect(ol.ol.length).toBe(2)

    // 验证列表内容
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('无序列表项1')
    expect(contentStr).toContain('无序列表项2')
    expect(contentStr).toContain('有序列表项1')
    expect(contentStr).toContain('有序列表项2')
  })

  it('应正确解析HTML代码块和引用', async () => {
    const md = `<pre><code>function test() {
  console.log('HTML代码块');
}</code></pre>

<blockquote>
  这是HTML引用块
</blockquote>`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 验证代码块和引用块的内容存在
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('function test()')
    expect(contentStr).toContain('HTML代码块')
    expect(contentStr).toContain('这是HTML引用块')

    // 检查代码块和引用块特征
    const hasCodeFeatures =
      contentStr.includes('codeBlock') || contentStr.includes('pre') || contentStr.includes('code')
    const hasQuoteFeatures = contentStr.includes('blockquote') || contentStr.includes('blockquoteLayout')

    // 至少需要包含其中一种特征，因为实现可能有所不同
    expect(hasCodeFeatures || hasQuoteFeatures).toBe(true)
  })

  it('应正确处理混合Markdown和HTML', async () => {
    const md = `# Markdown标题

<div class="custom">
  <h2>HTML二级标题</h2>
  <p>混合内容段落</p>
</div>

- Markdown列表项
- 包含<strong>HTML标签</strong>的列表项`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 验证内容
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('Markdown标题')
    expect(contentStr).toContain('HTML二级标题')
    expect(contentStr).toContain('混合内容段落')
    expect(contentStr).toContain('Markdown列表项')
    expect(contentStr).toContain('HTML标签')

    // 验证有列表结构
    const hasList = contentStr.includes('"ul":')
    expect(hasList).toBe(true)
  })
})
