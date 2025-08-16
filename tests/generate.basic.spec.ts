import { describe, it, expect } from 'vitest'
import { markdownToPdf } from '../src/index'

describe('markdownToPdf (smoke)', () => {
  it('generates a Blob from simple markdown (browser-like)', async () => {
    // Skip in Node without DOM; simulate minimal window/document
    if (typeof window === 'undefined') {
      ;(globalThis as any).window = {}
      ;(globalThis as any).document = {
        createElement: () => ({ click: () => {}, remove: () => {}, style: {} }),
        body: { appendChild: () => {} },
      } as any
      ;(globalThis as any).URL = { createObjectURL: () => 'blob://x', revokeObjectURL: () => {} } as any
    }

    const md = '# Title\n\nHello world!'
    const result = await markdownToPdf(md)
    expect(result.blob).toBeInstanceOf(Blob)
  }, 40000)
})
