import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useApp } from '../store/app';
import { LucideIcons } from '../lib/icons';
import './CommandPalette.css';

const { Search, FileText, Plus, Import, FileDigit, Network, Settings } = LucideIcons;

type Action = {
  id: string;
  label: string;
  icon: React.ReactNode;
  breadcrumb?: string;
  run: () => void;
};

type Props = {
  onOpenBibliographyExport: () => void;
  onOpenNotebookLmExport: () => void;
  onOpenGraphView: () => void;
  onOpenAbout: () => void;
  onShowOnboardingAgain: () => void;
};

export function CommandPalette({
  onOpenBibliographyExport,
  onOpenNotebookLmExport,
  onOpenGraphView,
  onOpenAbout,
  onShowOnboardingAgain,
}: Props) {
  const { t } = useTranslation();
  const {
    commandOpen,
    closeCommand,
    spaces,
    categories,
    pages,
    selectPage,
    activeCategoryId,
    createPage,
    toggleTweaks,
    toggleRightRail,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandOpen]);

  const actions: Action[] = useMemo(() => {
    const fallbackCat = activeCategoryId ?? categories[0]?.id;
    return [
      {
        id: 'new-page',
        label: t('commandPalette.actions.newPage'),
        icon: <Plus size={14} />,
        run: () => {
          void createPage(fallbackCat, t('editor.untitled')).catch((err) => {
            console.error(err);
          });
          closeCommand();
        },
      },
      {
        id: 'import-notion',
        label: t('commandPalette.actions.importNotion'),
        icon: <Import size={14} />,
        run: () => closeCommand(),
      },
      {
        id: 'open-pdf',
        label: t('commandPalette.actions.openPdf'),
        icon: <FileDigit size={14} />,
        run: () => closeCommand(),
      },
      {
        id: 'open-graph',
        label: t('commandPalette.actions.openGraph'),
        icon: <Network size={14} />,
        run: () => {
          onOpenGraphView();
          closeCommand();
        },
      },
      {
        id: 'bibliography-export',
        label: t('commandPalette.actions.generateBibliography'),
        icon: <FileText size={14} />,
        run: () => {
          onOpenBibliographyExport();
          closeCommand();
        },
      },
      {
        id: 'notebooklm-export',
        label: t('commandPalette.actions.sendToNotebookLm'),
        icon: <FileText size={14} />,
        run: () => {
          onOpenNotebookLmExport();
          closeCommand();
        },
      },
      {
        id: 'toggle-tweaks',
        label: t('commandPalette.actions.toggleTweaks'),
        icon: <Settings size={14} />,
        run: () => {
          toggleTweaks();
          closeCommand();
        },
      },
      {
        id: 'toggle-right-rail',
        label: t('commandPalette.actions.toggleRightRail'),
        icon: <Settings size={14} />,
        run: () => {
          void toggleRightRail();
          closeCommand();
        },
      },
      {
        id: 'onboarding-again',
        label: t('commandPalette.actions.showOnboardingAgain'),
        icon: <Settings size={14} />,
        run: () => {
          onShowOnboardingAgain();
          closeCommand();
        },
      },
      {
        id: 'about',
        label: t('commandPalette.actions.about'),
        icon: <FileText size={14} />,
        run: () => {
          onOpenAbout();
          closeCommand();
        },
      },
    ];
  }, [
    activeCategoryId,
    categories,
    createPage,
    closeCommand,
    onOpenBibliographyExport,
    onOpenNotebookLmExport,
    onOpenGraphView,
    onOpenAbout,
    onShowOnboardingAgain,
    t,
    toggleTweaks,
    toggleRightRail,
  ]);

  const pageResults: Action[] = useMemo(() => {
    return pages.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      const sp = spaces.find((s) => s.id === cat?.spaceId);
      const bc = [sp?.name, cat?.name].filter(Boolean).join(' › ');
      return {
        id: `pg:${p.id}`,
        label: p.title,
        icon: <FileText size={14} />,
        breadcrumb: bc,
        run: () => {
          void selectPage(p.id);
          closeCommand();
        },
      };
    });
  }, [pages, categories, spaces, selectPage, closeCommand]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterFn = (a: Action) =>
      !q || a.label.toLowerCase().includes(q) || a.breadcrumb?.toLowerCase().includes(q);
    const sections = [
      { title: t('commandPalette.sections.actions'), items: actions.filter(filterFn) },
      { title: t('commandPalette.sections.pages'), items: pageResults.filter(filterFn) },
    ];
    return sections.filter((s) => s.items.length > 0);
  }, [query, actions, pageResults, t]);

  const flat: Action[] = useMemo(() => filtered.flatMap((s) => s.items), [filtered]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!flat.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => (s + 1) % flat.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => (s - 1 + flat.length) % flat.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        flat[selected]?.run();
      }
    },
    [flat, selected],
  );

  if (!commandOpen) return null;

  const root = document.body;
  return createPortal(
    <div
      className="cmdp__overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCommand();
      }}
    >
      <div className="cmdp__box" onKeyDown={handleKey}>
        <div className="cmdp__search">
          <Search size={16} style={{ color: 'var(--tx-4)' }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
            placeholder={t('commandPalette.placeholder')}
            autoFocus
          />
          <span className="cmdp__kbd">esc</span>
        </div>

        <div className="cmdp__list">
          {flat.length === 0 ? (
            <div className="cmdp__empty">{t('commandPalette.empty')}</div>
          ) : (
            filtered.map((section) => {
              const start = flat.findIndex((it) => it.id === section.items[0]?.id);
              return (
                <div key={section.title} className="cmdp__section">
                  <div className="cmdp__section-title">{section.title}</div>
                  {section.items.map((item, i) => {
                    const globalIdx = start + i;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={clsx('cmdp__item', globalIdx === selected && 'is-selected')}
                        onClick={item.run}
                        onMouseEnter={() => setSelected(globalIdx)}
                      >
                        <span className="cmdp__item-icon">{item.icon}</span>
                        <span className="cmdp__item-title">{item.label}</span>
                        {item.breadcrumb && (
                          <span className="cmdp__item-breadcrumb">{item.breadcrumb}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="cmdp__footer">
          <span>{t('app.name')}</span>
          <div className="cmdp__footer-keys">
            <span>↵ open</span>
            <span>↑↓ navigate</span>
            <span>esc close</span>
          </div>
        </div>
      </div>
    </div>,
    root,
  );
}
