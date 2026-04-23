import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useApp } from '../store/app';
import { BioNotesLogo, LucideIcons, SpaceIcon } from '../lib/icons';
import './Sidebar.css';

const {
  Search,
  ChevronRight,
  Inbox,
  Calendar,
  Star,
  FileText,
  Tag,
  Network,
  Plus,
  Settings,
} = LucideIcons;

export function Sidebar() {
  const { t } = useTranslation();
  const {
    spaces,
    categories,
    pages,
    activePageId,
    activeCategoryId,
    selectPage,
    toggleSpace,
    toggleCategory,
    createPage,
    openCommand,
    openGraph,
    toggleTweaks,
  } = useApp();
  const [createError, setCreateError] = useState<string | null>(null);

  const favorites = useMemo(() => pages.filter((p) => p.favorite), [pages]);

  return (
    <aside className="sidebar">
      <div className="sidebar__drag" data-tauri-drag-region />

      <button type="button" className="sidebar__workspace" data-tauri-drag-region>
        <BioNotesLogo size={22} />
        <span className="sidebar__workspace-label">{t('app.name')}</span>
        <ChevronRight size={14} style={{ color: 'var(--tx-4)' }} />
      </button>

      <div className="sidebar__search">
        <Search size={14} className="sidebar__search-icon" />
        <input
          type="text"
          placeholder={t('sidebar.searchPlaceholder')}
          onFocus={(e) => {
            e.currentTarget.blur();
            openCommand();
          }}
          readOnly
        />
        <span className="sidebar__search-hint">⌘K</span>
      </div>

      <div className="sidebar__scroll">
        <div className="sidebar__section">
          <QuickItem icon={<Inbox size={14} />} label={t('sidebar.inbox')} />
          <QuickItem icon={<Calendar size={14} />} label={t('sidebar.today')} />
          <QuickItem icon={<Star size={14} />} label={t('sidebar.favorites')} count={favorites.length} />
          <QuickItem icon={<FileText size={14} />} label={t('sidebar.drafts')} />
          <QuickItem icon={<Tag size={14} />} label={t('sidebar.tags')} />
          <QuickItem icon={<Network size={14} />} label={t('sidebar.graph')} onClick={openGraph} />
        </div>

        <div className="sidebar__section">
          <div className="sidebar__section-title">
            <span>{t('sidebar.spaces')}</span>
            <button type="button" aria-label={t('sidebar.newSpace')} title={t('sidebar.newSpace')}>
              <Plus size={12} />
            </button>
          </div>

          {spaces.map((space) => {
            const spaceCategories = categories.filter((c) => c.spaceId === space.id);
            return (
              <div key={space.id}>
                <button
                  type="button"
                  className="sidebar__tree-space"
                  onClick={() => void toggleSpace(space.id)}
                >
                  <span className={clsx('sidebar__chevron', space.expanded && 'is-open')}>
                    <ChevronRight size={12} />
                  </span>
                  <SpaceIcon name={space.icon} size={14} color={space.color} />
                  <span className="sidebar__item-label">{space.name}</span>
                </button>

                {space.expanded &&
                  spaceCategories.map((cat) => {
                    const catPages = pages.filter((p) => p.categoryId === cat.id);
                    return (
                      <div key={cat.id}>
                        <button
                          type="button"
                          className={clsx(
                            'sidebar__tree-category',
                            activeCategoryId === cat.id && 'is-active-category',
                          )}
                          onClick={() => void toggleCategory(cat.id)}
                        >
                          <span className={clsx('sidebar__chevron', cat.expanded && 'is-open')}>
                            <ChevronRight size={10} />
                          </span>
                          <span className="sidebar__item-label">{cat.name}</span>
                        </button>

                        {cat.expanded &&
                          catPages.map((page) => (
                            <button
                              type="button"
                              key={page.id}
                              className={clsx(
                                'sidebar__item',
                                'sidebar__tree-page',
                                activePageId === page.id && 'is-active',
                              )}
                              onClick={() => void selectPage(page.id)}
                            >
                              <span className="sidebar__item-icon">
                                <FileText size={12} />
                              </span>
                              <span className="sidebar__item-label">{page.title}</span>
                              {page.favorite && (
                                <Star size={11} className="sidebar__item-star" fill="currentColor" />
                              )}
                            </button>
                          ))}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="sidebar__footer">
        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            const cat =
              categories.find((c) => c.id === activeCategoryId) ?? categories[0];
            void createPage(cat?.id, t('editor.untitled')).catch(() => {
              setCreateError('Sayfa olusturulamadi.');
            });
          }}
        >
          <Plus size={14} />
          {t('sidebar.newPage')}
        </button>
        {createError ? <span className="sidebar__create-error">{createError}</span> : null}
        <div className="flex-1" />
        <button type="button" onClick={toggleTweaks} aria-label={t('tweaks.open')} title={t('tweaks.open')}>
          <Settings size={14} />
        </button>
      </div>
    </aside>
  );
}

function QuickItem({
  icon,
  label,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="sidebar__item" onClick={onClick}>
      <span className="sidebar__item-icon">{icon}</span>
      <span className="sidebar__item-label">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span style={{ color: 'var(--tx-4)', fontSize: 10 }}>{count}</span>
      )}
    </button>
  );
}
