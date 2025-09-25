interface SvgNode {
  tagName: string
  properties: Record<string, any>
  children: SvgNode[]
}

const svgAttrMap: Record<string, string> = {
  // SVG 坐标 & 视图
  viewBox: 'viewBox',
  preserveAspectRatio: 'preserveAspectRatio',

  // 渐变 <linearGradient> / <radialGradient>
  gradientTransform: 'gradientTransform',
  gradientUnits: 'gradientUnits',
  spreadMethod: 'spreadMethod',

  // <pattern>
  patternTransform: 'patternTransform',
  patternUnits: 'patternUnits',

  // <clipPath> / <mask>
  clipPathUnits: 'clipPathUnits',
  maskContentUnits: 'maskContentUnits',
  maskUnits: 'maskUnits',

  // marker 相关
  markerHeight: 'markerHeight',
  markerWidth: 'markerWidth',
  markerUnits: 'markerUnits',

  // filter 相关
  filterUnits: 'filterUnits',
  primitiveUnits: 'primitiveUnits',
  kernelMatrix: 'kernelMatrix', // feConvolveMatrix
  kernelUnitLength: 'kernelUnitLength',
  baseFrequency: 'baseFrequency', // feTurbulence
  numOctaves: 'numOctaves',
  stitchTiles: 'stitchTiles',
  surfaceScale: 'surfaceScale',
  specularConstant: 'specularConstant',
  specularExponent: 'specularExponent',
  diffuseConstant: 'diffuseConstant',

  // feComposite
  in2: 'in2',

  // <fePointLight>, <feSpotLight>
  xChannelSelector: 'xChannelSelector',
  yChannelSelector: 'yChannelSelector',
  zChannelSelector: 'zChannelSelector',
  limitingConeAngle: 'limitingConeAngle',

  // xlink 属性 (旧标准，仍需支持)
  xlinkHref: 'xlink:href',
}

function camelToKebab(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

/**
 * 处理SVG节点，转换为字符串格式
 */
export function handleSvgNode(node: SvgNode): string {
  const children = node.children.reduce((acc, n) => {
    const a = handleSvgNode(n)
    return acc + a
  }, '')
  
  const propString = Object.keys(node.properties).reduce((acc, key) => {
    const hasMap = Object.keys(svgAttrMap).includes(key)
    return acc + ` ${hasMap ? svgAttrMap[key] : camelToKebab(key)}="${node.properties[key]}"`
  }, '')
  
  return `<${node.tagName}${propString}>${children}</${node.tagName}>`
}
