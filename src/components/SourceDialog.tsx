import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as repo from '../db/repo';
import { resolveDoi } from '../services/doiResolver';
import { dispatchSourceLinksUpdated } from '../lib/bionotesBridge';
import type { Source, SourceType } from '../types/source';
import './SourceDialog.css';

type Props = {
  pageId: string;
  onClose: () => void;
  onCreated: (source: Source) => void;
};

type FormState = {
  type: SourceType;
  title: string;
  authors: string;
  year: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
  isbn: string;
  publisher: string;
};

const initialForm: FormState = {
  type: 'article',
  title: '',
  authors: '',
  year: '',
  journal: '',
  volume: '',
  issue: '',
  pages: '',
  doi: '',
  url: '',
  isbn: '',
  publisher: '',
};

export function SourceDialog({ pageId, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canResolve = form.doi.trim().length > 0 && !busy;
  const canSave = form.title.trim().length > 0 && !busy;

  const authorList = useMemo(
    () =>
      form.authors
        .split(',')
        .map((author) => author.trim())
        .filter((author) => author.length > 0),
    [form.authors],
  );

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onResolve = async () => {
    if (!canResolve) return;
    setBusy(true);
    setError(null);
    try {
      const resolved = await resolveDoi(form.doi);
      setForm((prev) => ({
        ...prev,
        type: resolved.type,
        title: resolved.title,
        authors: resolved.authors.join(', '),
        year: resolved.year ? String(resolved.year) : '',
        journal: resolved.journal ?? '',
        volume: resolved.volume ?? '',
        issue: resolved.issue ?? '',
        pages: resolved.pages ?? '',
        url: resolved.url ?? '',
        publisher: resolved.publisher ?? '',
        doi: resolved.doi ?? prev.doi,
      }));
    } catch {
      setError(t('sources.resolveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!canSave) return;
    setBusy(true);
    setError(null);
    try {
      const parsedYear = form.year.trim() ? Number(form.year) : null;
      const source = await repo.createSource({
        type: form.type,
        title: form.title.trim(),
        authors: authorList,
        year: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
        journal: form.journal.trim() || null,
        volume: form.volume.trim() || null,
        issue: form.issue.trim() || null,
        pages: form.pages.trim() || null,
        doi: form.doi.trim() || null,
        url: form.url.trim() || null,
        isbn: form.isbn.trim() || null,
        publisher: form.publisher.trim() || null,
      });
      await repo.linkSourceToPage({ sourceId: source.id, pageId });
      dispatchSourceLinksUpdated({ pageId });
      onCreated(source);
      onClose();
    } catch {
      setError(t('sources.saveFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="source-dialog__overlay" role="dialog" aria-modal="true">
      <div className="source-dialog">
        <header className="source-dialog__header">
          <h3>{t('sources.addSource')}</h3>
          <button type="button" onClick={onClose}>
            {t('tweaks.close')}
          </button>
        </header>
        <div className="source-dialog__body">
          <label>
            Type
            <select
              value={form.type}
              onChange={(event) => setField('type', event.target.value as SourceType)}
            >
              <option value="article">Article</option>
              <option value="book">Book</option>
              <option value="chapter">Chapter</option>
              <option value="web">Web</option>
            </select>
          </label>
          <label>
            Title
            <input value={form.title} onChange={(event) => setField('title', event.target.value)} />
          </label>
          <label>
            {t('sources.authors')}
            <input value={form.authors} onChange={(event) => setField('authors', event.target.value)} />
          </label>
          <div className="source-dialog__grid">
            <label>
              {t('sources.year')}
              <input value={form.year} onChange={(event) => setField('year', event.target.value)} />
            </label>
            <label>
              {t('sources.journal')}
              <input value={form.journal} onChange={(event) => setField('journal', event.target.value)} />
            </label>
          </div>
          <div className="source-dialog__grid">
            <label>
              DOI
              <input value={form.doi} onChange={(event) => setField('doi', event.target.value)} />
            </label>
            <label>
              URL
              <input value={form.url} onChange={(event) => setField('url', event.target.value)} />
            </label>
          </div>
          {form.type !== 'web' && (
            <div className="source-dialog__grid">
              <label>
                Volume
                <input value={form.volume} onChange={(event) => setField('volume', event.target.value)} />
              </label>
              <label>
                Issue
                <input value={form.issue} onChange={(event) => setField('issue', event.target.value)} />
              </label>
            </div>
          )}
          <div className="source-dialog__grid">
            <label>
              Pages
              <input value={form.pages} onChange={(event) => setField('pages', event.target.value)} />
            </label>
            <label>
              ISBN
              <input value={form.isbn} onChange={(event) => setField('isbn', event.target.value)} />
            </label>
          </div>
          <label>
            Publisher
            <input value={form.publisher} onChange={(event) => setField('publisher', event.target.value)} />
          </label>
          {error ? <div className="source-dialog__error">{error}</div> : null}
        </div>
        <footer className="source-dialog__footer">
          <button type="button" onClick={onResolve} disabled={!canResolve}>
            {t('sources.resolveDoi')}
          </button>
          <button type="button" onClick={onSave} disabled={!canSave}>
            {t('sources.addSource')}
          </button>
        </footer>
      </div>
    </div>
  );
}
