import type { PartialBlock } from '@blocknote/core';
import type {
  AccentKey,
  Category,
  FontPair,
  IconName,
  Language,
  Page,
  Space,
  ViewMode,
} from '../store/app';
import type { Source, SourceLink, SourceType } from '../types/source';
import { getDatabase } from './client';

export const PREF = {
  activeSpaceId: 'activeSpaceId',
  activeCategoryId: 'activeCategoryId',
  activePageId: 'activePageId',
  accent: 'accent',
  fontPair: 'fontPair',
  language: 'language',
  citationFormat: 'citationFormat',
  autoUpdatesEnabled: 'autoUpdatesEnabled',
  viewMode: 'viewMode',
  rightRailOpen: 'rightRailOpen',
  expandedSpaces: 'ui.expanded.spaces',
  expandedCategories: 'ui.expanded.categories',
  onboardedAt: 'onboarded_at',
} as const;

type PageRow = {
  id: string;
  category_id: string;
  title: string;
  content_json: string;
  created_at: number;
  updated_at: number;
  favorite: number;
  tags: string;
};

type SpaceRow = { id: string; name: string; icon: string; color: string; order_idx: number };
type CategoryRow = { id: string; space_id: string; name: string; order_idx: number };

function rowToPage(r: PageRow): Page {
  const tags = JSON.parse(r.tags || '[]') as string[];
  const content = JSON.parse(r.content_json) as PartialBlock<any, any, any>[];
  return {
    id: r.id,
    categoryId: r.category_id,
    title: r.title,
    favorite: r.favorite === 1,
    tags: Array.isArray(tags) ? tags : [],
    content: Array.isArray(content) ? content : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pdfPath: null,
    pdfFileName: null,
  };
}

/* -------- preferences -------- */

export async function getAllPreferences(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const rows = await db.select<{ key: string; value: string }[]>(
    'SELECT key, value FROM preferences',
    [],
  );
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (typeof r.key === 'string' && typeof r.value === 'string') {
      out[r.key] = r.value;
    }
  }
  return out;
}

export async function getPreference(key: string): Promise<string | undefined> {
  const db = await getDatabase();
  const rows = await db.select<{ value: string }[]>(
    'SELECT value FROM preferences WHERE key = $1',
    [key],
  );
  const v = rows[0]?.value;
  return typeof v === 'string' ? v : undefined;
}

export async function setPreference(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('INSERT OR REPLACE INTO preferences (key, value) VALUES ($1, $2)', [key, value]);
}

export async function setManyPreferences(pairs: [string, string][]): Promise<void> {
  const db = await getDatabase();
  for (const [k, v] of pairs) {
    await db.execute('INSERT OR REPLACE INTO preferences (key, value) VALUES ($1, $2)', [k, v]);
  }
}

/* -------- spaces -------- */

export async function listSpaces(): Promise<SpaceRow[]> {
  const db = await getDatabase();
  return db.select<SpaceRow[]>(
    'SELECT id, name, icon, color, order_idx FROM spaces ORDER BY order_idx ASC, id ASC',
    [],
  );
}

export async function getSpace(id: string): Promise<SpaceRow | null> {
  const db = await getDatabase();
  const rows = await db.select<SpaceRow[]>(
    'SELECT id, name, icon, color, order_idx FROM spaces WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function insertSpace(
  s: { id: string; name: string; icon: IconName; color: string },
  orderIdx: number,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'INSERT INTO spaces (id, name, icon, color, order_idx) VALUES ($1, $2, $3, $4, $5)',
    [s.id, s.name, s.icon, s.color, orderIdx],
  );
}

export async function updateSpace(
  id: string,
  patch: Partial<{ name: string; icon: IconName; color: string; order_idx: number }>,
): Promise<void> {
  const cur = await getSpace(id);
  if (!cur) return;
  const db = await getDatabase();
  await db.execute(
    `UPDATE spaces SET name = $1, icon = $2, color = $3, order_idx = $4 WHERE id = $5`,
    [patch.name ?? cur.name, patch.icon ?? cur.icon, patch.color ?? cur.color, patch.order_idx ?? cur.order_idx, id],
  );
}

export async function deleteSpace(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM spaces WHERE id = $1', [id]);
}

/* -------- categories -------- */

