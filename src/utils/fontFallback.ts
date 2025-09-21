import type { FontDefinition, OfflineFontConfig } from '../types'

/**
 * 字体回退策略配置
 */
export interface FontFallbackConfig {
  /** 主要字体（用户指定或自动检测） */
  primaryFont?: string
  /** 回退字体列表，按优先级排序 */
  fallbackFonts: string[]
  /** 是否允许使用系统默认字体 */
  allowSystemFonts: boolean
}

/**
 * 默认字体回退配置
 */
export const DEFAULT_FALLBACK_CONFIG: FontFallbackConfig = {
  fallbackFonts: ['Helvetica', 'Arial', 'sans-serif'],
  allowSystemFonts: true,
}

/**
 * CJK 字体回退配置
 */
export const CJK_FALLBACK_CONFIG: FontFallbackConfig = {
  fallbackFonts: ['NotoSansSC', 'Microsoft YaHei', 'SimHei', 'sans-serif'],
  allowSystemFonts: true,
}

/**
 * 创建字体回退策略
 */
export function createFontFallback(offlineConfig: OfflineFontConfig, preferredFont?: string): FontFallbackConfig {
  const availableFonts = offlineConfig.availableFonts

  if (preferredFont && availableFonts.includes(preferredFont)) {
    // 如果首选字体可用，将其设为主字体
    return {
      primaryFont: preferredFont,
      fallbackFonts: availableFonts.filter((font) => font !== preferredFont),
      allowSystemFonts: true,
    }
  }

  // 如果首选字体不可用，选择第一个可用字体作为主字体
  const primaryFont = availableFonts[0]
  return {
    primaryFont,
    fallbackFonts: availableFonts.slice(1).concat(['Helvetica', 'Arial', 'sans-serif']),
    allowSystemFonts: true,
  }
}

/**
 * 解析字体回退链
 */
export function resolveFontFallback(
  requestedFont: string,
  offlineConfig: OfflineFontConfig,
  fallbackConfig: FontFallbackConfig
): string {
  // 1. 检查请求的字体是否可用
  if (offlineConfig.availableFonts.includes(requestedFont)) {
    return requestedFont
  }

  // 2. 检查主要字体
  if (fallbackConfig.primaryFont && offlineConfig.availableFonts.includes(fallbackConfig.primaryFont)) {
    return fallbackConfig.primaryFont
  }

  // 3. 遍历回退字体列表
  for (const fallbackFont of fallbackConfig.fallbackFonts) {
    if (offlineConfig.availableFonts.includes(fallbackFont)) {
      return fallbackFont
    }
  }

  // 4. 如果都不可用，返回第一个可用字体
  if (offlineConfig.availableFonts.length > 0) {
    return offlineConfig.availableFonts[0]
  }

  // 5. 最后的回退：系统默认字体
  if (fallbackConfig.allowSystemFonts) {
    return 'Helvetica'
  }

  // 6. 如果完全没有可用字体，抛出错误
  throw new Error('No fonts available for fallback')
}

/**
 * 验证字体定义的完整性，并提供缺失字重的回退
 */
export function ensureFontDefinitionComplete(
  fontName: string,
  definition: FontDefinition,
  vfs: Record<string, string>
): FontDefinition {
  const result: FontDefinition = { ...definition }

  // 确保 normal 字重存在
  if (!result.normal || !vfs[result.normal]) {
    throw new Error(`Font ${fontName}: normal weight is required but not found`)
  }

  // 为缺失的字重提供回退
  if (!result.bold || !vfs[result.bold]) {
    result.bold = result.normal // 用 normal 代替 bold
  }

  if (!result.italics || !vfs[result.italics]) {
    result.italics = result.normal // 用 normal 代替 italics
  }

  if (!result.bolditalics || !vfs[result.bolditalics]) {
    // 优先使用 bold，然后是 italics，最后是 normal
    result.bolditalics =
      result.bold && vfs[result.bold]
        ? result.bold
        : result.italics && vfs[result.italics]
          ? result.italics
          : result.normal
  }

  return result
}

/**
 * 合并多个字体配置，处理字体名称冲突
 */
export function mergeFontConfigs(configs: OfflineFontConfig[]): OfflineFontConfig {
  const mergedVfs: Record<string, string> = {}
  const mergedFontDefinitions: Record<string, FontDefinition> = {}
  const mergedAvailableFonts: string[] = []

  for (const config of configs) {
    // 合并 VFS
    Object.assign(mergedVfs, config.vfs)

    // 合并字体定义，处理冲突
    for (const [fontName, definition] of Object.entries(config.fontDefinitions)) {
      if (mergedFontDefinitions[fontName]) {
        console.warn(`Font conflict: ${fontName} already exists, skipping duplicate`)
        continue
      }
      mergedFontDefinitions[fontName] = definition
    }

    // 合并可用字体列表
    for (const font of config.availableFonts) {
      if (!mergedAvailableFonts.includes(font)) {
        mergedAvailableFonts.push(font)
      }
    }
  }

  return {
    vfs: mergedVfs,
    fontDefinitions: mergedFontDefinitions,
    availableFonts: mergedAvailableFonts,
  }
}
