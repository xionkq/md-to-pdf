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

export interface MarkdownToPdfOptions {
  pageSize?: PageSize
  pageMargins?: [number, number, number, number]
  pageOrientation?: 'portrait' | 'landscape'
  // defaultFont?: string
  // fonts?: FontResource[]
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