export async function listCategories(): Promise<CategoryRow[]> {
  const db = await getDatabase();
  return db.select<CategoryRow[]>(
    'SELECT id, space_id, name, order_idx FROM categories ORDER BY order_idx ASC, id ASC',
    [],
  );
}

export async function insertCategory(
  c: { id: string; spaceId: string; name: string },
  orderIdx: number,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'INSERT INTO categories (id, space_id, name, order_idx) VALUES ($1, $2, $3, $4)',
    [c.id, c.spaceId, c.name, orderIdx],
  );
}

export async function updateCategory(
  id: string,
  patch: Partial<{ name: string; spaceId: string; order_idx: number }>,
): Promise<void> {
  const db = await getDatabase();
  const rows = await db.select<CategoryRow[]>('SELECT * FROM categories WHERE id = $1', [id]);
  const cur = rows[0];
  if (!cur) return;
  await db.execute(
    'UPDATE categories SET space_id = $1, name = $2, order_idx = $3 WHERE id = $4',
    [patch.spaceId ?? cur.space_id, patch.name ?? cur.name, patch.order_idx ?? cur.order_idx, id],
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM categories WHERE id = $1', [id]);
}

/* -------- pages -------- */

export async function listPages(): Promise<PageRow[]> {
  const db = await getDatabase();
  return db.select<PageRow[]>(
    'SELECT id, category_id, title, content_json, created_at, updated_at, favorite, tags FROM pages ORDER BY created_at ASC, id ASC',
    [],
  );
}

export async function getPage(id: string): Promise<Page | null> {
  const db = await getDatabase();
  const rows = await db.select<PageRow[]>(
    'SELECT id, category_id, title, content_json, created_at, updated_at, favorite, tags FROM pages WHERE id = $1',
    [id],
  );
  return rows[0] ? rowToPage(rows[0]) : null;
}

export async function insertPage(p: Page): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO pages (id, category_id, title, content_json, created_at, updated_at, favorite, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      p.id,
      p.categoryId,
      p.title,
      JSON.stringify(p.content),
      p.createdAt,
      p.updatedAt,
      p.favorite ? 1 : 0,
      JSON.stringify(p.tags),
    ],
  );
}

export async function updatePage(
  id: string,
  patch: Partial<Pick<Page, 'title' | 'content' | 'favorite' | 'tags' | 'categoryId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  const cur = await getPage(id);
  if (!cur) return;
  const next: Page = {
    ...cur,
    ...patch,
    id: cur.id,
    title: patch.title ?? cur.title,
    content: patch.content ?? cur.content,
    favorite: patch.favorite ?? cur.favorite,
    tags: patch.tags ?? cur.tags,
    categoryId: patch.categoryId ?? cur.categoryId,
    createdAt: patch.createdAt ?? cur.createdAt,
    updatedAt: patch.updatedAt ?? cur.updatedAt,
  };
  const db = await getDatabase();
  await db.execute(
    `UPDATE pages SET category_id = $1, title = $2, content_json = $3, created_at = $4, updated_at = $5, favorite = $6, tags = $7 WHERE id = $8`,
    [
      next.categoryId,
      next.title,
      JSON.stringify(next.content),
      next.createdAt,
      next.updatedAt,
      next.favorite ? 1 : 0,
      JSON.stringify(next.tags),
      id,
    ],
  );
}

export async function deletePageRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM pages WHERE id = $1', [id]);
}

/* -------- page attachments (PDF) -------- */

type PdfAttachmentRow = {
  page_id: string;
  file_path: string;
  file_name: string;
  added_at: number;
};

/** Sayfa başına en son eklenen PDF (added_at DESC ile ilk kayıt). */
export async function listLatestPdfAttachmentsByPage(): Promise<Map<string, { path: string; name: string }>> {
  const db = await getDatabase();
  const rows = await db.select<PdfAttachmentRow[]>(
    `SELECT page_id, file_path, file_name, added_at FROM page_attachments
     WHERE kind = 'pdf' ORDER BY added_at DESC`,
    [],
  );
  const m = new Map<string, { path: string; name: string }>();
  for (const r of rows) {
    if (!m.has(r.page_id)) {
      m.set(r.page_id, { path: r.file_path, name: r.file_name });
    }
  }
  return m;
}

