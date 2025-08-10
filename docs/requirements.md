### 需求文档（Markdown 转 PDF，保留文本，浏览器端/TS，可在 Vue 中即插即用）

- **项目目标**
  - **将 Markdown 字符串转为可下载的 PDF 文件，PDF 内为可选择/搜索的文本（不走 canvas 截图路线）**
  - 面向浏览器环境，TypeScript 实现，可直接在 Vue/React 等前端项目使用
  - 提供简单易用的 API（函数式为主），支持按需扩展（字体、样式、页眉页脚等）

- **技术路线（核心选型）**
  - **Markdown 解析**: 使用 `remark`（`remark-parse` + `remark-gfm` + 可选 `remark-breaks`）得到 AST
  - **PDF 渲染**: 使用 `pdfmake` 生成 PDF（文本向量化，支持段落、列表、表格、链接、页眉页脚等）
  - **AST 映射**: 自行实现 remark AST → pdfmake DDO（Document Definition Object）的映射层，保证可控与可扩展
  - **字体支持**: 允许外部传入 Web 字体并嵌入 PDF（支持中文等 CJK 字形），默认提供基础拉丁字体；中文字体可选依赖/动态加载

- **必须满足**
  - **保留文本**（PDF 中可复制、可搜索、可高亮）
  - **纯前端**运行，无需服务端
  - **TypeScript** 类型完整导出
  - **ESM 与 UMD** 双构建（支持 `import` 与 `<script>` 引入）
  - **可定制页面**：纸张大小（默认 A4）、页边距、纵横向、页眉/页脚
  - **GFM 支持**：标题、段落、加粗/斜体、删除线、内联代码、代码块、引用、无序/有序列表、任务列表、表格、链接、图片
  - **链接处理**：外链可点击；支持内部目录（可选）
  - **图片处理**：支持通过 URL 或 dataURL 插入（内嵌到 PDF）
  - **下载与返回**：可一键下载，也可返回 `Blob`/`Uint8Array` 交由调用方处理
  - **安全**：默认不执行 HTML，若开启 HTML 支持需做消毒策略

- **非目标/暂不支持（v1）**
  - 复杂的分页控制（例如“段落不可拆分”按字粒度控制）仅提供基础能力
  - 数学公式（可列为 v2，计划接入 `remark-math` + KaTeX→向量文字/路径）
  - 富排版如浮动图片、两栏排版、脚注自动分页回流（v2 规划）

- **API 设计（拟定）**
  ```ts
  export type PageSize = 'A4' | 'A3' | 'Letter' | { width: number; height: number };

  export interface FontResource {
    name: string;                 // 逻辑名，如 'NotoSansSC'
    normal: ArrayBuffer | string; // 字体资源（ArrayBuffer 或 base64）
    bold?: ArrayBuffer | string;
    italics?: ArrayBuffer | string;
    bolditalics?: ArrayBuffer | string;
  }

  export interface MarkdownToPdfOptions {
    pageSize?: PageSize;
    pageMargins?: [number, number, number, number]; // [left, top, right, bottom]
    pageOrientation?: 'portrait' | 'landscape';
    defaultFont?: string;         // 默认字体名
    fonts?: FontResource[];       // 需内嵌的字体资源
    theme?: {
      baseFontSize?: number;      // 基础字号
      headingFontSizes?: number[];// H1~H6
      code?: { font?: string; fontSize?: number; background?: string };
      linkColor?: string;
      table?: { headerFill?: string; borderColor?: string };
    };
    enableHtml?: boolean;         // 可选：允许 Markdown 内 HTML（需消毒）
    header?: (currentPage: number, pageCount: number) => any; // pdfmake 头部定义
    footer?: (currentPage: number, pageCount: number) => any; // pdfmake 底部定义
    toc?: boolean;                // 是否自动生成目录
    imageResolver?: (src: string) => Promise<string>; // 将图片 URL 转为 dataURL
    onProgress?: (phase: 'parse' | 'layout' | 'emit') => void;
    debug?: boolean;
    locale?: 'zh' | 'en' | string;
  }

  export interface MarkdownPdfResult {
    blob: Blob;
    uint8?: Uint8Array; // 可选返回
  }

  export function markdownToPdf(markdown: string, options?: MarkdownToPdfOptions): Promise<MarkdownPdfResult>;
  export function downloadPdf(markdown: string, fileName: string, options?: MarkdownToPdfOptions): Promise<void>;
  ```

