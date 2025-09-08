import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapHastToPdfContent } from '../src/mapping/hast'

describe('基本节点解析测试', () => {
  it('应正确解析标题节点 (h1-h6)', async () => {
    const md = `# 一级标题
## 二级标题
### 三级标题
#### 四级标题
##### 五级标题
###### 六级标题`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查是否存在6个标题节点
    const headings = content.filter(
      (node: any) => node.text && typeof node.style === 'string' && node.style.startsWith('h')
    )
    expect(headings.length).toBe(6)

    // 验证标题级别
    expect(headings[0].style).toBe('h1')
    expect(headings[1].style).toBe('h2')
    expect(headings[2].style).toBe('h3')
    expect(headings[3].style).toBe('h4')
    expect(headings[4].style).toBe('h5')
    expect(headings[5].style).toBe('h6')

    // 验证标题内容
    expect(headings[0].text).toBe('一级标题')
    expect(headings[5].text).toBe('六级标题')
  })

  it('应正确解析段落和格式化文本', async () => {
    const md = `这是普通段落

这段包含**粗体**、*斜体*和~~删除线~~，还有\`行内代码\`和[链接](https://example.com)`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查是否有两个段落
    const paragraphs = content.filter((node: any) => node.style === 'p')
    expect(paragraphs.length).toBe(2)

    // 第二段应该包含格式化文本
    const secondPara = paragraphs[1]
    const paraContent = JSON.stringify(secondPara)

    // 检查格式化文本存在 - 注意：在实际实现中粗体使用style:"b"而不是bold属性
    expect(paraContent.includes('style":"b"') || paraContent.includes('bold')).toBe(true)
    expect(paraContent.includes('italics')).toBe(true)
    expect(paraContent.includes('style":"del"') || paraContent.includes('lineThrough')).toBe(true)
    expect(paraContent.includes('style":"code"')).toBe(true)
    expect(paraContent.includes('https://example.com')).toBe(true)
  })

  it('应正确解析列表', async () => {
    const md = `- 无序列表项1
- 无序列表项2
- 无序列表项3

1. 有序列表项1
2. 有序列表项2
3. 有序列表项3`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查无序列表
    const ul = content.find((node: any) => node.ul)
    expect(ul).toBeDefined()
    expect(ul.ul.length).toBe(3)

    // 检查有序列表
    const ol = content.find((node: any) => node.ol)
    expect(ol).toBeDefined()
    expect(ol.ol.length).toBe(3)
  })

  it('应正确解析表格', async () => {
    const md = `| 表头1 | 表头2 | 表头3 |
|-------|:-----:|------:|
| 左对齐 | 居中  | 右对齐 |
| 数据1  | 数据2 | 数据3 |`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 检查表格结构
    const table = content.find((node: any) => node.table)
    expect(table).toBeDefined()

    // 验证表格行数
    expect(table.table.body.length).toBe(3) // 表头+2行数据

    // 验证表头 - 注意：表头文本可能是字符串数组而不是简单字符串
    const header = table.table.body[0]
    const header0Text = Array.isArray(header[0].text) ? header[0].text[0] : header[0].text
    const header1Text = Array.isArray(header[1].text) ? header[1].text[0] : header[1].text
    const header2Text = Array.isArray(header[2].text) ? header[2].text[0] : header[2].text

    expect(header0Text).toBe('表头1')
    expect(header1Text).toBe('表头2')
    expect(header2Text).toBe('表头3')

    // 验证对齐方式
    const firstDataRow = table.table.body[1]
    expect(firstDataRow[0].alignment).toBeUndefined() // 左对齐（默认）
    expect(firstDataRow[1].alignment).toBe('center') // 居中对齐
    expect(firstDataRow[2].alignment).toBe('right') // 右对齐
  })

  it('应正确解析代码块', async () => {
    const md = "```javascript\nfunction test() {\n  console.log('Hello');\n}\n```"

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 验证代码块内容存在于内容中
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('function test()')
    expect(contentStr).toContain("console.log('Hello')")

    // 检查是否有代码块相关样式
    const hasCodeBlock = contentStr.includes('codeBlock') || contentStr.includes('pre') || contentStr.includes('code')
    expect(hasCodeBlock).toBe(true)
  })

  it('应正确解析引用块', async () => {
    const md = `> 这是一个引用
> 多行引用文本`

    const tree = await parseMarkdown(md)
    const content = await mapHastToPdfContent(tree)

    // 验证引用内容存在
    const contentStr = JSON.stringify(content)
    expect(contentStr).toContain('这是一个引用')
    expect(contentStr).toContain('多行引用文本')

    // 检查引用块特征
    const hasBlockquoteFeatures = contentStr.includes('blockquote') || contentStr.includes('blockquoteLayout')

    expect(hasBlockquoteFeatures).toBe(true)
  })
})