export async function replacePagePdfAttachment(pageId: string, filePath: string, fileName: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM page_attachments WHERE page_id = $1 AND kind = $2', [pageId, 'pdf']);
  const id = `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.execute(
    `INSERT INTO page_attachments (id, page_id, file_path, file_name, kind, added_at)
     VALUES ($1, $2, $3, $4, 'pdf', $5)`,
    [id, pageId, filePath, fileName, Date.now()],
  );
}

/* -------- PDF annotations (vurgular) -------- */

export type PdfAnnotation = {
  id: string;
  pageId: string;
  pdfPath: string;
  pdfPageNum: number;
  /** JSON: number[][] — her satır 8 PDF koordinatı */
  quadPoints: number[][];
  color: string;
  textExcerpt: string;
  linkedBlockId: string | null;
  createdAt: number;
};

type AnnotationRow = {
  id: string;
  page_id: string;
  pdf_path: string;
  pdf_page_num: number;
  quad_points: string;
  color: string;
  text_excerpt: string;
  linked_block_id: string | null;
  created_at: number;
};

function parseQuadPoints(raw: string): number[][] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((row) => Array.isArray(row) && row.every((n) => typeof n === 'number')) as number[][];
  } catch {
    return [];
  }
}

function rowToAnnotation(r: AnnotationRow): PdfAnnotation {
  return {
    id: r.id,
    pageId: r.page_id,
    pdfPath: r.pdf_path,
    pdfPageNum: r.pdf_page_num,
    quadPoints: parseQuadPoints(r.quad_points),
    color: r.color,
    textExcerpt: r.text_excerpt,
    linkedBlockId: r.linked_block_id,
    createdAt: r.created_at,
  };
}

export async function listAnnotationsForPdfPage(
  pageId: string,
  pdfPath: string,
  pdfPageNum: number,
): Promise<PdfAnnotation[]> {
  const db = await getDatabase();
  const rows = await db.select<AnnotationRow[]>(
    `SELECT id, page_id, pdf_path, pdf_page_num, quad_points, color, text_excerpt, linked_block_id, created_at
     FROM annotations
     WHERE page_id = $1 AND pdf_path = $2 AND pdf_page_num = $3
     ORDER BY created_at ASC, id ASC`,
    [pageId, pdfPath, pdfPageNum],
  );
  return rows.map(rowToAnnotation);
}

export async function getAnnotationByLinkedBlock(
  pageId: string,
  linkedBlockId: string,
): Promise<PdfAnnotation | null> {
  const db = await getDatabase();
  const rows = await db.select<AnnotationRow[]>(
    `SELECT id, page_id, pdf_path, pdf_page_num, quad_points, color, text_excerpt, linked_block_id, created_at
     FROM annotations
     WHERE page_id = $1 AND linked_block_id = $2
     LIMIT 1`,
    [pageId, linkedBlockId],
  );
  return rows[0] ? rowToAnnotation(rows[0]) : null;
}

export async function insertAnnotation(a: {
  id: string;
  pageId: string;
  pdfPath: string;
  pdfPageNum: number;
  quadPoints: number[][];
  color: string;
  textExcerpt: string;
  linkedBlockId: string | null;
  createdAt: number;
}): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO annotations (id, page_id, pdf_path, pdf_page_num, quad_points, color, text_excerpt, linked_block_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      a.id,
      a.pageId,
      a.pdfPath,
      a.pdfPageNum,
      JSON.stringify(a.quadPoints),
      a.color,
      a.textExcerpt,
      a.linkedBlockId,
      a.createdAt,
    ],
  );
}

export async function deleteAnnotation(id: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM annotations WHERE id = $1', [id]);
}

/* -------- sources / citations -------- */

type SourceRow = {
  id: string;
  type: SourceType;
  title: string;
  authors: string;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  isbn: string | null;
  publisher: string | null;
  created_at: number;
  updated_at: number;
};

type SourceLinkRow = {
  id: string;
  source_id: string;
  page_id: string;
  block_id: string | null;
  context_excerpt: string | null;
};

type BacklinkRow = {
  id: string;
  source_page_id: string;
  target_page_id: string;
  block_id: string;
  context_excerpt: string;
  created_at: number;
};

export type BacklinkListItem = {
  id: string;
  sourcePageId: string;
  sourcePageTitle: string;
  targetPageId: string;
  blockId: string;
  contextExcerpt: string;
  createdAt: number;
};

export type BacklinkEdge = {
  sourcePageId: string;
  targetPageId: string;
};

function parseAuthors(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item === 'string');
  } catch {
    return [];
  }
}

function rowToSource(row: SourceRow): Source {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    authors: parseAuthors(row.authors),
    year: row.year,
    journal: row.journal,
    volume: row.volume,
    issue: row.issue,
    pages: row.pages,
    doi: row.doi,
    url: row.url,
    isbn: row.isbn,
    publisher: row.publisher,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToSourceLink(row: SourceLinkRow): SourceLink {
  return {
    id: row.id,
    sourceId: row.source_id,
    pageId: row.page_id,
    blockId: row.block_id,
    contextExcerpt: row.context_excerpt,
  };
}

export async function createSource(
  payload: Omit<Source, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<Source> {
  const db = await getDatabase();
  const now = Date.now();
  const id = payload.id ?? `src_${crypto.randomUUID().replace(/-/g, '')}`;
  await db.execute(
    `INSERT INTO sources (id, type, title, authors, year, journal, volume, issue, pages, doi, url, isbn, publisher, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
    [
      id,
      payload.type,
      payload.title,
      JSON.stringify(payload.authors),
      payload.year,
      payload.journal,
      payload.volume,
      payload.issue,
      payload.pages,
      payload.doi,
      payload.url,
      payload.isbn,
      payload.publisher,
      now,
      now,
    ],
  );
  return {
    id,
    ...payload,
    createdAt: now,
    updatedAt: now,
  };
}

