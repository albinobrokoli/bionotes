import type { Source } from '../types/source';

export type CitationFormat = 'apa' | 'mla' | 'vancouver';

function compactSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function initialsFromGivenNames(given: string): string {
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}.`)
    .join(' ');
}

function parseAuthorName(author: string): { family: string; given: string } {
  const parts = author.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: 'Anonim', given: '' };
  if (parts.length === 1) return { family: parts[0], given: '' };
  return { family: parts[parts.length - 1], given: parts.slice(0, -1).join(' ') };
}

function formatAuthorsAPA(authors: string[]): string {
  if (authors.length === 0) return 'Anonim';
  const normalized = authors.map((author) => {
    const { family, given } = parseAuthorName(author);
    const initials = initialsFromGivenNames(given);
    return initials ? `${family}, ${initials}` : family;
  });
  if (normalized.length === 1) return normalized[0];
  if (normalized.length === 2) return `${normalized[0]}, & ${normalized[1]}`;
  return `${normalized.slice(0, -1).join(', ')}, & ${normalized[normalized.length - 1]}`;
}

function formatAuthorsMLA(authors: string[]): string {
  if (authors.length === 0) return 'Anonymous';
  if (authors.length === 1) {
    const { family, given } = parseAuthorName(authors[0]);
    return given ? `${family}, ${given}` : family;
  }
  const first = parseAuthorName(authors[0]);
  const firstRendered = first.given ? `${first.family}, ${first.given}` : first.family;
  const others = authors.slice(1).map((author) => author.trim()).filter(Boolean);
  if (others.length === 1) return `${firstRendered}, and ${others[0]}`;
  return `${firstRendered}, et al.`;
}

function formatAuthorsVancouver(authors: string[]): string {
  if (authors.length === 0) return 'Anonim';
  return authors
    .map((author) => {
      const { family, given } = parseAuthorName(author);
      const initials = given
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');
      return initials ? `${family} ${initials}` : family;
    })
    .join(', ');
}

function pagesForVancouver(pages: string | null): string {
  if (!pages) return '';
  const compact = pages.replace(/\s/g, '');
  const [start, end] = compact.split('-');
  if (!start || !end) return compact;
  if (!/^\d+$/.test(start) || !/^\d+$/.test(end)) return compact;
  const shared = start.split('').findIndex((digit, idx) => digit !== end[idx]);
  if (shared <= 0) return compact;
  return `${start}-${end.slice(shared)}`;
}

function sourceYear(source: Source, unknown = 'n.d.'): string {
  return source.year ? String(source.year) : unknown;
}

export function formatAPA(source: Source): string {
  const authors = formatAuthorsAPA(source.authors);
  const year = sourceYear(source);
  const title = source.title.trim();
  const doi = source.doi ? ` https://doi.org/${source.doi}` : '';
  const url = !source.doi && source.url ? ` ${source.url}` : '';

  if (source.type === 'article') {
    const issue = source.issue ? `(${source.issue})` : '';
    const volumeIssue = source.volume ? `${source.volume}${issue}` : '';
    const volumeChunk = volumeIssue ? `, ${volumeIssue}` : '';
    const pagesChunk = source.pages ? `, ${source.pages}` : '';
    const journal = source.journal ? ` ${source.journal}${volumeChunk}${pagesChunk}.` : '.';
    return compactSpaces(`${authors} (${year}). ${title}.${journal}${doi}${url}`);
  }
  if (source.type === 'book') {
    const publisher = source.publisher ? ` ${source.publisher}.` : '';
    return compactSpaces(`${authors} (${year}). ${title}.${publisher}${doi}${url}`);
  }
  if (source.type === 'chapter') {
    const publisher = source.publisher ? ` ${source.publisher}.` : '';
    const pagesChunk = source.pages ? ` (ss. ${source.pages}).` : '.';
    return compactSpaces(`${authors} (${year}). ${title}.${pagesChunk}${publisher}${doi}${url}`);
  }
  const accessed = source.url ? ` ${source.url}` : '';
  return compactSpaces(`${authors} (${year}). ${title}.${accessed}`);
}

