import type { FontDefinition, OfflineFontConfig } from '../types'

/**
 * 从 VFS 中检测可用的字体和字重
 */
export function detectFontsFromVfs(vfs: Record<string, string>): OfflineFontConfig {
  const fontDefinitions: Record<string, FontDefinition> = {}
  const availableFonts: string[] = []

  // 分析文件名，推断字体名称和字重
  const fontGroups: Record<string, { [key: string]: string }> = {}

  for (const fileName of Object.keys(vfs)) {
    const fontInfo = parseFontFileName(fileName)
    if (!fontInfo) continue

    const { fontName, weight } = fontInfo

    if (!fontGroups[fontName]) {
      fontGroups[fontName] = {}
    }

    fontGroups[fontName][weight] = fileName
  }

  // 构建字体定义
  for (const [fontName, weights] of Object.entries(fontGroups)) {
    if (!weights.normal) {
      // 如果没有 normal 字重，尝试用其他字重代替
      const fallbackWeight = weights.regular || weights.medium || Object.values(weights)[0]
      if (fallbackWeight) {
        weights.normal = fallbackWeight
      } else {
        continue // 跳过没有可用字重的字体
      }
    }

    fontDefinitions[fontName] = {
      normal: weights.normal,
      ...(weights.bold && { bold: weights.bold }),
      ...(weights.italic && { italics: weights.italic }),
      ...(weights.bolditalic && { bolditalics: weights.bolditalic }),
    }

    availableFonts.push(fontName)
  }

  return {
    vfs,
    fontDefinitions,
    availableFonts,
  }
}

/**
 * 解析字体文件名，提取字体名称和字重信息
 */
function parseFontFileName(fileName: string): { fontName: string; weight: string } | null {
  // 移除文件扩展名
  const nameWithoutExt = fileName.replace(/\.(ttf|otf|woff|woff2)$/i, '')

  // 常见的字重模式
  const weightPatterns = {
    normal: /-(Regular|Normal)$/i,
    bold: /-(Bold)$/i,
    italic: /-(Italic|Oblique)$/i,
    bolditalic: /-(BoldItalic|BoldOblique)$/i,
    regular: /-(Regular)$/i,
    medium: /-(Medium)$/i,
  }

  // 尝试匹配字重模式
  for (const [weight, pattern] of Object.entries(weightPatterns)) {
    const match = nameWithoutExt.match(pattern)
    if (match) {
      const fontName = nameWithoutExt.replace(pattern, '')
      return { fontName, weight }
    }
  }

  // 如果没有匹配到特定字重，假设是 normal
  return { fontName: nameWithoutExt, weight: 'normal' }
}

/**
 * 检测文本中需要的字体类型
 */
export function detectRequiredFontTypes(text: string): {
  needsCjk: boolean
  needsLatin: boolean
  detectedLanguages: string[]
} {
  const detectedLanguages: string[] = []

  // CJK 字符检测
  const cjkPattern = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/
  const needsCjk = cjkPattern.test(text)
  if (needsCjk) {
    detectedLanguages.push('cjk')
  }

  // 拉丁字符检测
  const latinPattern = /[a-zA-Z]/
  const needsLatin = latinPattern.test(text)
  if (needsLatin) {
    detectedLanguages.push('latin')
  }

  // 可以扩展检测其他语言

  return {
    needsCjk,
    needsLatin,
    detectedLanguages,
  }
}

/**
 * 从可用字体中选择最适合的字体
 */
export function selectBestFont(
  requiredTypes: { needsCjk: boolean; needsLatin: boolean },
  availableFonts: string[],
  preferredCjkFont?: string
): string | null {
  if (requiredTypes.needsCjk) {
    // 如果需要CJK字体，优先使用指定的CJK字体
    if (preferredCjkFont && availableFonts.includes(preferredCjkFont)) {
      return preferredCjkFont
    }

    // 寻找常见的CJK字体名称
    const cjkFontNames = [
      'NotoSansSC',
      'NotoSansTC',
      'NotoSansJP',
      'NotoSansKR',
      'SourceHanSans',
      'PingFang',
      'Hiragino',
      'Microsoft YaHei',
      'SimHei',
      'SimSun',
    ]

    for (const cjkFont of cjkFontNames) {
      if (availableFonts.includes(cjkFont)) {
        return cjkFont
      }
    }
  }

  // 如果只需要拉丁字体或找不到CJK字体，返回第一个可用字体
  return availableFonts.length > 0 ? availableFonts[0] : null
}