export async function listSourcesForPage(pageId: string): Promise<Source[]> {
  const db = await getDatabase();
  const rows = await db.select<SourceRow[]>(
    `SELECT DISTINCT s.id, s.type, s.title, s.authors, s.year, s.journal, s.volume, s.issue, s.pages, s.doi, s.url, s.isbn, s.publisher, s.created_at, s.updated_at
     FROM sources s
     INNER JOIN source_links sl ON sl.source_id = s.id
     WHERE sl.page_id = $1
     ORDER BY s.created_at ASC, s.id ASC`,
    [pageId],
  );
  return rows.map(rowToSource);
}

export async function listSources(query?: string): Promise<Source[]> {
  const db = await getDatabase();
  if (!query?.trim()) {
    const rows = await db.select<SourceRow[]>(
      `SELECT id, type, title, authors, year, journal, volume, issue, pages, doi, url, isbn, publisher, created_at, updated_at
       FROM sources
       ORDER BY updated_at DESC, id ASC`,
      [],
    );
    return rows.map(rowToSource);
  }
  const q = `%${query.toLowerCase()}%`;
  const rows = await db.select<SourceRow[]>(
    `SELECT id, type, title, authors, year, journal, volume, issue, pages, doi, url, isbn, publisher, created_at, updated_at
     FROM sources
     WHERE LOWER(title) LIKE $1 OR LOWER(authors) LIKE $1 OR LOWER(COALESCE(doi, '')) LIKE $1
     ORDER BY updated_at DESC, id ASC`,
    [q],
  );
  return rows.map(rowToSource);
}

export async function listSourceLinksForPage(pageId: string): Promise<SourceLink[]> {
  const db = await getDatabase();
  const rows = await db.select<SourceLinkRow[]>(
    `SELECT id, source_id, page_id, block_id, context_excerpt
     FROM source_links
     WHERE page_id = $1
     ORDER BY id ASC`,
    [pageId],
  );
  return rows.map(rowToSourceLink);
}

