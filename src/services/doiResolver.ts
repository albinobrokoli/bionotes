import type { Source } from '../types/source';

type CrossRefAuthor = {
  given?: string;
  family?: string;
  name?: string;
};

type CrossRefMessage = {
  title?: string[];
  author?: CrossRefAuthor[];
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  publisher?: string;
  type?: string;
};

function pickYear(msg: CrossRefMessage): number | null {
  const candidates = [msg['published-print'], msg['published-online'], msg.created];
  for (const candidate of candidates) {
    const year = candidate?.['date-parts']?.[0]?.[0];
    if (typeof year === 'number' && Number.isFinite(year)) return year;
  }
  return null;
}

function parseAuthors(authors: CrossRefAuthor[] | undefined): string[] {
  if (!authors) return [];
  return authors
    .map((author) => {
      if (author.name) return author.name;
      const joined = [author.given, author.family].filter(Boolean).join(' ').trim();
      return joined || null;
    })
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export async function resolveDoi(doi: string): Promise<Source> {
  const normalizedDoi = doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(normalizedDoi)}`);
  if (!response.ok) {
    throw new Error(`doi_resolve_failed_${response.status}`);
  }

  const payload = (await response.json()) as { message?: CrossRefMessage };
  const message = payload.message;
  if (!message?.title?.[0]) {
    throw new Error('doi_payload_invalid');
  }

  return {
    id: '',
    type: message.type === 'book-chapter' ? 'chapter' : 'article',
    title: message.title[0],
    authors: parseAuthors(message.author),
    year: pickYear(message),
    journal: message['container-title']?.[0] ?? null,
    volume: message.volume ?? null,
    issue: message.issue ?? null,
    pages: message.page ?? null,
    doi: message.DOI ?? normalizedDoi,
    url: message.URL ?? null,
    isbn: null,
    publisher: message.publisher ?? null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
