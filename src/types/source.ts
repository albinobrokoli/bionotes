export type SourceType = 'article' | 'book' | 'chapter' | 'web';

export type Source = {
  id: string;
  type: SourceType;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  isbn: string | null;
  publisher: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SourceLink = {
  id: string;
  sourceId: string;
  pageId: string;
  blockId: string | null;
  contextExcerpt: string | null;
};

export function formatCitation(source: Source): string {
  const authorPart =
    source.authors.length > 0
      ? source.authors[0].split(' ').slice(-1)[0] ?? source.authors[0]
      : 'Anonim';
  const yearPart = source.year ?? 'n.d.';
  return `(${authorPart}, ${yearPart})`;
}
