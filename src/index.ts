import type { Processor } from 'unified'
import { parseMarkdown } from './core/parseMarkdown'
// import { mapRemarkToPdfContent } from './mapping'
import { buildDocDefinition } from './pdf/builder'
import { registerFonts } from './pdf/fonts'
import { loadDefaultCjkFont } from './pdf/defaultCjk'
import { mapHastToPdfContent } from './mapping/hast'
import { createLayout } from './styles'

/**
 * 核心导出：对外暴露的类型与 API。该文件串联解析、映射与 pdfmake 生成流程。
 * 设计目标：
 * - 仅在需要时懒加载第三方库，尽量减小初始包体与首屏成本
 * - 保持浏览器端可用（不依赖 Node 特性），但测试中允许注入 stub 的 pdfMake 实例
 */

export type PageSize = 'A4' | 'A3' | 'Letter' | { width: number; height: number }

export interface FontResource {
  name: string
  normal: ArrayBuffer | string
  bold?: ArrayBuffer | string
  italics?: ArrayBuffer | string
  bolditalics?: ArrayBuffer | string
}

export interface MarkdownToPdfOptions {
  pageSize?: PageSize
  pageMargins?: [number, number, number, number]
  pageOrientation?: 'portrait' | 'landscape'
  // defaultFont?: string
  // fonts?: FontResource[]
  /** For testing or advanced usage: provide a custom pdfMake instance */
  pdfMakeInstance?: any
  enableHtml?: boolean
  header?: (currentPage: number, pageCount: number) => any
  footer?: (currentPage: number, pageCount: number) => any
  imageResolver?: (src: string) => Promise<string>
  onProgress?: (phase: 'parse' | 'layout' | 'emit') => void
}

export interface MarkdownPdfResult {
  blob: Blob
  uint8?: Uint8Array
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export async function markdownToPdf(markdown: string, options: MarkdownToPdfOptions = {}): Promise<MarkdownPdfResult> {
  // 仅在浏览器环境运行，避免 SSR/Node 环境下误用
  invariant(
    typeof window !== 'undefined' && typeof document !== 'undefined',
    'markdownToPdf: must run in browser environment'
  )
  invariant(typeof markdown === 'string', 'markdownToPdf: markdown must be a string')

  options.onProgress?.('parse')
  // 解析 Markdown → remark AST（含 GFM 扩展）
  const tree = await parseMarkdown(markdown)
  options.onProgress?.('layout')

  // 将 AST 映射为 pdfmake 的内容结构
  let pdfContent = await mapHastToPdfContent(tree, { imageResolver: options.imageResolver })
  // 生成基础文档定义（页面尺寸、边距、样式、页眉/页脚）
  const docDefinition = buildDocDefinition(pdfContent, options)

  options.onProgress?.('emit')
  // 懒加载 pdfmake，或在测试中注入自定义实例
  // 未找到 pdfmake 实例类型定义文件，因此使用 any
  const pdfMakeAny: any = options.pdfMakeInstance ?? (await import('pdfmake/build/pdfmake.js'))
  const pdfMakeResolved: any = (pdfMakeAny as any).default ?? pdfMakeAny
  const vfsModule: any = await import('pdfmake/build/vfs_fonts.js')
  const vfs: any = (vfsModule as any).vfs ?? (vfsModule as any).default ?? vfsModule
  if (pdfMakeResolved && typeof pdfMakeResolved.addVirtualFileSystem === 'function') {
    try {
      pdfMakeResolved.addVirtualFileSystem(vfs)
    } catch {}
  } else if (!pdfMakeResolved.vfs) {
    try {
      pdfMakeResolved.vfs = vfs
    } catch {
      try {
        Object.assign(pdfMakeResolved.vfs, vfs)
      } catch {}
    }
  }

  // 注册配置中提供的字体
  // let registered = registerFonts(pdfMakeResolved, options)
  let registered = null

  // 检测到 md 中包含中文，则加载中文字体文件
  const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(markdown)
  if (hasCjk) {
    try {
      const cjkFont = await loadDefaultCjkFont()
      registered = registerFonts(pdfMakeResolved, [cjkFont])
      // @types/pdfmake 中提供的 TDocumentDefinitions 类型字段似乎不全
      // 实际的 TDocumentDefinitions 中存在 fonts 和 defaultStyle
      ;(docDefinition as any).fonts = { ...(docDefinition as any).fonts, ...(registered?.fontsDef || {}) }
      ;(docDefinition as any).defaultStyle = { ...(docDefinition as any).defaultStyle, font: cjkFont.name }
    } catch (e) {
      // 网络失败时静默降级为默认拉丁字体
    }
  }
  if (registered) {
    ;(docDefinition as any).fonts = { ...(docDefinition as any).fonts, ...registered.fontsDef }
    // if (options.defaultFont) {
    //   ;(docDefinition as any).defaultStyle = { ...(docDefinition as any).defaultStyle, font: options.defaultFont }
    // }
  }

  return new Promise<MarkdownPdfResult>((resolve, reject) => {
    try {
      const runtime: any = pdfMakeResolved
      console.log('docDefinition', docDefinition)
      const pdfDoc = runtime.createPdf(docDefinition, createLayout())
      // 测试环境中优先走 getBuffer，兼容性更好；浏览器中仍返回 Blob
      pdfDoc.getBuffer((buffer: ArrayBuffer) => {
        const uint8 = new Uint8Array(buffer as any)
        const blob = new Blob([uint8], { type: 'application/pdf' })
        resolve({ blob, uint8 })
      })
    } catch (err) {
      reject(err)
    }
  })
}

export async function downloadPdf(markdown: string, fileName: string, options?: MarkdownToPdfOptions): Promise<void> {
  const { blob } = await markdownToPdf(markdown, options)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'document.pdf'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 导出内部函数用于调试和测试
export { parseMarkdown } from './core/parseMarkdown'
export { mapHastToPdfContent } from './mapping/hast'

export default { markdownToPdf, downloadPdf }