export async function linkSourceToPage(params: {
  sourceId: string;
  pageId: string;
  blockId?: string | null;
  contextExcerpt?: string | null;
}): Promise<SourceLink> {
  const db = await getDatabase();
  const blockId = params.blockId ?? null;
  const existing = await db.select<SourceLinkRow[]>(
    `SELECT id, source_id, page_id, block_id, context_excerpt
     FROM source_links
     WHERE page_id = $1 AND source_id = $2 AND (block_id IS $3 OR block_id = $3)
     LIMIT 1`,
    [params.pageId, params.sourceId, blockId],
  );
  if (existing[0]) return rowToSourceLink(existing[0]);

  const id = `sl_${crypto.randomUUID().replace(/-/g, '')}`;
  await db.execute(
    `INSERT INTO source_links (id, source_id, page_id, block_id, context_excerpt)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, params.sourceId, params.pageId, blockId, params.contextExcerpt ?? null],
  );
  return {
    id,
    sourceId: params.sourceId,
    pageId: params.pageId,
    blockId,
    contextExcerpt: params.contextExcerpt ?? null,
  };
}

export async function listBacklinksForTargetPage(targetPageId: string): Promise<BacklinkListItem[]> {
  const db = await getDatabase();
  const rows = await db.select<
    Array<
      BacklinkRow & {
        source_title: string;
      }
    >
  >(
    `SELECT b.id, b.source_page_id, b.target_page_id, b.block_id, b.context_excerpt, b.created_at, p.title AS source_title
     FROM backlinks b
     INNER JOIN pages p ON p.id = b.source_page_id
     WHERE b.target_page_id = $1
     ORDER BY b.created_at DESC, b.id ASC`,
    [targetPageId],
  );
  return rows.map((row) => ({
    id: row.id,
    sourcePageId: row.source_page_id,
    sourcePageTitle: row.source_title,
    targetPageId: row.target_page_id,
    blockId: row.block_id,
    contextExcerpt: row.context_excerpt,
    createdAt: row.created_at,
  }));
}

export async function listAllBacklinkEdges(): Promise<BacklinkEdge[]> {
  const db = await getDatabase();
  const rows = await db.select<Array<Pick<BacklinkRow, 'source_page_id' | 'target_page_id'>>>(
    `SELECT source_page_id, target_page_id
     FROM backlinks`,
    [],
  );
  return rows.map((row) => ({
    sourcePageId: row.source_page_id,
    targetPageId: row.target_page_id,
  }));
}

export async function syncBacklinksForSourcePage(
  sourcePageId: string,
  links: Array<{ targetPageId: string; blockId: string; contextExcerpt: string }>,
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.select<BacklinkRow[]>(
    `SELECT id, source_page_id, target_page_id, block_id, context_excerpt, created_at
     FROM backlinks
     WHERE source_page_id = $1`,
    [sourcePageId],
  );

  const keyOf = (targetPageId: string, blockId: string) => `${targetPageId}::${blockId}`;
  const existingByKey = new Map(existing.map((row) => [keyOf(row.target_page_id, row.block_id), row]));
  const nextByKey = new Map(
    links.map((link) => [keyOf(link.targetPageId, link.blockId), link] as const),
  );

  for (const [key, row] of existingByKey) {
    if (nextByKey.has(key)) continue;
    await db.execute('DELETE FROM backlinks WHERE id = $1', [row.id]);
  }

  for (const [key, link] of nextByKey) {
    const prev = existingByKey.get(key);
    if (!prev) {
      await db.execute(
        `INSERT INTO backlinks (id, source_page_id, target_page_id, block_id, context_excerpt, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `bl_${crypto.randomUUID().replace(/-/g, '')}`,
          sourcePageId,
          link.targetPageId,
          link.blockId,
          link.contextExcerpt,
          Date.now(),
        ],
      );
      continue;
    }
    if (prev.context_excerpt !== link.contextExcerpt) {
      await db.execute('UPDATE backlinks SET context_excerpt = $1 WHERE id = $2', [link.contextExcerpt, prev.id]);
    }
  }
}

/* -------- aggregate load -------- */

