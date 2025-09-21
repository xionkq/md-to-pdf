import type { MarkdownToPdfOptions, FontResource, OfflineFontConfig } from '../types'

// 将 ArrayBuffer/base64 统一转为 base64 字符串，以便写入 pdfmake vfs
function toBase64(input: ArrayBuffer | string): string {
  if (typeof input === 'string') return input
  const bytes = new Uint8Array(input)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  // btoa handles binary string
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64')
}

// 将 FontResource 转为 pdfmake 需要的 vfs 映射（文件名 → base64）
function buildVfsForFont(resource: FontResource): Record<string, string> {
  const baseName = resource.name
  const vfs: Record<string, string> = {}
  const normalKey = `${baseName}-Regular.ttf`
  vfs[normalKey] = toBase64(resource.normal)
  if (resource.bold) vfs[`${baseName}-Bold.ttf`] = toBase64(resource.bold)
  if (resource.italics) vfs[`${baseName}-Italic.ttf`] = toBase64(resource.italics)
  if (resource.bolditalics) vfs[`${baseName}-BoldItalic.ttf`] = toBase64(resource.bolditalics)
  return vfs
}

// 生成 pdfmake 的 fonts 定义（逻辑名 → 各字重文件名）
function buildFontsDefinition(resources: FontResource[]): Record<string, any> {
  const def: Record<string, any> = {}
  for (const r of resources) {
    def[r.name] = {
      normal: `${r.name}-Regular.ttf`,
      bold: r.bold ? `${r.name}-Bold.ttf` : `${r.name}-Regular.ttf`,
      italics: r.italics ? `${r.name}-Italic.ttf` : `${r.name}-Regular.ttf`,
      bolditalics: r.bolditalics ? `${r.name}-BoldItalic.ttf` : r.bold ? `${r.name}-Bold.ttf` : `${r.name}-Regular.ttf`,
    }
  }
  return def
}

export interface RegisteredFonts {
  vfs: Record<string, string>
  fontsDef: Record<string, any>
}

export function registerFonts(pdfMakeRuntime: any, fonts?: FontResource[]): RegisteredFonts | null {
  // 若调用方未提供字体，则不进行注册
  if (!fonts || !fonts.length) return null

  const allVfs: Record<string, string> = {}
  for (const f of fonts) Object.assign(allVfs, buildVfsForFont(f))

  if (pdfMakeRuntime && typeof pdfMakeRuntime.addVirtualFileSystem === 'function') {
    pdfMakeRuntime.addVirtualFileSystem(allVfs)
  } else if (pdfMakeRuntime) {
    try {
      if (!pdfMakeRuntime.vfs) pdfMakeRuntime.vfs = {}
      Object.assign(pdfMakeRuntime.vfs, allVfs)
    } catch {
      // ignore
    }
  }

  const fontsDef = buildFontsDefinition(fonts)
  try {
    pdfMakeRuntime.fonts = { ...(pdfMakeRuntime.fonts || {}), ...fontsDef }
  } catch {
    // ignore
  }
  return { vfs: allVfs, fontsDef }
}

/**
 * 注册离线字体配置到 pdfmake
 */
export function registerOfflineFonts(pdfMakeRuntime: any, offlineConfig: OfflineFontConfig): RegisteredFonts | null {
  if (!offlineConfig || !Object.keys(offlineConfig.vfs).length) return null

  // 直接使用用户提供的 VFS 和字体定义
  const { vfs, fontDefinitions } = offlineConfig

  // 注册 VFS
  if (pdfMakeRuntime && typeof pdfMakeRuntime.addVirtualFileSystem === 'function') {
    try {
      pdfMakeRuntime.addVirtualFileSystem(vfs)
    } catch (error) {
      console.warn('Failed to add virtual file system:', error)
    }
  } else if (pdfMakeRuntime) {
    try {
      if (!pdfMakeRuntime.vfs) pdfMakeRuntime.vfs = {}
      Object.assign(pdfMakeRuntime.vfs, vfs)
    } catch (error) {
      console.warn('Failed to assign VFS:', error)
    }
  }

  // 注册字体定义
  try {
    pdfMakeRuntime.fonts = { ...(pdfMakeRuntime.fonts || {}), ...fontDefinitions }
  } catch (error) {
    console.warn('Failed to register font definitions:', error)
  }

  return { vfs, fontsDef: fontDefinitions }
}

/**
 * 混合注册：支持同时注册 FontResource 和离线字体配置
 */
export function registerMixedFonts(
  pdfMakeRuntime: any,
  options: {
    fontResources?: FontResource[]
    offlineConfig?: OfflineFontConfig
    prioritizeOffline?: boolean
  }
): RegisteredFonts | null {
  const { fontResources, offlineConfig, prioritizeOffline = true } = options

  if (!fontResources?.length && !offlineConfig) return null

  let allVfs: Record<string, string> = {}
  let allFontsDef: Record<string, any> = {}

  // 处理 FontResource
  if (fontResources?.length) {
    const resourceResult = registerFonts(pdfMakeRuntime, fontResources)
    if (resourceResult) {
      if (!prioritizeOffline) {
        allVfs = { ...allVfs, ...resourceResult.vfs }
        allFontsDef = { ...allFontsDef, ...resourceResult.fontsDef }
      }
    }
  }

  // 处理离线字体配置
  if (offlineConfig) {
    const offlineResult = registerOfflineFonts(pdfMakeRuntime, offlineConfig)
    if (offlineResult) {
      if (prioritizeOffline) {
        // 离线字体优先，会覆盖同名的 FontResource
        allVfs = { ...allVfs, ...offlineResult.vfs }
        allFontsDef = { ...allFontsDef, ...offlineResult.fontsDef }
      } else {
        // FontResource 优先
        allVfs = { ...offlineResult.vfs, ...allVfs }
        allFontsDef = { ...offlineResult.fontsDef, ...allFontsDef }
      }
    }
  }

  // 如果设置了 FontResource 优先，需要重新注册 FontResource
  if (fontResources?.length && !prioritizeOffline) {
    const resourceResult = registerFonts(pdfMakeRuntime, fontResources)
    if (resourceResult) {
      allVfs = { ...allVfs, ...resourceResult.vfs }
      allFontsDef = { ...allFontsDef, ...resourceResult.fontsDef }
    }
  }

  return Object.keys(allVfs).length > 0 || Object.keys(allFontsDef).length > 0
    ? { vfs: allVfs, fontsDef: allFontsDef }
    : null
}

/**
 * 验证字体是否已正确注册到 pdfmake
 */
export function validateFontRegistration(
  pdfMakeRuntime: any,
  fontName: string
): { isRegistered: boolean; hasVfsFiles: boolean; missingFiles: string[] } {
  const missingFiles: string[] = []

  // 检查字体定义
  const isRegistered = !!(pdfMakeRuntime.fonts && pdfMakeRuntime.fonts[fontName])

  let hasVfsFiles = false
  if (isRegistered) {
    const fontDef = pdfMakeRuntime.fonts[fontName]
    const requiredFiles = [fontDef.normal, fontDef.bold, fontDef.italics, fontDef.bolditalics]

    hasVfsFiles = true
    for (const fileName of requiredFiles) {
      if (fileName && !pdfMakeRuntime.vfs?.[fileName]) {
        hasVfsFiles = false
        missingFiles.push(fileName)
      }
    }
  }

  return {
    isRegistered,
    hasVfsFiles,
    missingFiles,
  }
}
