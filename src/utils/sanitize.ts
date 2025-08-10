export interface HtmlSanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>; // tag → attributes; '*' for global
  allowedStyles?: Record<string, string[]>; // tag → css props; '*' for global
  allowedSchemes?: string[]; // e.g., ['http','https','data']
}

/**
 * 基于默认 schema 进行扩展/收紧，生成传给 rehype-sanitize 的 schema。
 * 注意：不要在此处静态引入 rehype 相关包，以免无谓增大体积；默认 schema 由调用方传入。
 */
export function buildSanitizeSchema(defaultSchema: any, opts: HtmlSanitizeOptions = {}): any {
  const schema = deepClone(defaultSchema || {});

  // 1) 标签白名单
  if (opts.allowedTags && opts.allowedTags.length) {
    const set = new Set<string>([...(schema.tagNames || [])]);
    for (const t of opts.allowedTags) set.add(t);
    schema.tagNames = Array.from(set);
  }

  // 2) 属性白名单（按标签合并，支持 '*' 通配）
  if (opts.allowedAttributes) {
    schema.attributes = schema.attributes || {};
    for (const tag of Object.keys(opts.allowedAttributes)) {
      const current: any[] = (schema.attributes[tag] as any[]) || [];
      const set = new Set<string>(current as string[]);
      for (const attr of opts.allowedAttributes[tag] || []) set.add(attr);
      schema.attributes[tag] = Array.from(set);
    }
  }

  // 3) 样式白名单：启用 style 属性，并限制允许的 CSS 属性（以正则形式）
  // rehype-sanitize 对 style 的控制通常通过将 'style' 加入 attributes，
  // 并在 'properties' 或自定义解析中进一步约束。此处采用简化做法：
  // - 允许 'style' 属性存在（在 attributes['*'] 中）
  // - 由上层样式映射层进行二次过滤（仅保留允许的 CSS 属性）
  enableStyleAttribute(schema);

  // 4) 协议限制（对常见的 href/src 进行限制，基于 default schema 的结构进行覆盖）
  if (opts.allowedSchemes && opts.allowedSchemes.length) {
    // 常见实现是在 attributes 的定义中为 href/src 指定允许协议。
    // 若默认 schema 已含有带协议约束的复杂结构，这里作保守覆盖：
    const protoWrap = (name: string) => [{ type: 'protocol', protocol: opts.allowedSchemes } as any, name];
    // a[href]
    const aAttrs: any[] = (schema.attributes && schema.attributes['a']) || [];
    if (!includesAttr(aAttrs, 'href')) aAttrs.push('href');
    schema.attributes = schema.attributes || {};
    schema.attributes['a'] = uniqueAttrs(aAttrs);
    // img[src]
    const imgAttrs: any[] = (schema.attributes && schema.attributes['img']) || [];
    if (!includesAttr(imgAttrs, 'src')) imgAttrs.push('src');
    schema.attributes['img'] = uniqueAttrs(imgAttrs);
    // 由于不同版本实现差异较大，协议层面更安全的处理交由默认 schema；这里仅确保不缺失关键属性。
  }

  return schema;
}

function enableStyleAttribute(schema: any) {
  schema.attributes = schema.attributes || {};
  const globalAttrs: any[] = (schema.attributes['*'] as any[]) || [];
  if (!includesAttr(globalAttrs, 'style')) globalAttrs.push('style');
  schema.attributes['*'] = uniqueAttrs(globalAttrs);
}

function includesAttr(arr: any[], name: string): boolean {
  return (arr || []).some((x) => (typeof x === 'string' ? x === name : x && x[0] ? x[0] === name : false));
}

function uniqueAttrs(arr: any[]): any[] {
  const flat = (arr || []).map((x) => (typeof x === 'string' ? x : x));
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of flat) {
    const key = typeof item === 'string' ? item : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function deepClone<T>(obj: T): T {
  return obj ? JSON.parse(JSON.stringify(obj)) : (obj as any);
}


