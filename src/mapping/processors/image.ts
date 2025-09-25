import { NodeProcessor, ProcessContext } from '../processor'
import { HastNodeBase } from '../../types'

/**
 * 图片处理器
 * 支持各种图片格式和fallback处理
 */
export class ImageProcessor implements NodeProcessor {
  canHandle(node: HastNodeBase): boolean {
    return node.type === 'element' && node.tagName?.toLowerCase() === 'img'
  }

  async process(node: HastNodeBase, context: ProcessContext): Promise<any> {
    const src = (node as any).properties?.src as string
    const alt = ((node as any).properties?.alt as string) || ''
    
    if (!src) {
      // 没有src的情况，使用alt文本
      return alt ? { text: alt, italics: true, color: '#666', style: 'p' } : null
    }

    try {
      // 如果有图片解析器，使用它来处理图片
      if (context.imageResolver) {
        const dataUrl = await context.imageResolver(src)
        return { image: dataUrl, margin: [0, 4, 0, 8] }
      } else {
        // 没有图片解析器的情况，使用默认处理
        const processedSrc = await this.defaultImageResolver(src)
        return { image: processedSrc, margin: [0, 4, 0, 8] }
      }
    } catch (error) {
      console.warn('图片处理失败:', src, error)
      
      // 图片加载失败时的fallback处理
      if (alt) {
        return { text: alt, italics: true, color: '#666', style: 'p' }
      } else {
        return { text: `[图片加载失败: ${src}]`, italics: true, color: '#999', style: 'p' }
      }
    }
  }

  /**
   * 默认图片解析器
   */
  private async defaultImageResolver(src: string): Promise<string> {
    // 如果是 dataURL，直接返回
    if (src.startsWith('data:')) {
      return src
    }

    // 如果是完整的 HTTP/HTTPS URL，尝试转换为base64
    if (src.startsWith('http://') || src.startsWith('https://')) {
      return await this.urlToBase64(src)
    }

    // 对于相对路径或其他格式，直接返回让 pdfmake 尝试处理
    return src
  }

  /**
   * 将URL转换为base64
   */
  private async urlToBase64(url: string): Promise<string> {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`图片下载失败: HTTP ${response.status}`)
    }
    
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('图片转换失败'))
      reader.readAsDataURL(blob)
    })
  }
}
