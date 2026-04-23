/** PDF ↔ editör senkronu için tarayıcı CustomEvent adları ve tipleri. */

export const BIONOTES_PDF_NAVIGATE = 'bionotes:pdf-navigate';
export const BIONOTES_EDITOR_NAVIGATE = 'bionotes:editor-navigate';
export const BIONOTES_INSERT_QUOTE = 'bionotes:insert-quote-block';
export const BIONOTES_SOURCE_LINKS_UPDATED = 'bionotes:source-links-updated';
export const BIONOTES_BACKLINKS_UPDATED = 'bionotes:backlinks-updated';

export type PdfNavigateDetail = {
  pageId: string;
  pageNum: number;
  annotationId: string;
};

export type EditorNavigateDetail = {
  pageId: string;
  blockId: string;
};

export type InsertQuoteDetail = {
  pageId: string;
  blockId: string;
  text: string;
};

export type SourceLinksUpdatedDetail = {
  pageId: string;
};

export type BacklinksUpdatedDetail = {
  pageId: string;
};

export function dispatchPdfNavigate(detail: PdfNavigateDetail): void {
  window.dispatchEvent(new CustomEvent<PdfNavigateDetail>(BIONOTES_PDF_NAVIGATE, { detail }));
}

export function dispatchEditorNavigate(detail: EditorNavigateDetail): void {
  window.dispatchEvent(new CustomEvent<EditorNavigateDetail>(BIONOTES_EDITOR_NAVIGATE, { detail }));
}

export function dispatchInsertQuote(detail: InsertQuoteDetail): void {
  window.dispatchEvent(new CustomEvent<InsertQuoteDetail>(BIONOTES_INSERT_QUOTE, { detail }));
}

export function dispatchSourceLinksUpdated(detail: SourceLinksUpdatedDetail): void {
  window.dispatchEvent(new CustomEvent<SourceLinksUpdatedDetail>(BIONOTES_SOURCE_LINKS_UPDATED, { detail }));
}

export function dispatchBacklinksUpdated(detail: BacklinksUpdatedDetail): void {
  window.dispatchEvent(new CustomEvent<BacklinksUpdatedDetail>(BIONOTES_BACKLINKS_UPDATED, { detail }));
}
