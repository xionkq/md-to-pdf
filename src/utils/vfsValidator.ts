import type { FontDefinition } from '../types'

/**
 * 验证用户提供的 VFS 格式是否正确
 */
export function validateVfs(vfs: Record<string, string>): boolean {
  if (!vfs || typeof vfs !== 'object') {
    return false
  }

  // 检查所有值是否为字符串（base64）
  for (const [key, value] of Object.entries(vfs)) {
    if (typeof key !== 'string' || typeof value !== 'string') {
      return false
    }

    // 基本的 base64 格式检查
    if (!isValidBase64(value)) {
      return false
    }
  }

  return true
}

/**
 * 简单的 base64 格式验证
 */
function isValidBase64(str: string): boolean {
  if (typeof str !== 'string') return false
  if (str.length === 0) return false

  // base64 字符集检查
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/
  return base64Pattern.test(str)
}

/**
 * 验证字体定义格式
 */
export function validateFontDefinitions(fontDefinitions: Record<string, FontDefinition>): boolean {
  if (!fontDefinitions || typeof fontDefinitions !== 'object') {
    return false
  }

  for (const [fontName, definition] of Object.entries(fontDefinitions)) {
    if (typeof fontName !== 'string' || !definition || typeof definition !== 'object') {
      return false
    }

    // 至少需要有 normal 字重
    if (!definition.normal || typeof definition.normal !== 'string') {
      return false
    }

    // 检查可选字重
    const optionalWeights = ['bold', 'italics', 'bolditalics'] as const
    for (const weight of optionalWeights) {
      if (definition[weight] !== undefined && typeof definition[weight] !== 'string') {
        return false
      }
    }
  }

  return true
}

/**
 * 验证 VFS 与字体定义的一致性
 */
export function validateVfsConsistency(
  vfs: Record<string, string>,
  fontDefinitions: Record<string, FontDefinition>
): { isValid: boolean; missingFiles: string[] } {
  const missingFiles: string[] = []

  for (const [fontName, definition] of Object.entries(fontDefinitions)) {
    // 检查所有字重文件是否在 VFS 中存在
    const weights = ['normal', 'bold', 'italics', 'bolditalics'] as const
    for (const weight of weights) {
      const fileName = definition[weight]
      if (fileName && !vfs[fileName]) {
        missingFiles.push(fileName)
      }
    }
  }

  return {
    isValid: missingFiles.length === 0,
    missingFiles,
  }
}
