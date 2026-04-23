import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as repo from '../db/repo';
import { useActivePage, useApp } from '../store/app';
import {
  formatBibliographyEntry,
  formatBibliographyList,
  formatBibTeXList,
  type CitationFormat,
} from '../services/bibliography';
import type { Source } from '../types/source';
import './BibliographyExport.css';

type BibliographyScope = 'page' | 'space' | 'workspace';

type Props = {
  open: boolean;
  onClose: () => void;
};

function uniqById(sources: Source[]): Source[] {
  const map = new Map<string, Source>();
  for (const source of sources) map.set(source.id, source);
  return Array.from(map.values());
}

export function BibliographyExport({ open, onClose }: Props) {
  const { t } = useTranslation();
  const page = useActivePage();
  const { categories, pages, activeSpaceId, citationFormat } = useApp();
  const [format, setFormat] = useState<CitationFormat>(citationFormat);
  const [scope, setScope] = useState<BibliographyScope>('page');
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormat(citationFormat);
    setScope(page ? 'page' : 'workspace');
    setStatus(null);
  }, [open, citationFormat, page]);

  useEffect(() => {
    if (!open) return;
    const loadSources = async () => {
      setBusy(true);
      setStatus(null);
      try {
        if (scope === 'workspace') {
          setSources(await repo.listSources());
          return;
        }
        if (scope === 'page') {
          if (!page) {
            setSources([]);
            return;
          }
          setSources(await repo.listSourcesForPage(page.id));
          return;
        }
        if (!activeSpaceId) {
          setSources([]);
          return;
        }
        const pageIds = new Set<string>();
        const categoryIds = new Set(
          categories.filter((category) => category.spaceId === activeSpaceId).map((category) => category.id),
        );
        pages.forEach((entry) => {
          if (categoryIds.has(entry.categoryId)) pageIds.add(entry.id);
        });
        const resolved = await Promise.all([...pageIds].map((pageId) => repo.listSourcesForPage(pageId)));
        setSources(uniqById(resolved.flat()));
      } finally {
        setBusy(false);
      }
    };
    void loadSources();
  }, [open, scope, page, activeSpaceId, categories, pages]);

  const bibliographyText = useMemo(
    () => formatBibliographyList(sources, format),
    [sources, format],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(bibliographyText);
      setStatus(t('bibliography.copied'));
    } catch {
      setStatus(t('bibliography.copyFailed'));
    }
  };

  const onDownloadBibtex = () => {
    try {
      const blob = new Blob([formatBibTeXList(sources)], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `bibliography-${scope}.bib`;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(t('bibliography.downloaded'));
    } catch {
      setStatus(t('bibliography.downloadFailed'));
    }
  };

  if (!open) return null;

  return (
    <div className="bibliography-dialog__overlay" role="dialog" aria-modal="true">
      <div className="bibliography-dialog">
        <header className="bibliography-dialog__header">
          <h3>{t('bibliography.title')}</h3>
          <button type="button" onClick={onClose}>
            {t('tweaks.close')}
          </button>
        </header>
        <div className="bibliography-dialog__body">
          <div className="bibliography-dialog__group">
            <div className="bibliography-dialog__label">{t('bibliography.format')}</div>
            <div className="bibliography-dialog__radios">
              {(['apa', 'mla', 'vancouver'] as CitationFormat[]).map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="citation-format"
                    checked={format === option}
                    onChange={() => setFormat(option)}
                  />
                  <span>{option.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bibliography-dialog__group">
            <div className="bibliography-dialog__label">{t('bibliography.scope')}</div>
            <div className="bibliography-dialog__radios">
              <label>
                <input
                  type="radio"
                  name="bibliography-scope"
                  checked={scope === 'page'}
                  onChange={() => setScope('page')}
                  disabled={!page}
                />
                <span>{t('bibliography.scopes.page')}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="bibliography-scope"
                  checked={scope === 'space'}
                  onChange={() => setScope('space')}
                />
                <span>{t('bibliography.scopes.space')}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="bibliography-scope"
                  checked={scope === 'workspace'}
                  onChange={() => setScope('workspace')}
                />
                <span>{t('bibliography.scopes.workspace')}</span>
              </label>
            </div>
          </div>

          <div className="bibliography-dialog__preview">
            {busy ? (
              <p>{t('bibliography.loading')}</p>
            ) : sources.length === 0 ? (
              <p>{t('bibliography.empty')}</p>
            ) : (
              <ol>
                {sources.map((source) => (
                  <li key={source.id}>{formatBibliographyEntry(source, format)}</li>
                ))}
              </ol>
            )}
          </div>
          {status ? <div className="bibliography-dialog__status">{status}</div> : null}
        </div>
        <footer className="bibliography-dialog__footer">
          <button type="button" onClick={onCopy} disabled={busy || sources.length === 0}>
            {t('bibliography.copy')}
          </button>
          <button type="button" onClick={onDownloadBibtex} disabled={busy || sources.length === 0}>
            {t('bibliography.downloadBibtex')}
          </button>
        </footer>
      </div>
    </div>
  );
}
