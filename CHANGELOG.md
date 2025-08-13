## 0.1.0

实现内容（浏览器端 TS 库：Markdown → PDF，保留文本）：

- 解析：unified + remark-parse + remark-gfm
- 映射：标题、段落、行内（粗体/斜体/删除线/行内代码）、链接、引用、列表（含任务列表 ☑/☐）、代码块、表格（首行加粗、对齐）、图片（支持 imageResolver）
- 嵌套：列表内可嵌套有序/无序/任务列表、表格、代码块、图片、引用
- PDF：pdfmake 懒加载、VFS 初始化、文档样式（基础主题）、下载（Blob/URL）
- 字体：自定义字体注入 API（支持 CJK），默认 CJK 自动加载（检测到中文时从公共 CDN 加载，可覆盖）
- 工具：URL 字体加载器（buildFontResourceFromUrls）
- 示例：examples/vue，上传中文字体或通过 URL 加载并生成 PDF
- 测试：冒烟用例、映射用例（含嵌套/表格/图片）、中文字体注入管线（stub）

下个版本计划：

1) 支持 Markdown 内嵌 HTML（带白名单消毒）
2) PDF 样式尽可能向 GitHub Markdown 样式靠拢（标题/段落间距、代码块配色、表格线与背景等）


## 0.2.0 (unreleased)

- 新增：启用 `enableHtml` 时支持 Markdown 内嵌 HTML，管道：remark → rehype（raw + sanitize）
- 新增：HAST → pdfmake 基础映射（标题、段落、列表、引用、代码块、表格、图片、链接、br/hr）
- 改进：列表项内的行内元素与 `<br>` 聚合为同一段，避免额外换行；支持列表项内嵌套表格/代码/引用
- 安全：引入 `rehype-sanitize`，提供 `src/utils/sanitize.ts` 以合并白名单配置
- 计划：
  - 默认样式对齐 GitHub Markdown（blockquote 样式、代码块、表格等）
  - 支持受限样式映射（行内 style 白名单 → pdfmake 样式）
  - 补充测试：HAST 嵌套、样式白名单、空白处理一致性

