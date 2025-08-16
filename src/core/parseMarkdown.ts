import type { Processor } from 'unified'

export type AstFlavor = 'mdast' | 'hast'

export interface HtmlOptions {
  enableHtml?: boolean
  sanitize?: {
    allowedTags?: string[]
    allowedAttributes?: Record<string, string[]>
    allowedStyles?: Record<string, string[]>
    allowedSchemes?: string[]
  }
}

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

async function getHtmlProcessor(options: HtmlOptions = {}): Promise<Processor> {
  if (cachedHtmlProcessor) return cachedHtmlProcessor
  const [
    { unified },
    { default: remarkParse },
    { default: remarkGfm },
    { default: remarkRehype },
    { default: rehypeRaw },
    rehypeSanitizeModule,
  ] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm'),
    import('remark-rehype'),
    import('rehype-raw'),
    import('rehype-sanitize') as any,
  ])

  const rehypeSanitize = (rehypeSanitizeModule as any).default ?? rehypeSanitizeModule
  const defaultSchema = (rehypeSanitizeModule as any).defaultSchema ?? (rehypeSanitizeModule as any).schema

  // 允许危险 HTML 先进入 HAST，然后 rehype-raw 解析，再 sanitize 过滤
  const { buildSanitizeSchema } = await import('../utils/sanitize')
  const schema = buildSanitizeSchema(defaultSchema as any, {
    allowedTags: options.sanitize?.allowedTags,
    allowedAttributes: options.sanitize?.allowedAttributes,
    allowedStyles: options.sanitize?.allowedStyles,
    allowedSchemes: options.sanitize?.allowedSchemes,
  })

  cachedHtmlProcessor = (unified() as any)
    .use(remarkParse as any)
    .use(remarkGfm as any)
    .use(remarkRehype as any, { allowDangerousHtml: true })
    .use(rehypeRaw as any)
    .use(rehypeSanitize as any, schema)
  return cachedHtmlProcessor!
}

// 解析 Markdown 字符串为 AST
export async function parseMarkdown(markdown: string, htmlOptions: HtmlOptions = {}): Promise<ParseResult> {
  if (!htmlOptions.enableHtml) {
    const processor = await getMdProcessor()
    const tree = processor.parse(markdown)
    return { tree, flavor: 'mdast' }
  }

  // HTML 分支：remark → rehype（HAST），包含 raw + sanitize
  const processor = await getHtmlProcessor(htmlOptions)
  const mdast = (await getMdProcessor()).parse(markdown)
  console.log('mdast', mdast)
  const tree = await processor.run(mdast as any)
  return { tree, flavor: 'hast' }
}
