import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { MarkdownToPdfOptions } from '../index';
import { createDefaultStyles } from '../styles';

export function buildDocDefinition(content: any[], options: MarkdownToPdfOptions): TDocumentDefinitions {
  const styles = createDefaultStyles(options.theme);
  const doc: TDocumentDefinitions = {
    pageSize: (options.pageSize as any) ?? 'A4',
    pageMargins: options.pageMargins ?? [40, 60, 40, 60],
    pageOrientation: options.pageOrientation ?? 'portrait',
    content,
    styles,
  };

  if (options.header) doc.header = options.header as any;
  if (options.footer) doc.footer = options.footer as any;
  return doc;
}


