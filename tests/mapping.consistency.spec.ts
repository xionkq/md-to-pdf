import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/core/parseMarkdown'
import { mapHastToPdfContent as mapHastToPdfContentLegacy } from '../src/mapping/hast'

describe('Legacy映射问题测试 - 已修复的历史问题记录', () => {
  describe('代码重复问题验证', () => {
    it('blockquote中的代码块应与外部代码块一致', async () => {
      // 外部代码块
      const externalCodeMd = '```js\nconsole.log("test");\n```'
      const externalTree = await parseMarkdown(externalCodeMd)
      const externalContent = await mapHastToPdfContentLegacy(externalTree)

      // blockquote中的代码块
      const quotedCodeMd = '> ```js\n> console.log("test");\n> ```'
      const quotedTree = await parseMarkdown(quotedCodeMd)
      const quotedContent = await mapHastToPdfContentLegacy(quotedTree)

      // 提取代码块内容进行比较
      const externalCodeText = JSON.stringify(externalContent).match(/"console\.log\(\"test\"\);"/)?.[0]
      const quotedCodeText = JSON.stringify(quotedContent).match(/"console\.log\(\"test\"\);"/)?.[0]

      expect(externalCodeText).toBeDefined()
      expect(quotedCodeText).toBeDefined()
      expect(externalCodeText).toBe(quotedCodeText)
    })

    it('列表中的代码块应与外部代码块一致', async () => {
      // 外部代码块
      const externalCodeMd = '```python\nprint("hello")\n```'
      const externalTree = await parseMarkdown(externalCodeMd)
      const externalContent = await mapHastToPdfContentLegacy(externalTree)

      // 列表中的代码块
      const listCodeMd = '- 代码示例：\n  ```python\n  print("hello")\n  ```'
      const listTree = await parseMarkdown(listCodeMd)
      const listContent = await mapHastToPdfContentLegacy(listTree)

      // 验证两者都包含相同的代码内容
      const externalStr = JSON.stringify(externalContent)
      const listStr = JSON.stringify(listContent)

      expect(externalStr).toContain('print(\\"hello\\")')
      expect(listStr).toContain('print(\\"hello\\")')
    })

    it('表格中的格式化文本应与外部格式化文本一致', async () => {
      // 外部格式化文本
      const externalMd = '**粗体** *斜体* `代码`'
      const externalTree = await parseMarkdown(externalMd)
      const externalContent = await mapHastToPdfContentLegacy(externalTree)

      // 表格中的格式化文本
      const tableMd = `| 格式化文本 |
|-----------|
| **粗体** *斜体* \`代码\` |`
      const tableTree = await parseMarkdown(tableMd)
      const tableContent = await mapHastToPdfContentLegacy(tableTree)

      // 验证格式化效果存在
      const externalStr = JSON.stringify(externalContent)
      const tableStr = JSON.stringify(tableContent)

      // 检查粗体
      const hasBoldExternal = externalStr.includes('"style":"b"') || externalStr.includes('bold')
      const hasBoldTable = tableStr.includes('"style":"b"') || tableStr.includes('bold')
      expect(hasBoldExternal).toBe(true)
      expect(hasBoldTable).toBe(true)

      // 检查斜体
      const hasItalicExternal = externalStr.includes('italics')
      const hasItalicTable = tableStr.includes('italics')
      expect(hasItalicExternal).toBe(true)
      expect(hasItalicTable).toBe(true)

      // 检查代码
      const hasCodeExternal = externalStr.includes('"style":"code"')
      const hasCodeTable = tableStr.includes('"style":"code"')
      expect(hasCodeExternal).toBe(true)
      expect(hasCodeTable).toBe(true)
    })
  })

  describe('递归处理不一致问题', () => {
    it('div中的嵌套元素应被正确处理', async () => {
      const md = `<div>
  <p>段落1</p>
  <ul>
    <li>列表项</li>
  </ul>
  <p>段落2</p>
</div>`

      const tree = await parseMarkdown(md)
      const content = await mapHastToPdfContentLegacy(tree)

      const contentStr = JSON.stringify(content)

      // 验证所有内容都被处理
      expect(contentStr).toContain('段落1')
      expect(contentStr).toContain('列表项')
      expect(contentStr).toContain('段落2')

      // 验证列表结构存在
      expect(contentStr).toContain('"ul":')
    })

    it('复杂嵌套应保持结构完整性', async () => {
      const md = `- 列表项1
- 包含引用的列表项：
  > 引用中的文本
  > 
  > - 引用中的嵌套列表
  > - 另一个列表项
- 最后一个列表项`

      const tree = await parseMarkdown(md)
      const content = await mapHastToPdfContentLegacy(tree)

      const contentStr = JSON.stringify(content)

      // 验证所有文本内容存在
      expect(contentStr).toContain('列表项1')
      expect(contentStr).toContain('包含引用的列表项')
      expect(contentStr).toContain('引用中的文本')
      expect(contentStr).toContain('引用中的嵌套列表')
      expect(contentStr).toContain('另一个列表项')
      expect(contentStr).toContain('最后一个列表项')

      // 验证结构特征存在
      expect(contentStr).toContain('"ul":') // 外层列表
      expect(contentStr.includes('blockquote') || contentStr.includes('blockquoteLayout')).toBe(true) // 引用块
    })
  })

  describe('样式合并不一致问题', () => {
    it('blockquote中的元素样式应正确合并', async () => {
      const md = `> **粗体文本**
> 
> *斜体文本*
> 
> \`行内代码\``

      const tree = await parseMarkdown(md)
      const content = await mapHastToPdfContentLegacy(tree)

      const contentStr = JSON.stringify(content)

      // 验证blockquote特征存在
      expect(contentStr.includes('blockquote') || contentStr.includes('blockquoteLayout')).toBe(true)

      // 验证格式化文本存在
      expect(contentStr.includes('"style":"b"') || contentStr.includes('bold')).toBe(true)
      expect(contentStr.includes('italics')).toBe(true)
      expect(contentStr.includes('"style":"code"')).toBe(true)
    })

    it('列表项中的样式应正确应用', async () => {
      const md = `1. **第一项**包含粗体
2. *第二项*包含斜体  
3. 第三项包含\`代码\``

      const tree = await parseMarkdown(md)
      const content = await mapHastToPdfContentLegacy(tree)

      const contentStr = JSON.stringify(content)

      // 验证有序列表存在
      expect(contentStr).toContain('"ol":')

      // 验证各种格式化文本
      expect(contentStr.includes('"style":"b"') || contentStr.includes('bold')).toBe(true)
      expect(contentStr.includes('italics')).toBe(true)
      expect(contentStr.includes('"style":"code"')).toBe(true)
    })
  })

  describe('异步处理不一致问题', () => {
    it('不同处理器对图片的处理应一致', async () => {
      // div中的图片
      const divImgMd = `<div>
  <img src="data:image/png;base64,iVBOR" alt="测试图片">
</div>`

      // 列表中的图片
      const listImgMd = `- 列表项
- ![测试图片](data:image/png;base64,iVBOR)`

      const divTree = await parseMarkdown(divImgMd)
      const divContent = await mapHastToPdfContentLegacy(divTree)

      const listTree = await parseMarkdown(listImgMd)
      const listContent = await mapHastToPdfContentLegacy(listTree)

      const divStr = JSON.stringify(divContent)
      const listStr = JSON.stringify(listContent)

      // 验证两者都包含图片处理
      expect(divStr.includes('image') || divStr.includes('测试图片')).toBe(true)
      expect(listStr.includes('image') || listStr.includes('测试图片')).toBe(true)
    })
  })

  describe('错误处理一致性', () => {
    it('各处理器对未知元素的处理应一致', async () => {
      const md = `<unknowntag>未知元素内容</unknowntag>

- <anothertag>列表中的未知元素</anothertag>

> <thirdtag>引用中的未知元素</thirdtag>`

      const tree = await parseMarkdown(md)
      const content = await mapHastToPdfContentLegacy(tree)

      const contentStr = JSON.stringify(content)

      // 验证未知元素的文本内容都被保留
      expect(contentStr).toContain('未知元素内容')
      expect(contentStr).toContain('列表中的未知元素')
      expect(contentStr).toContain('引用中的未知元素')
    })

    it('空内容处理应一致', async () => {
      const md = `- 
- 
-  

> 
> 

| 空表格 |
|--------|
|        |`

      const tree = await parseMarkdown(md)
      const content = await mapHastToPdfContentLegacy(tree)

      // 验证不会崩溃，且生成有效的内容结构
      expect(content).toBeDefined()
      expect(Array.isArray(content)).toBe(true)
    })
  })
})