- **字体策略（关键）**
  - 默认内置体积小的拉丁字体，保证最小包体
  - 中文等 CJK 建议在业务侧通过 `fonts` 传入以便嵌入 PDF（例如 `Noto Sans SC` 子集）
  - 提供工具方法：远程获取字体 ArrayBuffer -> base64（在下载前异步加载）
  - 文本将以对应字体嵌入，确保 PDF 可复制与跨平台显示一致

- **分页与样式**
  - 基础分页：根据 pdfmake 的自动换行和 `pageBreak: 'before' | 'after' | 'auto'`
  - 可约定分隔标记：如在 Markdown 中写 `---pagebreak---` 触发分页
  - 主题：标题层级字号、间距、代码块背景、链接颜色、表格样式可覆写

- **表格、列表与代码块**
  - GFM 表格：自适应列宽，最小/最大宽度策略，超长单词换行
  - 列表：支持嵌套，任务列表带复选标识
  - 代码块：等宽字体、可选语法高亮（v2：集成 `shiki` 生成带颜色的文本/背景块）

- **图片**
  - 支持 Markdown 标准图片语法
  - 通过 `imageResolver` 将 URL 转为 dataURL（默认实现可内置，跨域源需用户保证可读）
  - 支持图片缩放、最大宽度自适应页面

- **超链接与目录**
  - 外链：可点击打开
  - 内部目录（可选）：根据标题自动生成 TOC，或在文首插入目录页

- **PDF 元数据**
  - 支持 `title/author/subject/keywords/creator/producer/creationDate` 等元数据设置（由 options 扩展）

- **性能与体积**
  - 构建输出：ESM + UMD，生产版本 tree-shaking，去除调试代码
  - 字体按需加载与嵌入，避免默认打包大体积 CJK 字体
  - 大文档内存控制：图片延迟解析、可选流式生成（pdfmake 本身按文档生成，v2 评估增量/分页输出）

- **错误处理**
  - Markdown 解析错误、图片加载失败、字体加载失败：提供明确错误类型与信息
  - 可选 `onProgress` 回调用于 UI 反馈

- **安全**
  - 默认不允许 HTML（纯 Markdown）
  - 若开启 HTML，默认会进行白名单消毒（链接 rel、目标、style 白名单）

- **测试与示例**
  - 单元测试：AST→DDO 映射（标题、列表、表格、代码、分页标记、链接）
  - 视觉对比样例：示例 Markdown→PDF 对照
  - 示例站点：简单页面上传/输入 Markdown，一键预览与下载

- **发布与兼容**
  - NPM 包：`@your-scope/md-to-pdf`
  - 类型声明内置
  - 运行环境：现代浏览器（ES2018+），支持 Vite、Webpack
  - 许可证：MIT

- **路线图**
  - v1：核心渲染、字体注入、GFM 基础、下载/返回 Blob、主题、页眉页脚
  - v1.x：目录生成、内部锚点、代码高亮（shiki）
  - v2：数学公式（KaTeX）、更强分页控制、可选服务端渲染适配

 - **已知限制**
   - 复杂排版（多栏/环绕）不在 v1
   - CJK 字体体积较大，建议使用子集或业务方 CDN 按需加载
   - 图片跨域需业务侧处理 CORS

---

### 下一步计划（v0.2.x）

- 嵌套 HTML（HAST）完善
  - 覆盖更多标签嵌套场景：列表项内 `table/blockquote/pre/code/hr/img` 与行内/块级混排；表格内的段内换行 `<br>` 等
  - 更健壮的空白折叠策略：忽略根级空白文本节点、列表项开头的换行，避免额外空行

- 默认样式对齐 GitHub Markdown
  - 段落/标题间距、`<blockquote>` 左边框、代码块背景与内边距、`<table>` 行高/表头背景/间隔线、链接颜色/下划线
  - 通过 `theme` 可覆盖，默认主题尽量贴近 GitHub 渲染

- 受限样式映射（HTML）
  - 行内 `style` 白名单解析与映射：`font-weight/font-style/text-decoration/color/background-color/text-align`、块级 `margin*`、图片 `width/height`
  - 严格过滤危险属性与值（`position/float/display/transform/filter/url()` 等），并限制单位与范围

- 测试用例补充
  - HAST 嵌套：列表内表格/代码块/引用、表格内 `<br>`、标题/段落/表格混排
  - 样式白名单：允许属性生效、越权样式被忽略
  - 空白处理：启用 HTML 前后渲染一致性（避免意外空行）

