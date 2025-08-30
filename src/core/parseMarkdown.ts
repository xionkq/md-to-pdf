import type { Processor } from 'unified'

export type AstFlavor = 'mdast' | 'hast'

// 解析结果：返回 remark AST（mdast）或 HAST（当启用 HTML）
export interface ParseResult<T = any> {
  tree: T
  flavor: AstFlavor
}

// 缓存 unified 处理器，避免多次初始化插件
let cachedMdProcessor: Processor | null = null
let cachedHtmlProcessor: Processor | null = null

async function getMdProcessor(): Promise<Processor> {
  if (cachedMdProcessor) return cachedMdProcessor
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm'),
  ])
  cachedMdProcessor = unified()
    .use(remarkParse as any)
    .use(remarkGfm as any)
  return cachedMdProcessor
}

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
export async function parseMarkdown(markdown: string, enableHtml?: boolean): Promise<ParseResult> {
  const mdast = (await getMdProcessor()).parse(markdown)

  if (!enableHtml) {
    return { tree: mdast, flavor: 'mdast' }
  }

  // HTML 分支
  const processor = await getHtmlProcessor()
  const hast = await processor.run(mdast as any)
  return { tree: hast, flavor: 'hast' }
}
