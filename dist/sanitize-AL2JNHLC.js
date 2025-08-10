// src/utils/sanitize.ts
function buildSanitizeSchema(defaultSchema, opts = {}) {
  const schema = deepClone(defaultSchema || {});
  if (opts.allowedTags && opts.allowedTags.length) {
    const set = /* @__PURE__ */ new Set([...schema.tagNames || []]);
    for (const t of opts.allowedTags) set.add(t);
    schema.tagNames = Array.from(set);
  }
  if (opts.allowedAttributes) {
    schema.attributes = schema.attributes || {};
    for (const tag of Object.keys(opts.allowedAttributes)) {
      const current = schema.attributes[tag] || [];
      const set = new Set(current);
      for (const attr of opts.allowedAttributes[tag] || []) set.add(attr);
      schema.attributes[tag] = Array.from(set);
    }
  }
  enableStyleAttribute(schema);
  if (opts.allowedSchemes && opts.allowedSchemes.length) {
    const protoWrap = (name) => [{ type: "protocol", protocol: opts.allowedSchemes }, name];
    const aAttrs = schema.attributes && schema.attributes["a"] || [];
    if (!includesAttr(aAttrs, "href")) aAttrs.push("href");
    schema.attributes = schema.attributes || {};
    schema.attributes["a"] = uniqueAttrs(aAttrs);
    const imgAttrs = schema.attributes && schema.attributes["img"] || [];
    if (!includesAttr(imgAttrs, "src")) imgAttrs.push("src");
    schema.attributes["img"] = uniqueAttrs(imgAttrs);
  }
  return schema;
}
function enableStyleAttribute(schema) {
  schema.attributes = schema.attributes || {};
  const globalAttrs = schema.attributes["*"] || [];
  if (!includesAttr(globalAttrs, "style")) globalAttrs.push("style");
  schema.attributes["*"] = uniqueAttrs(globalAttrs);
}
function includesAttr(arr, name) {
  return (arr || []).some((x) => typeof x === "string" ? x === name : x && x[0] ? x[0] === name : false);
}
function uniqueAttrs(arr) {
  const flat = (arr || []).map((x) => typeof x === "string" ? x : x);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const item of flat) {
    const key = typeof item === "string" ? item : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
function deepClone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}
export {
  buildSanitizeSchema
};