export function formatMLA(source: Source): string {
  const authors = formatAuthorsMLA(source.authors);
  const year = sourceYear(source, 'n.d.');
  const title = source.title.trim();
  const url = source.url ? `, ${source.url}` : '';
  const doi = source.doi ? `, doi:${source.doi}` : '';

  if (source.type === 'article') {
    const journal = source.journal ? ` ${source.journal}` : '';
    const volume = source.volume ? `, vol. ${source.volume}` : '';
    const issue = source.issue ? `, no. ${source.issue}` : '';
    const pages = source.pages ? `, pp. ${source.pages}` : '';
    return compactSpaces(`${authors}. "${title}."${journal}${volume}${issue}, ${year}${pages}${doi}${url}.`);
  }
  if (source.type === 'book') {
    const publisher = source.publisher ? `, ${source.publisher}` : '';
    return compactSpaces(`${authors}. ${title}.${publisher}, ${year}${doi}${url}.`);
  }
  if (source.type === 'chapter') {
    const pages = source.pages ? `, pp. ${source.pages}` : '';
    const publisher = source.publisher ? `, ${source.publisher}` : '';
    return compactSpaces(`${authors}. "${title}." ${year}${pages}${publisher}${doi}${url}.`);
  }
  return compactSpaces(`${authors}. "${title}." ${year}${doi}${url}.`);
}

export function formatVancouver(source: Source): string {
  const authors = formatAuthorsVancouver(source.authors);
  const year = sourceYear(source, '');
  const title = source.title.trim();
  const doi = source.doi ? ` doi:${source.doi}.` : '';
  const url = !source.doi && source.url ? ` Available from: ${source.url}.` : '';

  if (source.type === 'article') {
    const issue = source.issue ? `(${source.issue})` : '';
    const volumeIssue = source.volume ? `${source.volume}${issue}` : '';
    const pages = pagesForVancouver(source.pages);
    const pagesChunk = pages ? `:${pages}` : '';
    const journal = source.journal ? `${source.journal}. ` : '';
    return compactSpaces(`${authors}. ${title}. ${journal}${year}${volumeIssue ? `;${volumeIssue}` : ''}${pagesChunk}.${doi}${url}`);
  }
  if (source.type === 'book') {
    const publisher = source.publisher ? `${source.publisher}; ` : '';
    return compactSpaces(`${authors}. ${title}. ${publisher}${year}.${doi}${url}`);
  }
  if (source.type === 'chapter') {
    const publisher = source.publisher ? `${source.publisher}; ` : '';
    const pages = source.pages ? ` p. ${source.pages}.` : '.';
    return compactSpaces(`${authors}. ${title}. ${publisher}${year}.${pages}${doi}${url}`);
  }
  return compactSpaces(`${authors}. ${title}. ${year}.${url}`);
}

export function formatBibliographyEntry(source: Source, format: CitationFormat): string {
  if (format === 'mla') return formatMLA(source);
  if (format === 'vancouver') return formatVancouver(source);
  return formatAPA(source);
}

function bibtexEscape(value: string): string {
  return value.replace(/[{}]/g, '').trim();
}

function sourceBibKey(source: Source): string {
  const firstAuthor = source.authors[0] ?? 'anon';
  const family = parseAuthorName(firstAuthor).family.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const year = source.year ? String(source.year) : 'nd';
  const titleWord = source.title.split(/\s+/).find(Boolean)?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? 'source';
  return `${family}${year}${titleWord}`;
}

export function formatBibTeX(source: Source): string {
  const entryType = source.type === 'article' ? 'article' : source.type === 'book' ? 'book' : 'misc';
  const fields: Array<[string, string | null]> = [
    ['author', source.authors.length ? source.authors.join(' and ') : null],
    ['title', source.title],
    ['year', source.year ? String(source.year) : null],
    ['journal', source.journal],
    ['publisher', source.publisher],
    ['volume', source.volume],
    ['number', source.issue],
    ['pages', source.pages],
    ['doi', source.doi],
    ['url', source.url],
    ['isbn', source.isbn],
  ];
  const lines = fields
    .filter(([, value]) => Boolean(value?.trim()))
    .map(([key, value]) => `  ${key} = {${bibtexEscape(value ?? '')}}`);
  return `@${entryType}{${sourceBibKey(source)},\n${lines.join(',\n')}\n}`;
}

export function formatBibliographyList(sources: Source[], format: CitationFormat): string {
  return sources.map((source, index) => `${index + 1}. ${formatBibliographyEntry(source, format)}`).join('\n');
}

export function formatBibTeXList(sources: Source[]): string {
  return sources.map((source) => formatBibTeX(source)).join('\n\n');
}
