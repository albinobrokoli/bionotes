import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as repo from '../db/repo';
import { BIONOTES_BACKLINKS_UPDATED, dispatchEditorNavigate, type BacklinksUpdatedDetail } from '../lib/bionotesBridge';
import { useApp } from '../store/app';

type Props = {
  pageId: string;
};

export function BacklinksPanel({ pageId }: Props) {
  const { t } = useTranslation();
  const selectPage = useApp((s) => s.selectPage);
  const [items, setItems] = useState<repo.BacklinkListItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const rows = await repo.listBacklinksForTargetPage(pageId);
      setItems(rows);
    };
    void load();
    const onBacklinksUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<BacklinksUpdatedDetail>).detail;
      if (!detail || detail.pageId !== pageId) return;
      void load();
    };
    window.addEventListener(BIONOTES_BACKLINKS_UPDATED, onBacklinksUpdated);
    return () => window.removeEventListener(BIONOTES_BACKLINKS_UPDATED, onBacklinksUpdated);
  }, [pageId]);

  return (
    <section className="rail__section">
      <div className="rail__section-title">Bağlantılı sayfalar</div>
      {items.length === 0 ? (
        <div className="rail__empty">{t('rightRail.empty')}</div>
      ) : (
        <ul className="rail__backlinks-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="rail__backlink-item"
                onClick={() => {
                  void (async () => {
                    await selectPage(item.sourcePageId);
                    window.setTimeout(() => {
                      dispatchEditorNavigate({ pageId: item.sourcePageId, blockId: item.blockId });
                    }, 40);
                  })();
                }}
              >
                <div className="rail__backlink-title">{item.sourcePageTitle}</div>
                <div className="rail__backlink-excerpt">{item.contextExcerpt || '...'}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
