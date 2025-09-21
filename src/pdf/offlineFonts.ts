import type { OfflineFontsOptions, OfflineFontConfig, FontDefinition } from '../types'
import { validateVfs, validateFontDefinitions, validateVfsConsistency } from '../utils/vfsValidator'
import { detectFontsFromVfs, detectRequiredFontTypes, selectBestFont } from '../utils/fontDetector'
import {
  createFontFallback,
  resolveFontFallback,
  ensureFontDefinitionComplete,
  mergeFontConfigs,
} from '../utils/fontFallback'

/**
 * 处理离线字体选项的结果
 */
export interface ProcessedOfflineFonts {
  /** 处理后的字体配置 */
  config: OfflineFontConfig
  /** 推荐的默认字体 */
  recommendedDefaultFont: string | null
  /** 是否禁用网络字体加载 */
  disableNetworkFonts: boolean
  /** 处理过程中的警告信息 */
  warnings: string[]
}

/**
 * 处理用户提供的离线字体配置
 */
export async function processOfflineFonts(
  options: OfflineFontsOptions,
  markdown?: string
): Promise<ProcessedOfflineFonts> {
  const warnings: string[] = []

  try {
    // 1. 获取和验证 VFS
    const vfs = await resolveVfs(options.vfs)
    if (!validateVfs(vfs)) {
      throw new Error('Invalid VFS format provided')
    }

    // 2. 处理字体定义
    let fontDefinitions: Record<string, FontDefinition>

    if (options.fontDefinitions) {
      // 用户提供了字体定义
      if (!validateFontDefinitions(options.fontDefinitions)) {
        throw new Error('Invalid font definitions provided')
      }

      // 验证 VFS 与字体定义的一致性
      const consistency = validateVfsConsistency(vfs, options.fontDefinitions)
      if (!consistency.isValid) {
        warnings.push(`Missing font files in VFS: ${consistency.missingFiles.join(', ')}`)
        // 尝试修复缺失的字体定义
        fontDefinitions = fixMissingFontFiles(options.fontDefinitions, vfs, warnings)
      } else {
        fontDefinitions = options.fontDefinitions
      }
    } else {
      // 从 VFS 自动检测字体定义
      const detected = detectFontsFromVfs(vfs)
      fontDefinitions = detected.fontDefinitions

      if (Object.keys(fontDefinitions).length === 0) {
        warnings.push('No valid fonts detected from VFS')
      }
    }

    // 3. 确保字体定义完整性
    const completeFontDefinitions: Record<string, FontDefinition> = {}
    for (const [fontName, definition] of Object.entries(fontDefinitions)) {
      try {
        completeFontDefinitions[fontName] = ensureFontDefinitionComplete(fontName, definition, vfs)
      } catch (error) {
        warnings.push(`Font ${fontName} skipped: ${error}`)
      }
    }

    // 4. 构建最终配置
    const config: OfflineFontConfig = {
      vfs,
      fontDefinitions: completeFontDefinitions,
      availableFonts: Object.keys(completeFontDefinitions),
    }

    // 5. 推荐默认字体
    let recommendedDefaultFont: string | null = null

    if (options.defaultCjkFont && config.availableFonts.includes(options.defaultCjkFont)) {
      recommendedDefaultFont = options.defaultCjkFont
    } else if (markdown) {
      // 基于文档内容推荐字体
      const requiredTypes = detectRequiredFontTypes(markdown)
      recommendedDefaultFont = selectBestFont(requiredTypes, config.availableFonts, options.defaultCjkFont)
    } else if (config.availableFonts.length > 0) {
      // 使用第一个可用字体
      recommendedDefaultFont = config.availableFonts[0]
    }

    if (!recommendedDefaultFont) {
      warnings.push('No suitable default font found')
    }

    return {
      config,
      recommendedDefaultFont,
      disableNetworkFonts: options.disableNetworkFonts ?? false,
      warnings,
    }
  } catch (error) {
    throw new Error(`Failed to process offline fonts: ${error}`)
  }
}

/**
 * 解析 VFS 配置（支持对象、同步函数、异步函数）
 */
async function resolveVfs(
  vfs: Record<string, string> | (() => Record<string, string>) | (() => Promise<Record<string, string>>) | undefined
): Promise<Record<string, string>> {
  if (!vfs) {
    return {}
  }

  if (typeof vfs === 'function') {
    const result = vfs()
    return result instanceof Promise ? await result : result
  }

  return vfs
}

/**
 * 修复缺失的字体文件，提供回退方案
 */
function fixMissingFontFiles(
  fontDefinitions: Record<string, FontDefinition>,
  vfs: Record<string, string>,
  warnings: string[]
): Record<string, FontDefinition> {
  const fixed: Record<string, FontDefinition> = {}

  for (const [fontName, definition] of Object.entries(fontDefinitions)) {
    try {
      fixed[fontName] = ensureFontDefinitionComplete(fontName, definition, vfs)
    } catch (error) {
      warnings.push(`Font ${fontName} removed: ${error}`)
    }
  }

  return fixed
}

/**
 * 将离线字体配置与现有的 pdfmake VFS 合并
 */
export function mergeWithPdfMakeVfs(
  pdfMakeVfs: Record<string, string> | undefined,
  offlineConfig: OfflineFontConfig
): Record<string, string> {
  const baseVfs = pdfMakeVfs || {}

  // 离线字体的优先级更高，会覆盖同名文件
  return {
    ...baseVfs,
    ...offlineConfig.vfs,
  }
}

/**
 * 将离线字体定义与现有的 pdfmake 字体定义合并
 */
export function mergeWithPdfMakeFonts(
  pdfMakeFonts: Record<string, any> | undefined,
  offlineConfig: OfflineFontConfig
): Record<string, any> {
  const baseFonts = pdfMakeFonts || {}

  // 离线字体的优先级更高，会覆盖同名字体
  return {
    ...baseFonts,
    ...offlineConfig.fontDefinitions,
  }
}

/**
 * 检查离线字体是否能满足文档需求
 */
export function validateOfflineFontsForDocument(
  offlineConfig: OfflineFontConfig,
  markdown: string
): { canSatisfy: boolean; requiredTypes: ReturnType<typeof detectRequiredFontTypes>; recommendations: string[] } {
  const requiredTypes = detectRequiredFontTypes(markdown)
  const recommendations: string[] = []

  let canSatisfy = true

  if (requiredTypes.needsCjk) {
    const hasCjkFont = offlineConfig.availableFonts.some((font) =>
      /^(Noto|Source|PingFang|Hiragino|Microsoft|SimHei|SimSun)/i.test(font)
    )

    if (!hasCjkFont) {
      canSatisfy = false
      recommendations.push('Consider adding a CJK font (e.g., NotoSansSC) for Chinese/Japanese/Korean text')
    }
  }

  if (requiredTypes.needsLatin && offlineConfig.availableFonts.length === 0) {
    canSatisfy = false
    recommendations.push('At least one font is required for Latin text')
  }

  return {
    canSatisfy,
    requiredTypes,
    recommendations,
  }
}
