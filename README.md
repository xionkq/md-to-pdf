### md-to-pdf

将 Markdown 字符串转换为文本可选择/搜索的 PDF（非截图），浏览器端可用，TypeScript 实现，适配 Vue/React 等前端项目。

安装（待发布到 npm 后）：

```bash
npm i @your-scope/md-to-pdf
```

使用：

```ts
import { downloadPdf } from '@your-scope/md-to-pdf';

await downloadPdf('# 标题\n\n内容', 'doc.pdf');
```

更多需求、设计与规划见 `docs/requirements.md` 与 `docs/outline.md`。

默认中文字体：
- 当文档包含 CJK 字符且未提供 `fonts/defaultFont` 时，库会尝试通过公共 CDN 加载一个默认中文字体（Noto Sans SC Regular）。
- 若不希望联网或需自定义，建议自行提供 `fonts` 与 `defaultFont`，或在构建时替换默认 URL。

字体注入（中文示例）：

```ts
import { downloadPdf } from '@your-scope/md-to-pdf';

// 假设你通过 fetch/loader 得到 ArrayBuffer 或 base64
const fontBuffer = await fetch('https://your-cdn/fonts/NotoSansSC-Regular.subset.ttf').then(r => r.arrayBuffer());

await downloadPdf('# 标题\n\n这是一段中文文本', 'cn.pdf', {
  fonts: [{
    name: 'NotoSansSC',
    normal: fontBuffer,
  }],
  defaultFont: 'NotoSansSC'
});
```


### ✨ GitHub 样式对齐 (v0.2.0)

现已支持与 GitHub Markdown 完全对齐的样式：

- **标题样式**：H1/H2 底部边框，GitHub 标准字号和间距
- **代码块**：GitHub 标准背景色 (#f6f8fa) 和内边距
- **表格**：表头背景色，标准边框和单元格内边距
- **引用块**：左侧彩色边框 (#d0d7de)，灰色文字
- **链接**：GitHub 蓝色 (#0969da)
- **完整配色方案**：与 GitHub.com 保持一致

查看完整样式演示：`examples/github-styles-demo.md`

### 路线图（下一步）

- ✅ ~~默认样式向 GitHub Markdown 靠拢（blockquote、code、table 等）~~
- 受限样式映射：解析 HTML 行内 style 白名单并映射到 pdfmake
- 代码语法高亮（集成 Shiki）
- 数学公式支持（KaTeX）

