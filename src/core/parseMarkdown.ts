import type { Processor } from 'unified'
import { HastNodeBase } from "../types";

// 缓存 unified 处理器，避免多次初始化插件
let cachedHtmlProcessor: Processor | null = null

async function getHtmlProcessor(): Promise<Processor> {
  if (cachedHtmlProcessor) return cachedHtmlProcessor
  const [
    { unified },
    { default: remarkParse },
    { default: remarkGfm },
    { default: remarkRehype },
    { default: rehypeRaw },
  ] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm'),
    import('remark-rehype'),
    import('rehype-raw'),
  ])

  cachedHtmlProcessor = unified()
    .use(remarkParse as any)
    .use(remarkGfm as any)
    .use(remarkRehype as any, { allowDangerousHtml: true })
    .use(rehypeRaw as any)
  return cachedHtmlProcessor
}

// 解析 Markdown 字符串为 AST
export async function parseMarkdown(markdown: string): Promise<HastNodeBase> {
  const processor = await getHtmlProcessor()
  return await processor.run(processor.parse(markdown))
}
