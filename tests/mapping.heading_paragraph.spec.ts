import { describe, it, expect } from 'vitest';
import { mapRemarkToPdfContent } from '../src/mapping';
import { parseMarkdown } from '../src/core/parseMarkdown';

describe('mapping: heading & paragraph & inline', () => {
  it('maps headings to styles h1~h3 and paragraphs with inline emphasis/link', async () => {
    const md = `# H1\n\n## H2\n\n### H3\n\nThis is **bold** and *em* and ~~del~~ and \`code\` and a [link](https://example.com).`;
    const { tree } = await parseMarkdown(md);
    const content = await mapRemarkToPdfContent(tree as any);

    // Expect first three items to be heading blocks with respective styles
    expect(content[0]).toMatchObject({ style: 'h1' });
    expect(content[1]).toMatchObject({ style: 'h2' });
    expect(content[2]).toMatchObject({ style: 'h3' });

    // Paragraph with inline runs
    const para = content[3];
    expect(para).toMatchObject({ style: 'paragraph' });
    const runs = (para.text as any[]);
    expect(runs.some(r => typeof r === 'object' && r.bold)).toBe(true);
    expect(runs.some(r => typeof r === 'object' && r.italics)).toBe(true);
    expect(runs.some(r => typeof r === 'object' && r.decoration === 'lineThrough')).toBe(true);
    expect(runs.some(r => typeof r === 'object' && r.style === 'code')).toBe(true);
    expect(runs.some(r => typeof r === 'object' && r.link)).toBe(true);
  });
});


