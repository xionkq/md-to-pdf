import { describe, it, expect } from 'vitest'
import { markdownToPdf } from '../src'

// A tiny fake font (not real glyphs), just to test registration pipeline.
// In real cases, user should pass a valid CJK font (e.g., NotoSansSC subset) as ArrayBuffer/base64.
function makeDummyFontBytes(): ArrayBuffer {
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  return bytes.buffer
}

describe('fonts: chinese registration pipeline', () => {
  it('registers custom font and generates pdf blob (smoke, inject dummy pdfMake)', async () => {
    if (typeof window === 'undefined') {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {
        createElement: () => ({ click: () => {}, remove: () => {}, style: {} }),
        body: { appendChild: () => {} },
      } as any
      ;(globalThis as any).URL = { createObjectURL: () => 'blob://x', revokeObjectURL: () => {} } as any
      ;(globalThis as any).btoa = (str: string) => Buffer.from(str, 'binary').toString('base64')
    }

    const md = '# 标题\n\n这是一段包含中文字符的文本，用于验证字体注入流程。'
    // Inject a stubbed pdfMake that bypasses real font parsing, to test our registration pipeline logic
    const fakePdfMake = {
      vfs: {},
      fonts: {},
      addVirtualFileSystem(v: any) {
        Object.assign(this.vfs, v)
      },
      createPdf(_docDef: any) {
        return {
          getBuffer(cb: (buf: ArrayBuffer) => void) {
            const arr = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // '%PDF' magic
            cb(arr.buffer)
          },
        } as any
      },
    } as any

    const result = await markdownToPdf(md, {
      fonts: [
        {
          name: 'NotoSansSC',
          normal: makeDummyFontBytes(),
          bold: makeDummyFontBytes(),
          italics: makeDummyFontBytes(),
          bolditalics: makeDummyFontBytes(),
        },
      ],
      defaultFont: 'NotoSansSC',
      onProgress: () => {},
      pdfMakeInstance: fakePdfMake,
    })

    expect(result.blob).toBeInstanceOf(Blob)
  }, 40000)
})