function parseJsonMap(s: string | undefined, fallback: Record<string, boolean>): Record<string, boolean> {
  if (!s) return fallback;
  try {
    const o = JSON.parse(s) as unknown;
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      return o as Record<string, boolean>;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export type LoadedState = {
  spaces: Space[];
  categories: Category[];
  pages: Page[];
  activeSpaceId: string | null;
  activeCategoryId: string | null;
  activePageId: string | null;
  viewMode: ViewMode;
  accent: AccentKey;
  fontPair: FontPair;
  language: Language;
  citationFormat: 'apa' | 'mla' | 'vancouver';
  autoUpdatesEnabled: boolean;
  rightRailOpen: boolean;
  onboardedAt: string | null;
};

export async function loadAppStateFromDb(): Promise<LoadedState> {
  const [spaceRows, categoryRows, pageRows, prefs, pdfByPage] = await Promise.all([
    listSpaces(),
    listCategories(),
    listPages(),
    getAllPreferences(),
    listLatestPdfAttachmentsByPage(),
  ]);

  const pages = pageRows.map((r) => {
    const p = rowToPage(r);
    const pdf = pdfByPage.get(p.id);
    if (!pdf) return p;
    return { ...p, pdfPath: pdf.path, pdfFileName: pdf.name };
  });

  const defaultExpanded: Record<string, boolean> = {};
  for (const r of spaceRows) {
    defaultExpanded[r.id] = true;
  }
  for (const r of categoryRows) {
    defaultExpanded[r.id] = true;
  }
  const spaceExpanded = parseJsonMap(prefs[PREF.expandedSpaces], defaultExpanded);
  const catExpanded = parseJsonMap(prefs[PREF.expandedCategories], defaultExpanded);

  const bySpace = new Map<string, typeof categoryRows>();
  for (const c of categoryRows) {
    if (!bySpace.has(c.space_id)) {
      bySpace.set(c.space_id, []);
    }
    bySpace.get(c.space_id)!.push(c);
  }
  const spaceMap = new Map<string, string[]>();
  for (const [sid, list] of bySpace) {
    const sorted = [...list].sort(
      (a, b) => a.order_idx - b.order_idx || a.id.localeCompare(b.id),
    );
    spaceMap.set(
      sid,
      sorted.map((r) => r.id),
    );
  }

  const pageByCategory = new Map<string, string[]>();
  for (const c of categoryRows) {
    const pgs = pages
      .filter((p) => p.categoryId === c.id)
      .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    pageByCategory.set(
      c.id,
      pgs.map((p) => p.id),
    );
  }

  const spaces: Space[] = spaceRows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon as IconName,
    color: r.color,
    categoryIds: spaceMap.get(r.id) ?? [],
    expanded: spaceExpanded[r.id] ?? true,
  }));

  const categories: Category[] = categoryRows.map((r) => ({
    id: r.id,
    spaceId: r.space_id,
    name: r.name,
    pageIds: pageByCategory.get(r.id) ?? [],
    expanded: catExpanded[r.id] ?? true,
  }));

  const defaultVm: ViewMode = 'edit';
  const defaultAccent: AccentKey = 'green';
  const defaultFont: FontPair = 'inter-mono';
  const defaultLang: Language = 'tr';
  const defaultCitationFormat: 'apa' | 'mla' | 'vancouver' = 'apa';
  const defaultAutoUpdatesEnabled = true;

  const rawVm = prefs[PREF.viewMode];
  const viewMode: ViewMode =
    rawVm === 'edit' || rawVm === 'preview' || rawVm === 'split' ? rawVm : defaultVm;
  const rawAccent = prefs[PREF.accent];
  const accent: AccentKey = (
    ['green', 'blue', 'purple', 'amber', 'pink'] as const
  ).includes(rawAccent as AccentKey)
    ? (rawAccent as AccentKey)
    : defaultAccent;
  const rawFont = prefs[PREF.fontPair];
  const fontPair: FontPair = (['inter-mono', 'system', 'humanist'] as const).includes(
    rawFont as FontPair,
  )
    ? (rawFont as FontPair)
    : defaultFont;
  const rawLang = prefs[PREF.language];
  const language: Language = rawLang === 'en' || rawLang === 'tr' ? rawLang : defaultLang;
  const rawCitation = prefs[PREF.citationFormat];
  const citationFormat: 'apa' | 'mla' | 'vancouver' =
    rawCitation === 'mla' || rawCitation === 'vancouver' || rawCitation === 'apa'
      ? rawCitation
      : defaultCitationFormat;
  const autoUpdatesEnabled =
    prefs[PREF.autoUpdatesEnabled] === undefined
      ? defaultAutoUpdatesEnabled
      : prefs[PREF.autoUpdatesEnabled] === '1';

  return {
    spaces,
    categories,
    pages,
    activeSpaceId: prefs[PREF.activeSpaceId] || null,
    activeCategoryId: prefs[PREF.activeCategoryId] || null,
    activePageId: prefs[PREF.activePageId] || null,
    viewMode,
    accent,
    fontPair,
    language,
    citationFormat,
    autoUpdatesEnabled,
    rightRailOpen: prefs[PREF.rightRailOpen] === '1',
    onboardedAt: prefs[PREF.onboardedAt] || null,
  };
}

/* -------- maintenance -------- */

export async function countSpaces(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.select<{ n: number }[]>('SELECT COUNT(*) as n FROM spaces', []);
  const n = rows[0]?.n;
  if (typeof n === 'bigint') return Number(n);
  if (typeof n === 'number') return n;
  return Number(n) || 0;
}

export async function clearAllData(): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM spaces', []);
  await db.execute('DELETE FROM preferences', []);
}
