type AstFlavor = 'mdast' | 'hast';
interface ParseResult<T = any> {
    tree: T;
    flavor: AstFlavor;
}
declare function parseMarkdown(markdown: string, enableHtml?: boolean): Promise<ParseResult>;

type PdfContent$1 = any[];
interface NodeBase {
    type: string;
    [key: string]: any;
}
interface MapContext$1 {
    imageResolver?: (src: string) => Promise<string>;
}
declare function mapRemarkToPdfContent(tree: NodeBase, ctx?: MapContext$1): Promise<PdfContent$1>;

type PdfContent = any[];
interface HastNodeBase {
    type: string;
    [key: string]: any;
}
interface MapContext {
    imageResolver?: (src: string) => Promise<string>;
}
declare function mapHastToPdfContent(tree: HastNodeBase, ctx?: MapContext): Promise<PdfContent>;

/**
 * 核心导出：对外暴露的类型与 API。该文件串联解析、映射与 pdfmake 生成流程。
 * 设计目标：
 * - 仅在需要时懒加载第三方库，尽量减小初始包体与首屏成本
 * - 保持浏览器端可用（不依赖 Node 特性），但测试中允许注入 stub 的 pdfMake 实例
 */
type PageSize = 'A4' | 'A3' | 'Letter' | {
    width: number;
    height: number;
};
interface FontResource {
    name: string;
    normal: ArrayBuffer | string;
    bold?: ArrayBuffer | string;
    italics?: ArrayBuffer | string;
    bolditalics?: ArrayBuffer | string;
}
interface MarkdownToPdfOptions {
    pageSize?: PageSize;
    pageMargins?: [number, number, number, number];
    pageOrientation?: 'portrait' | 'landscape';
    /** For testing or advanced usage: provide a custom pdfMake instance */
    pdfMakeInstance?: any;
    enableHtml?: boolean;
    header?: (currentPage: number, pageCount: number) => any;
    footer?: (currentPage: number, pageCount: number) => any;
    imageResolver?: (src: string) => Promise<string>;
    onProgress?: (phase: 'parse' | 'layout' | 'emit') => void;
}
interface MarkdownPdfResult {
    blob: Blob;
    uint8?: Uint8Array;
}
declare function markdownToPdf(markdown: string, options?: MarkdownToPdfOptions): Promise<MarkdownPdfResult>;
declare function downloadPdf(markdown: string, fileName: string, options?: MarkdownToPdfOptions): Promise<void>;

declare const _default: {
    markdownToPdf: typeof markdownToPdf;
    downloadPdf: typeof downloadPdf;
};

export { type FontResource, type MarkdownPdfResult, type MarkdownToPdfOptions, type PageSize, _default as default, downloadPdf, mapHastToPdfContent, mapRemarkToPdfContent, markdownToPdf, parseMarkdown };
