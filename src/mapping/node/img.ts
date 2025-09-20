// TODO: 支持通过 reference 方式使用图片
// 提供默认的图片解析器
async function defaultImageResolver(src: string): Promise<string> {
  // 优先使用用户提供的 imageResolver，否则会默认将 url 转 base64（几乎必跨域）
  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  // 如果是 dataURL，直接返回
  if (src.startsWith('data:')) {
    return src
  }

  // 如果是完整的 HTTP/HTTPS URL，尝试直接使用
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return await urlToBase64(src)
  }

  // 对于相对路径或其他格式，也直接返回让 pdfmake 尝试处理
  return src
}

export async function handleImgNode(node: any, resolver?: (src: string) => Promise<string>, textStyle?: string) {
  // 如果没有提供 imageResolver，使用默认实现
  const imageResolver = resolver || defaultImageResolver

  const src = node.properties?.src as string
  const alt = (node.properties?.alt as string) || ''
  try {
    const dataUrl = await imageResolver(src)
    return { image: dataUrl, margin: [0, 4, 0, 8] }
  } catch {
    if (alt) return { text: alt, italics: true, color: '#666', style: textStyle }
  }
}
