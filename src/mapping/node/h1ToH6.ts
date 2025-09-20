import { createH1Border } from '../../styles/github-borders'
import { textFromChildren } from '../utils'

export function handleH1ToH6Node(node: any, content: any[]) {
  const level = Number((node.tagName || '').toLowerCase()[1])
  const txt = textFromChildren(node.children || [])

  // 添加标题内容
  content.push({ text: txt, style: `h${level}` })

  // GitHub 样式：H1 和 H2 添加底部边框
  if (level === 1 || level === 2) {
    content.push(createH1Border())
  }
}
