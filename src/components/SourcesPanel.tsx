import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as repo from '../db/repo';
import { BIONOTES_SOURCE_LINKS_UPDATED, type SourceLinksUpdatedDetail } from '../lib/bionotesBridge';
import type { Source } from '../types/source';
import { formatCitation } from '../types/source';
import { SourceDialog } from './SourceDialog';

type Props = {
  pageId: string;
};

export function SourcesPanel({ pageId }: Props) {
  const { t } = useTranslation();
  const [sources, setSources] = useState<Source[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const data = await repo.listSourcesForPage(pageId);
      setSources(data);
    };
    void load();
    const onSourceLinksUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<SourceLinksUpdatedDetail>).detail;
      if (!detail || detail.pageId !== pageId) return;
      void load();
    };
    window.addEventListener(BIONOTES_SOURCE_LINKS_UPDATED, onSourceLinksUpdated);
    return () => window.removeEventListener(BIONOTES_SOURCE_LINKS_UPDATED, onSourceLinksUpdated);
  }, [pageId]);

  const sorted = useMemo(
    () => [...sources].sort((a, b) => a.title.localeCompare(b.title)),
    [sources],
  );

  return (
    <>
      <section className="rail__section">
        <div className="rail__section-title">{t('rightRail.sources')}</div>
        <button type="button" className="rail__source-add" onClick={() => setOpen(true)}>
          {t('sources.addSource')}
        </button>
        {sorted.length === 0 ? (
          <div className="rail__empty">{t('rightRail.empty')}</div>
        ) : (
          <ul className="rail__source-list">
            {sorted.map((source) => (
              <li key={source.id}>
                <div className="rail__source-title">{source.title}</div>
                <div className="rail__source-cite">{formatCitation(source)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {open ? (
        <SourceDialog
          pageId={pageId}
          onClose={() => setOpen(false)}
          onCreated={(source) => setSources((prev) => [...prev, source])}
        />
      ) : null}
    </>
  );
}
