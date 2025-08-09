import type { Processor } from 'unified';

export interface ParseResult<T = any> {
  tree: T;
}

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

export async function parseMarkdown(markdown: string): Promise<ParseResult> {
  const processor = await getProcessor();
  const tree = processor.parse(markdown);
  // If we add transforms/plugins requiring run, enable below
  // const transformed = await processor.run(tree);
  return { tree };
}


