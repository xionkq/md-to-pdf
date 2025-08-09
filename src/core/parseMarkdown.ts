import type { Processor } from 'unified';

// 解析结果：返回 remark AST。暂不在此处做运行期 transform，保持解析职责单一。
export interface ParseResult<T = any> { tree: T }

// 缓存 unified 处理器，避免多次初始化插件
let cachedProcessor: Processor | null = null;

async function getProcessor(): Promise<Processor> {
  if (cachedProcessor) return cachedProcessor;
  const [{ unified }, { default: remarkParse }, { default: remarkGfm }] = await Promise.all([
    import('unified'),
    import('remark-parse'),
    import('remark-gfm')
  ]);
  cachedProcessor = unified().use(remarkParse as any).use(remarkGfm as any);
  return cachedProcessor;
}

// 解析 Markdown 字符串为 AST（支持 GFM：表格、任务列表等）
export async function parseMarkdown(markdown: string): Promise<ParseResult> {
  const processor = await getProcessor();
  const tree = processor.parse(markdown);
  // If we add transforms/plugins requiring run, enable below
  // const transformed = await processor.run(tree);
  return { tree };
}


