# @xionkq/md-to-pdf

将 Markdown 字符串转换为文本可选择/搜索的 PDF，浏览器端可用，TypeScript 实现，适配 Vue/React 等前端项目。

**注意**: 如果您需要转换复杂的 markdown，可以参考服务端实现方式：[md-to-pdf](https://github.com/simonhaenisch/md-to-pdf)；或者考虑转换为 html 后借用浏览器打印实现：[md2pdf](https://github.com/realdennis/md2pdf)。

## 特性

- 一键将 md 格式字符串转为 pdf 并下载
- 使用 github markdown 样式作为主题
- 适用于浏览器环境
- 支持元素嵌套
- 支持 markdown 和 html 语法
- 支持中文字体

## 在线演示（TODO）

[demo]().

## 快速入门（TODO）

安装:

```bash
npm i @xionkq/md-to-pdf
```

基础用法:

```ts
import { downloadPdf } from '@xionkq/md-to-pdf';

await downloadPdf('# Title\n\nContent', 'doc.pdf');
```

## 支持的标签和语法

### html 标签

#### 块级元素
- `<div>`, `<p>`, `<h1>` to `<h6>`
- `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`
- `<ul>`, `<ol>`, `<li>`
- `<pre>`
- `<blockquote>`

#### 行内元素
- `<span>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<s>`
- `<a>` (with support for external and internal links)
- `<sub>`, `<sup>`
- `<img>`, `<svg>`
- `<br>`, `<hr>`
- `<code>`

### markdown 语法
- 同上

## 尚不支持的语法

- 不支持中文斜体（NotoSansSC 没有斜体字体）

## 支持的行内样式

支持在HTML标签中使用 `style` 属性来设置行内样式，样式会被解析并应用到 PDF 生成中。

### 支持的标签

- `<div style="...">` - 块级元素样式
- `<p style="...">` - 段落样式  
- `<span style="...">` - 行内元素样式
- `<strong style="...">`, `<em style="...">` - 格式化元素样式

### 支持的CSS属性

#### 文字颜色
- `color: red` - CSS颜色名
- `color: #ff0000` - 十六进制
- `color: rgb(255, 0, 0)` - RGB格式

#### 背景颜色
- `background-color: yellow`
- `background: #ffff00`

#### 字体样式
- `font-weight: bold` - 粗体
- `font-style: italic` - 斜体
- `text-decoration: underline` - 下划线
- `text-decoration: line-through` - 删除线

#### 字体大小（实验性）
- `font-size: 12px` - 像素值
- `font-size: 1.2em` - 相对大小
- `font-size: 14pt` - 点值

### 颜色格式支持

支持多种CSS颜色格式：
- **颜色名**: `red`, `blue`, `green`, `orange` 等35+种标准颜色
- **十六进制**: `#ff0000`, `#f00` (3位和6位)
- **RGB**: `rgb(255, 0, 0)`
- **RGBA**: `rgba(255, 0, 0, 0.5)` (忽略透明度)
- **HSL**: `hsl(0, 100%, 50%)`

## 配置项（TODO）

## 特殊说明

### 使用图片

由于 pdfmake 仅支持在 image 节点中使用 base64 作为图片格式，因此你的源 markdown 文件应尽可能使用 base64 格式的图片，例如：

```markdown
<img src="data:image/jpeg;base64,/9j/4AAQ...">
or
[my image](data:image/jpeg;base64,/9j/4AAQ...)
```

你也可以使用 url 作为图片格式，md-to-pdf 会默认将其转为 base64，例如：

```markdown
<img src="https://example.com/image.jpg" alt="my image">
or
[my image](https://example.com/image.jpg)
```

但当图片 url 和你的应用程序不同源，则大概率会触发跨域限制。此时需要在你的应用程序中定义 imageReserver 函数用于转换 base64，并将其传入配置中，参考示例（TODO）；或者调整你的服务端使其允许跨域。

### 中文字体

当识别到 markdown 字符串中包含中文时，会自动使用 NotoSansSC 作为中文字体（通过 googlefont CDN 下载）。若无法访问 googlefont CDN 或是希望能够离线使用中文字体，则需要通过配置项 offlineFonts 传入 vfs 字体文件（[vfs 参考](https://pdfmake.github.io/docs/0.1/fonts/custom-fonts-client-side/vfs/)）。

由于通过 pdfmake 生成的 vfs_font.js 为 CommonJS 格式，在现代 ES6 项目中使用不便，本仓库的示例中提供 NotoSansCJKsc.ts 和 方正黑体简体.ts 字体文件可供使用，[参考示例](https://github.com/xionkq/md-to-pdf/blob/main/examples/dev/src/App.vue)。

```ts
const vfs = (await import('./NotoSansCJKsc')).default
await downloadPdf(markdown.value, 'example-cn.pdf', {
  offlineFonts: {
    vfs: vfs,
    fontDefinitions: {
      NotoSansCJKsc: {
        normal: 'NotoSansCJKsc-Regular.otf',
        bold: 'NotoSansCJKsc-Bold.otf',
        italics: 'NotoSansCJKsc-Regular.otf',
        bolditalics: 'NotoSansCJKsc-Bold.otf',
      },
    },
    defaultCjkFont: 'NotoSansCJKsc',
    disableNetworkFonts: true,
  },
})
```

## 计划
- ~~自定义字体~~
- ~~识别行内样式~~

## 致谢

很多标签和样式的实现参考了 [html-to-pdfmake](https://github.com/Aymkdn/html-to-pdfmake)
