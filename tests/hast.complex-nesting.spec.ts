import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/core/parseMarkdown';
import { mapHastToPdfContent } from '../src/mapping/hast';

describe('HAST: complex nesting scenarios', () => {
  describe('列表项内嵌套复杂元素', () => {
    it('列表项内包含表格', async () => {
      const md = `
- 这是一个包含表格的列表项

  | 列1 | 列2 |
  |-----|-----|
  | 内容A | 内容B |
  
- 另一个普通列表项
`;
      const { tree } = await parseMarkdown(md, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('列表项内表格测试结果:', JSON.stringify(content, null, 2));
      
      // 应该找到包含表格的列表
      const ul = content.find((c: any) => 'ul' in c);
      expect(ul).toBeTruthy();
      
      // 第一个列表项应该包含表格
      const firstItem = ul.ul[0];
      const hasTable = JSON.stringify(firstItem).includes('"table"');
      expect(hasTable).toBe(true);
    });

    it('列表项内包含代码块', async () => {
      const md = `
- 这是一个包含代码块的列表项

  \`\`\`javascript
  console.log('Hello World');
  \`\`\`
  
- 另一个普通列表项
`;
      const { tree } = await parseMarkdown(md, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('列表项内代码块测试结果:', JSON.stringify(content, null, 2));
      
      const ul = content.find((c: any) => 'ul' in c);
      expect(ul).toBeTruthy();
      
      // 第一个列表项应该包含代码块
      const firstItem = ul.ul[0];
      const hasCodeBlock = JSON.stringify(firstItem).includes('"style":"code"');
      expect(hasCodeBlock).toBe(true);
    });

    it('列表项内包含引用块', async () => {
      const md = `
- 这是一个包含引用的列表项

  > 这是一段引用内容
  > 可能有多行
  
- 另一个普通列表项
`;
      const { tree } = await parseMarkdown(md, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('列表项内引用块测试结果:', JSON.stringify(content, null, 2));
      
      const ul = content.find((c: any) => 'ul' in c);
      expect(ul).toBeTruthy();
      
      // 第一个列表项应该包含引用块（通过margin特征识别）
      const firstItem = ul.ul[0];
      const hasQuote = JSON.stringify(firstItem).includes('[8,4,0,8]') || 
                       JSON.stringify(firstItem).includes('"stack"');
      expect(hasQuote).toBe(true);
    });

    it('列表项内包含图片', async () => {
      const md = `
- 这是一个包含图片的列表项

  ![测试图片](https://example.com/test.jpg)
  
- 另一个普通列表项
`;
      const { tree } = await parseMarkdown(md, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('列表项内图片测试结果:', JSON.stringify(content, null, 2));
      
      const ul = content.find((c: any) => 'ul' in c);
      expect(ul).toBeTruthy();
      
      // 应该包含图片alt文本（因为没有imageResolver）
      const contentStr = JSON.stringify(content);
      expect(contentStr).toContain('测试图片');
    });
  });

  describe('表格内复杂内容', () => {
    it('表格单元格内包含换行', async () => {
      const html = `
<table>
  <tr>
    <th>列1</th>
    <th>列2</th>
  </tr>
  <tr>
    <td>第一行<br/>第二行</td>
    <td>普通内容</td>
  </tr>
</table>
`;
      const { tree } = await parseMarkdown(html, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('表格内换行测试结果:', JSON.stringify(content, null, 2));
      
      const table = content.find((c: any) => 'table' in c);
      expect(table).toBeTruthy();
      
      // 检查是否正确处理了<br>标签
      const tableStr = JSON.stringify(table);
      expect(tableStr).toContain('第一行');
      expect(tableStr).toContain('第二行');
    });

    it('表格单元格内包含段落', async () => {
      const html = `
<table>
  <tr>
    <th>列1</th>
    <th>列2</th>
  </tr>
  <tr>
    <td>
      <p>第一段内容</p>
      <p>第二段内容</p>
    </td>
    <td>普通内容</td>
  </tr>
</table>
`;
      const { tree } = await parseMarkdown(html, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('表格内段落测试结果:', JSON.stringify(content, null, 2));
      
      const table = content.find((c: any) => 'table' in c);
      expect(table).toBeTruthy();
      
      const tableStr = JSON.stringify(table);
      expect(tableStr).toContain('第一段内容');
      expect(tableStr).toContain('第二段内容');
    });
  });

  describe('空白处理问题', () => {
    it('列表项开头不应有多余空行', async () => {
      const md = `
- 第一项

- 第二项
  
  这是第二项的内容

- 第三项
`;
      const { tree } = await parseMarkdown(md, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('空白处理测试结果:', JSON.stringify(content, null, 2));
      
      const ul = content.find((c: any) => 'ul' in c);
      expect(ul).toBeTruthy();
      
      // 检查是否有多余的空白内容
      const contentStr = JSON.stringify(content);
      const emptyTextMatches = contentStr.match(/"text":"[\s\n\r]*"/g);
      
      // 不应该有大量空白文本
      if (emptyTextMatches) {
        console.log('发现的空白文本:', emptyTextMatches);
        expect(emptyTextMatches.length).toBeLessThan(5);
      }
    });

    it('根级空白文本应被忽略', async () => {
      const html = `
  
  <h1>标题</h1>
  
  <p>段落内容</p>
  
  `;
      const { tree } = await parseMarkdown(html, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('根级空白测试结果:', JSON.stringify(content, null, 2));
      
      // 应该只有2个有意义的内容项
      const meaningfulContent = content.filter((c: any) => {
        if (typeof c === 'string') return c.trim().length > 0;
        if (c.text && typeof c.text === 'string') return c.text.trim().length > 0;
        return true;
      });
      
      // 现在H1会添加边框，所以有3个元素：H1标题、H1边框、段落
      expect(meaningfulContent.length).toBe(3);
    });
  });

  describe('深度嵌套混合场景', () => {
    it('列表内嵌套列表，内含表格和代码', async () => {
      const md = `
- 外层列表项1
  - 内层列表项1
    
    | 列1 | 列2 |
    |-----|-----|
    | A   | B   |
    
  - 内层列表项2
    
    \`\`\`js
    console.log('test');
    \`\`\`
    
- 外层列表项2
`;
      const { tree } = await parseMarkdown(md, { enableHtml: true });
      const content = await mapHastToPdfContent(tree as any);
      
      console.log('深度嵌套测试结果:', JSON.stringify(content, null, 2));
      
      const ul = content.find((c: any) => 'ul' in c);
      expect(ul).toBeTruthy();
      
      // 应该包含嵌套的ul、table和code
      const contentStr = JSON.stringify(content);
      expect(contentStr).toContain('"ul"');
      expect(contentStr).toContain('"table"');
      expect(contentStr).toContain('"style":"code"');
    });
  });
});
