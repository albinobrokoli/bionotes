import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, useActivePage } from '../store/app';
import { LucideIcons } from '../lib/icons';
import { SourcesPanel } from './SourcesPanel';
import { BacklinksPanel } from './BacklinksPanel';
import './RightRail.css';

const { X } = LucideIcons;

export function RightRail() {
  const { t } = useTranslation();
  const page = useActivePage();
  const { rightRailOpen, toggleRightRail } = useApp();
  const [tab, setTab] = useState<'meta' | 'sources' | 'backlinks'>('sources');

  if (!rightRailOpen) return null;

  return (
    <aside className="rail">
      <header className="rail__header">
        <div className="rail__title">{t('rightRail.title')}</div>
        <button
          type="button"
          className="tweaks__close"
          onClick={() => void toggleRightRail()}
          aria-label={t('rightRail.hide')}
          style={{ color: 'var(--tx-4)' }}
        >
          <X size={14} />
        </button>
      </header>

      <div className="rail__body">
        {!page ? (
          <div className="rail__empty">{t('rightRail.empty')}</div>
        ) : (
          <>
            <div className="rail__tabs">
              <button type="button" data-active={tab === 'meta'} onClick={() => setTab('meta')}>
                {t('rightRail.metadata')}
              </button>
              <button type="button" data-active={tab === 'sources'} onClick={() => setTab('sources')}>
                {t('rightRail.sources')}
              </button>
              <button type="button" data-active={tab === 'backlinks'} onClick={() => setTab('backlinks')}>
                {t('rightRail.backlinks')}
              </button>
            </div>

            {tab === 'meta' ? (
              <>
                <section className="rail__section">
                  <div className="rail__meta">
                    <div className="rail__meta-row">
                      <span className="rail__meta-key">created</span>
                      <span className="rail__meta-val">
                        {new Date(page.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="rail__meta-row">
                      <span className="rail__meta-key">updated</span>
                      <span className="rail__meta-val">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="rail__meta-row">
                      <span className="rail__meta-key">id</span>
                      <span className="rail__meta-val">{page.id}</span>
                    </div>
                  </div>
                </section>

                <section className="rail__section">
                  <div className="rail__section-title">{t('rightRail.tags')}</div>
                  {page.tags.length ? (
                    <div className="rail__tags">
                      {page.tags.map((tag) => (
                        <span key={tag} className="rail__tag">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="rail__empty">—</div>
                  )}
                </section>
              </>
            ) : null}
            {tab === 'sources' ? <SourcesPanel pageId={page.id} /> : null}
            {tab === 'backlinks' ? <BacklinksPanel pageId={page.id} /> : null}
          </>
        )}
      </div>
    </aside>
  );
}
