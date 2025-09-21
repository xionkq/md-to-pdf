export interface HastNodeBase {
  type: string
  [key: string]: any
}

export type PageSize = 'A4' | 'A3' | 'Letter' | { width: number; height: number }

export interface FontResource {
  name: string
  normal: ArrayBuffer | string
  bold?: ArrayBuffer | string
  italics?: ArrayBuffer | string
  bolditalics?: ArrayBuffer | string
}

export interface FontDefinition {
  normal: string
  bold?: string
  italics?: string
  bolditalics?: string
}

export interface OfflineFontConfig {
  vfs: Record<string, string>
  fontDefinitions: Record<string, FontDefinition>
  availableFonts: string[]
}

export interface OfflineFontsOptions {
  /** 用户提供的 vfs 对象或导入函数 */
  vfs?: Record<string, string> | (() => Record<string, string>) | (() => Promise<Record<string, string>>)
  /** 字体定义映射 */
  fontDefinitions?: Record<string, FontDefinition>
  /** 默认字体名称（当检测到需要特殊字体时使用） */
  defaultCjkFont?: string
  /** 是否完全禁用网络字体加载 */
  disableNetworkFonts?: boolean
}

export interface MarkdownToPdfOptions {
  pageSize?: PageSize
  pageMargins?: [number, number, number, number]
  pageOrientation?: 'portrait' | 'landscape'
  // defaultFont?: string
  // fonts?: FontResource[]
  /** 离线字体配置 */
  offlineFonts?: OfflineFontsOptions
  /** For testing or advanced usage: provide a custom pdfMake instance */
  pdfMakeInstance?: any
  header?: (currentPage: number, pageCount: number) => any
  footer?: (currentPage: number, pageCount: number) => any
  imageResolver?: (src: string) => Promise<string>
}

export interface MarkdownPdfResult {
  blob: Blob
  uint8?: Uint8Array
}
