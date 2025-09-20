import { handleImgNode } from './img'
import { handleSvgNode } from './svg'
import { handleInlineNode } from './inline'

// TODO: 待验证：似乎只处理了行内标签，应该需要递归
export async function handleDivNode(node: any, content: any[], ir?: any) {
  const children = node.children || []
  const hasImage = !!children.find(
    (c: any) => c.type === 'element' && (c.tagName?.toLowerCase() === 'img' || c.tagName?.toLowerCase() === 'svg')
  )
  if (hasImage) {
    let runs: any[] = []
    const flush = () => {
      if (runs.length) {
        const filteredRuns = runs.filter((r) => typeof r !== 'string' || r.trim().length > 0)
        if (filteredRuns.length) content.push({ text: filteredRuns, style: 'p' })
        runs = []
      }
    }
    for (const ch of children) {
      if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'img') {
        flush()
        content.push(await handleImgNode(ch, ir))
      } else if (ch.type === 'element' && ch.tagName?.toLowerCase() === 'svg') {
        content.push({ svg: handleSvgNode(ch) })
      } else {
        runs.push(...handleInlineNode([ch] as any))
      }
    }
    flush()
  } else {
    const inlineContent = handleInlineNode(children)
    const filteredContent = inlineContent.filter((c) => typeof c !== 'string' || c.trim().length > 0)
    if (filteredContent.length) {
      content.push({ text: filteredContent, style: 'p' })
    }
  }
}
