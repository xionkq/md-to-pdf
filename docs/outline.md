### 实现大纲（目录结构、分步计划与测试策略）

#### 一、建议的项目目录结构

```text
md-to-pdf/
  ├─ src/
  │  ├─ core/                 # 解析与语义层
  │  │  ├─ parseMarkdown.ts   # remark 管道封装
  │  │  ├─ types.ts           # AST/语义节点类型（必要时）
  │  │  └─ constants.ts
  │  ├─ mapping/              # remark AST → pdfmake DDO 的映射
  │  │  ├─ nodes/
  │  │  │  ├─ paragraph.ts
  │  │  │  ├─ heading.ts
  │  │  │  ├─ list.ts
  │  │  │  ├─ table.ts
  │  │  │  ├─ code.ts
  │  │  │  ├─ image.ts
  │  │  │  └─ link.ts
  │  │  └─ index.ts
  │  ├─ pdf/
  │  │  ├─ builder.ts         # 组合 pdfmake 文档定义/样式/页面设置
  │  │  ├─ fonts.ts           # 字体注册与内嵌
  │  │  └─ types.ts
  │  ├─ utils/
  │  │  ├─ images.ts          # imageResolver 默认实现
  │  │  ├─ download.ts        # 触发下载（blob→a 标签）
  │  │  └─ sanitize.ts        # HTML 开启时的消毒
  │  ├─ index.ts              # 导出 API：markdownToPdf / downloadPdf
  │  └─ styles.ts             # 主题/样式默认值
  ├─ types/                   # 对外类型（若与 src/types 分离）
  ├─ tests/                   # 单元与集成测试（vitest/jest）
  │  ├─ unit/
  │  │  ├─ mapping.heading.spec.ts
  │  │  ├─ mapping.list.spec.ts
  │  │  ├─ mapping.table.spec.ts
  │  │  ├─ mapping.code.spec.ts
  │  │  └─ pdf.fonts.spec.ts
  │  └─ e2e/
  │     └─ generate.basic.spec.ts
  ├─ examples/
  │  └─ vue/                  # 极简 Vue 示例，展示下载与字体加载（中文）
  ├─ docs/
  │  ├─ requirements.md
  │  └─ outline.md
  ├─ package.json
  ├─ tsconfig.json
  ├─ tsup.config.ts | rollup.config.ts
  ├─ README.md
  └─ LICENSE
```

> 注：当前仅提交文档与规划，不创建实现文件，避免“未完成实现”带来构建/测试失败。

#### 二、分步里程碑与验收标准

1) 初始化与基础设施
   - 任务：配置 `tsconfig`、构建工具（`tsup` 或 `rollup`）、输出 ESM+UMD、最小依赖
   - 验收：`pnpm build` 产出 `dist/`，类型声明完备，空实现打包通过

2) API 与类型骨架
   - 任务：定义 `MarkdownToPdfOptions`、`markdownToPdf`/`downloadPdf` 的签名与占位实现（抛出未实现错误）
   - 验收：类型对外可用，文档与示例能完成编译

3) 解析管道（remark）
   - 任务：封装 `remark-parse`、`remark-gfm`，输出统一 AST
   - 验收：传入基础 Markdown 得到稳定 AST（单测校验）

4) 映射层（最小可用）
   - 任务：段落、标题、链接、粗斜体、行内代码、换行
   - 验收：组合生成 pdfmake DDO，包含文本可选中；单测覆盖主要节点

5) PDF 生成与下载
   - 任务：接入 `pdfmake`（浏览器端），支持 `pageSize/pageMargins/orientation`，实现 `Blob` 与下载
   - 验收：示例中可下载 A4 PDF，文本可搜索/复制

6) 列表/引用/代码块/表格/图片
   - 任务：逐步补齐 GFM 关键模块；图片通过 `imageResolver` 支持 URL/dataURL
   - 验收：各节点对应的单测通过；表格宽度策略与换行合理

7) 字体注入与中文支持
   - 任务：允许传入自定义字体，并嵌入 PDF；提供加载字体工具
   - 验收：中文文本在 PDF 中可正确显示/复制；无字体时回退逻辑清晰

8) 页眉页脚/主题
   - 任务：实现 header/footer 回调；提供主题覆盖点（字号、颜色、间距）
   - 验收：示例可配置页码、标题，主题能覆盖代码块背景等

9) 目录（可选）与内部锚点
   - 任务：依据标题生成 TOC；支持内部跳转
   - 验收：PDF 开头含目录，点击跳转到对应页

10) 稳定性与性能
   - 任务：大文档压测、图片延迟解析、减少无用样式；CI 中跑核心用例
   - 验收：典型 200~300KB Markdown 在合理时间内生成（具体门槛在实现期标定）

11) 文档与示例
   - 任务：README、API 文档、Vue 示例项目
   - 验收：开发者可按 README 完成集成与自定义字体注入

#### 三、测试策略与用例清单

- 单元测试（AST→DDO 映射）
  - **标题**：H1~H6 字号/间距/锚点生成
  - **段落/强调**：粗体、斜体、删除线、内联代码混排
  - **列表**：有序/无序、嵌套、任务列表勾选符号
  - **引用块**：嵌套段落/列表
  - **代码块**：等宽字体、长行换行；（v1 不做语法高亮）
  - **表格**：对齐方式、单元格合并（如不支持则显式限制）、长词断行
  - **链接**：外链带下划线/颜色；无协议的相对链接行为
  - **图片**：占位/尺寸约束；URL→dataURL 失败时的降级
  - **分页标记**：`---pagebreak---` 的前后关系

- 集成测试（DDO→PDF）
  - **最小文档**：段落+标题+链接
  - **中文字体**：注入 Noto Sans SC 子集，断行/标点处理
  - **长文**：多页分页是否合理（无重叠/截断）
  - **下载**：浏览器环境模拟创建 Blob、触发下载 API

- 可靠性与错误路径
  - 字体加载失败、图片跨域失败、非法 Markdown（或空字符串）
  - HTML 开启时的白名单过滤

#### 四、关键技术决策

- 使用 `pdfmake` 的原因：文本向量化、成熟的 DDO、浏览器友好、字体内嵌能力强
- 语法高亮（v1.x/v2）：优先 `shiki` 在浏览器端产出带颜色片段（非图片）
- 数学公式（v2）：`remark-math` + KaTeX 渲染为文本/路径（避免图片）

#### 五、验收标准（v1）

- API：`markdownToPdf` 和 `downloadPdf` 可在浏览器端直接使用
- 文本：PDF 内文本可选择/搜索；中文显示正确（在提供字体时）
- GFM：标题、段落、强调、列表、任务列表、引用、代码块、表格、链接、图片
- 样式：可配置主题、页眉页脚、纸张/页边距
- 产物：ESM+UMD 构建、类型声明、MIT 许可证


