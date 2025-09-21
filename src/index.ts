import { parseMarkdown } from './core/parseMarkdown'
import { buildDocDefinition } from './pdf/builder'
import { registerFonts, registerOfflineFonts, registerMixedFonts } from './pdf/fonts'
import { loadDefaultCjkFont } from './pdf/defaultCjk'
import { processOfflineFonts } from './pdf/offlineFonts'
import { mapHastToPdfContent } from './mapping/hast'
import { createLayout } from './styles'
import { MarkdownPdfResult, MarkdownToPdfOptions } from './types'

/**
 * 核心导出：对外暴露的类型与 API。该文件串联解析、映射与 pdfmake 生成流程。
 * 设计目标：
 * - 仅在需要时懒加载第三方库，尽量减小初始包体与首屏成本
 * - 保持浏览器端可用（不依赖 Node 特性），但测试中允许注入 stub 的 pdfMake 实例
 */

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

  // 解析 Markdown → remark AST（含 GFM 扩展）
  const tree = await parseMarkdown(markdown)

  // 将 AST 映射为 pdfmake 的内容结构
  let pdfContent = await mapHastToPdfContent(tree, { imageResolver: options.imageResolver })
  // 生成基础文档定义（页面尺寸、边距、样式、页眉/页脚）
  const docDefinition = buildDocDefinition(pdfContent, options)

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

  // 处理字体注册（离线字体优先）
  let registered: any = null
  let defaultFontName: string | null = null

  // 1. 处理离线字体配置
  if (options.offlineFonts) {
    try {
      const processed = await processOfflineFonts(options.offlineFonts, markdown)

      if (processed.warnings.length > 0) {
        console.warn('Offline fonts warnings:', processed.warnings)
      }

      // 注册离线字体
      registered = registerOfflineFonts(pdfMakeResolved, processed.config)
      defaultFontName = processed.recommendedDefaultFont

      // 如果配置了禁用网络字体，则跳过后续的网络字体加载
      if (processed.disableNetworkFonts) {
        ;(docDefinition as any).fonts = { ...(docDefinition as any).fonts, ...(registered?.fontsDef || {}) }
        if (defaultFontName) {
          ;(docDefinition as any).defaultStyle = { ...(docDefinition as any).defaultStyle, font: defaultFontName }
        }
      } else {
        // 继续处理网络字体（作为补充或回退）
        await handleNetworkFonts()
      }
    } catch (error) {
      console.warn('Failed to process offline fonts:', error)
      // 回退到网络字体
      await handleNetworkFonts()
    }
  } else {
    // 没有离线字体配置，使用原来的网络字体逻辑
    await handleNetworkFonts()
  }

  // 2. 处理网络字体加载（原来的逻辑）
  async function handleNetworkFonts() {
    // 检测到 md 中包含中文，则加载中文字体文件
    const hasCjk = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(markdown)
    if (hasCjk) {
      try {
        const cjkFont = await loadDefaultCjkFont()

        // 如果已有离线字体配置，使用混合注册
        if (registered && options.offlineFonts) {
          const mixedResult = registerMixedFonts(pdfMakeResolved, {
            fontResources: [cjkFont],
            offlineConfig: (await processOfflineFonts(options.offlineFonts, markdown)).config,
            prioritizeOffline: true,
          })
          if (mixedResult) {
            registered = mixedResult
            // 如果没有设置默认字体，使用 CJK 字体
            if (!defaultFontName) defaultFontName = cjkFont.name
          }
        } else {
          // 纯网络字体注册
          registered = registerFonts(pdfMakeResolved, [cjkFont])
          defaultFontName = cjkFont.name
        }
      } catch (e) {
        // 网络失败时静默降级
        console.warn('Failed to load network CJK font:', e)
      }
    }
  }

  // 3. 应用字体配置到文档定义
  if (registered) {
    ;(docDefinition as any).fonts = { ...(docDefinition as any).fonts, ...registered.fontsDef }
    if (defaultFontName) {
      ;(docDefinition as any).defaultStyle = { ...(docDefinition as any).defaultStyle, font: defaultFontName }
    }
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
