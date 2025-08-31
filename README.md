# @xionkq/md-to-pdf

Convert Markdown strings to text-searchable/selectable PDF (not screenshots), usable in browsers, implemented in TypeScript, compatible with Vue/React and other frontend projects.

**Note**: If you need to convert complex markdown, consider server-side implementations like [md-to-pdf](https://github.com/simonhaenisch/md-to-pdf); or convert to HTML first and use browser printing: [md2pdf](https://github.com/realdennis/md2pdf).

## Features

- One-click conversion from md format strings to PDF with download
- Uses GitHub markdown styles as theme
- Works in browser environments
- Supports element nesting
- Supports markdown and HTML syntax
- Supports Chinese fonts

## Online Demo (TODO)

[demo]().

## Quick Start

Install:

```bash
npm i @xionkq/md-to-pdf
```

Basic usage:

```ts
import { downloadPdf } from '@xionkq/md-to-pdf';

await downloadPdf('# Title\n\nContent', 'doc.pdf');
```

## Supported Tags and Syntax

### HTML Tags

#### Block Elements
- `<div>`, `<p>`, `<h1>` to `<h6>`
- `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`
- `<ul>`, `<ol>`, `<li>`
- `<pre>`
- `<blockquote>`

#### Inline Elements
- `<span>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<s>`
- `<a>` (with support for external and internal links)
- `<sub>`, `<sup>`
- `<img>`, `<svg>`
- `<br>`, `<hr>`
- `<code>`

### Markdown Syntax
- Same as above

## Unsupported Syntax

- Chinese italic text is not supported (NotoSansSC doesn't have italic fonts)

## Configuration Options (TODO)

## Special Notes

### Using Images

Since pdfmake only supports base64 format for image nodes, your source markdown files should preferably use base64 format images, for example:

```markdown
<img src="data:image/jpeg;base64,/9j/4AAQ...">
or
[html-to-pdfmake](data:image/jpeg;base64,/9j/4AAQ...)
```

You can also use URLs as image format, md-to-pdf will automatically convert them to base64, for example:

```markdown
<img src="https://example.com/image.jpg" alt="my image">
or
[my image](https://example.com/image.jpg)
```

However, when the image URL is not same-origin with your application, it will likely trigger CORS restrictions. In this case, you need to define an imageReserver function in your application to convert to base64 and pass it in the configuration, see examples (TODO); or adjust your server to allow cross-origin requests.

### Chinese Fonts

When Chinese characters are detected in the string, NotoSansSC will automatically be used as the Chinese font.

## Roadmap
- Custom fonts
- Recognize inline styles

## Credits

Many tag and style implementations reference [html-to-pdfmake](https://github.com/Aymkdn/html-to-pdfmake)
