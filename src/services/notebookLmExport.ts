import { BlockNoteEditor } from '@blocknote/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import JSZip from 'jszip';
import { bioNotesSchema } from '../editor/bioNotesSchema';
import { useApp, type Page } from '../store/app';

export type NotebookLmScope = 'page' | 'category' | 'space';

export type NotebookLmExportProgress = {
  processed: number;
  total: number;
  label: string;
};

export type NotebookLmExportResult = {
  blob: Blob;
  fileName: string;
  pageCount: number;
  pdfCount: number;
  sourceCount: number;
};

const markdownExporter = BlockNoteEditor.create({ schema: bioNotesSchema });

function sanitizeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'untitled';
}

function ensureUniqueName(baseName: string, used: Set<string>): string {
  if (!used.has(baseName)) {
    used.add(baseName);
    return baseName;
  }
  const dot = baseName.lastIndexOf('.');
  const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
  const ext = dot > 0 ? baseName.slice(dot) : '';
  let i = 2;
  let candidate = `${stem}-${i}${ext}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${stem}-${i}${ext}`;
  }
  used.add(candidate);
  return candidate;
}

function resolvePages(scope: NotebookLmScope): { pages: Page[]; scopeTitle: string } {
  const state = useApp.getState();
  const { pages, categories, spaces, activePageId, activeCategoryId, activeSpaceId } = state;

  if (scope === 'page') {
    if (!activePageId) throw new Error('Aktif sayfa bulunamadı.');
    const page = pages.find((entry) => entry.id === activePageId);
    if (!page) throw new Error('Aktif sayfa bulunamadı.');
    return { pages: [page], scopeTitle: page.title };
  }

  if (scope === 'category') {
    if (!activeCategoryId) throw new Error('Aktif kategori bulunamadı.');
    const category = categories.find((entry) => entry.id === activeCategoryId);
    if (!category) throw new Error('Aktif kategori bulunamadı.');
    const categoryPages = pages.filter((entry) => entry.categoryId === category.id);
    return { pages: categoryPages, scopeTitle: category.name };
  }

  if (!activeSpaceId) throw new Error('Aktif alan bulunamadı.');
  const categoryIds = new Set(
    categories.filter((entry) => entry.spaceId === activeSpaceId).map((entry) => entry.id),
  );
  const space = spaces.find((entry) => entry.id === activeSpaceId);
  const spacePages = pages.filter((entry) => categoryIds.has(entry.categoryId));
  return { pages: spacePages, scopeTitle: space?.name ?? 'space' };
}

async function readPdfBytes(filePath: string): Promise<ArrayBuffer> {
  const response = await fetch(convertFileSrc(filePath));
  if (!response.ok) throw new Error(`PDF okunamadı: ${response.status}`);
  return response.arrayBuffer();
}

function toMarkdown(page: Page): string {
  const markdown = markdownExporter.blocksToMarkdownLossy(page.content).trim();
  if (markdown.length > 0) return markdown;
  return `# ${page.title}\n`;
}

export function getNotebookLmScopePageCount(scope: NotebookLmScope): number {
  return resolvePages(scope).pages.length;
}

export async function exportToNotebookLm(
  scope: NotebookLmScope,
  onProgress?: (progress: NotebookLmExportProgress) => void,
): Promise<NotebookLmExportResult> {
  const { pages, scopeTitle } = resolvePages(scope);
  if (pages.length === 0) throw new Error('Dışa aktarılacak sayfa bulunamadı.');

  const zip = new JSZip();
  const notesFolder = zip.folder('notes');
  const pdfFolder = zip.folder('pdfs');
  if (!notesFolder || !pdfFolder) throw new Error('ZIP klasörü oluşturulamadı.');

  const usedNoteNames = new Set<string>();
  const usedPdfNames = new Set<string>();
  const addedPdfPaths = new Set<string>();
  let pdfCount = 0;

  const totalSteps = pages.length * 2;
  let processed = 0;
  const tick = (label: string) => {
    processed += 1;
    onProgress?.({ processed, total: totalSteps, label });
  };

  for (const page of pages) {
    const noteName = ensureUniqueName(`${sanitizeFileName(page.title)}.md`, usedNoteNames);
    notesFolder.file(noteName, toMarkdown(page));
    tick(`note:${page.title}`);

    if (page.pdfPath && !addedPdfPaths.has(page.pdfPath)) {
      const original = page.pdfFileName || `${page.title}.pdf`;
      const safePdfName = ensureUniqueName(sanitizeFileName(original), usedPdfNames);
      const bytes = await readPdfBytes(page.pdfPath);
      pdfFolder.file(safePdfName, bytes);
      addedPdfPaths.add(page.pdfPath);
      pdfCount += 1;
    }
    tick(`pdf:${page.title}`);
  }

  const created = new Date().toISOString();
  const sourceCount = pages.length + pdfCount;
  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        title: `BioNotes - ${scopeTitle}`,
        created,
        sourceCount,
        pageCount: pages.length,
        pdfCount,
        scope,
      },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = `bionotes-notebooklm-${sanitizeFileName(scopeTitle)}-${Date.now()}.zip`;
  return { blob, fileName, pageCount: pages.length, pdfCount, sourceCount };
}
