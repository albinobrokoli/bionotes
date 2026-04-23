import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { invoke } from '@tauri-apps/api/core';
import { useApp, useActivePage, useActiveCategory, useActiveSpace } from '../store/app';
import { LucideIcons } from '../lib/icons';
import './Breadcrumb.css';

const {
  ArrowLeft,
  ArrowRight,
  Eye,
  Pencil,
  Columns2,
  MoreHorizontal,
  PanelRight,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
} = LucideIcons;

export type BreadcrumbProps = {
  pdfUiTab?: 'pdf' | 'editor';
  onPdfUiTab?: (tab: 'pdf' | 'editor') => void;
  /** Geniş ekranda yan yana PDF + editör; sekme çubuğu gizlenir */
  splitSideBySide?: boolean;
};

export function Breadcrumb({ pdfUiTab = 'pdf', onPdfUiTab, splitSideBySide = false }: BreadcrumbProps) {
  const { t } = useTranslation();
  const {
    viewMode,
    setViewMode,
    toggleRightRail,
    saveStatus,
    lastSavedAt,
    attachPagePdf,
    goBack,
    goForward,
    navBack,
    navForward,
    selectSpace,
    selectCategory,
    selectPage,
  } = useApp();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);
  const page = useActivePage();
  const category = useActiveCategory();
  const space = useActiveSpace();
  const [, bump] = useReducer((n: number) => n + 1, 0);

  const displayTs = lastSavedAt ?? page?.updatedAt ?? null;

  useEffect(() => {
    if (!page || saveStatus !== 'saved' || displayTs === null) return;
    const id = window.setInterval(() => bump(), 1000);
    return () => window.clearInterval(id);
  }, [page, saveStatus, displayTs]);

  const now = Date.now();
  const savedLabel =
    saveStatus === 'saved' && displayTs !== null
      ? (() => {
          const sec = Math.floor((now - displayTs) / 1000);
          if (sec < 10) return t('editor.savedJustNow');
          return t('editor.savedSecondsAgo', { count: sec });
        })()
      : null;

  const handleAddPdf = async () => {
    if (!page || pdfBusy) return;
    setPdfBusy(true);
    setPdfFeedback('PDF hazırlanıyor…');
    try {
      const src = await invoke<string | null>('pick_pdf');
      if (!src) {
        setPdfFeedback(null);
        return;
      }
      setPdfFeedback('PDF kopyalanıyor…');
      const dest = await invoke<string>('copy_to_appdata', { src });
      const base = src.replace(/[/\\]/g, '/').split('/').pop() ?? 'document.pdf';
      await attachPagePdf(page.id, dest, base);
      setPdfFeedback('PDF eklendi.');
      onPdfUiTab?.('pdf');
    } catch (e) {
      console.error(e);
      setPdfFeedback('PDF eklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setPdfBusy(false);
      window.setTimeout(() => setPdfFeedback(null), 2500);
    }
  };

  return (
    <header className="breadcrumb" data-tauri-drag-region>
      <div className="breadcrumb__nav">
        <button
          type="button"
          className="breadcrumb__nav-btn"
          disabled={navBack.length === 0}
          onClick={() => void goBack()}
          aria-label={t('breadcrumb.back')}
          title={t('breadcrumb.back')}
        >
          <ArrowLeft size={14} />
        </button>
        <button
          type="button"
          className="breadcrumb__nav-btn"
          disabled={navForward.length === 0}
          onClick={() => void goForward()}
          aria-label={t('breadcrumb.forward')}
          title={t('breadcrumb.forward')}
        >
          <ArrowRight size={14} />
        </button>
      </div>

      <nav className="breadcrumb__path">
        {space && (
          <button type="button" className="breadcrumb__path-item" onClick={() => void selectSpace(space.id)}>
            {space.name}
          </button>
        )}
        {space && category && <span className="breadcrumb__separator">›</span>}
        {category && (
          <button type="button" className="breadcrumb__path-item" onClick={() => void selectCategory(category.id)}>
            {category.name}
          </button>
        )}
        {category && page && <span className="breadcrumb__separator">›</span>}
        {page && (
          <button
            type="button"
            className="breadcrumb__path-item is-current"
            title={page.title}
            onClick={() => void selectPage(page.id)}
          >
            {page.title}
          </button>
        )}
      </nav>

      {page && !(page.pdfPath && pdfUiTab === 'pdf' && !splitSideBySide) && (
        <div
          className={clsx('breadcrumb__save', saveStatus === 'error' && 'is-error')}
          role="status"
          aria-live="polite"
        >
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={11} className="breadcrumb__save-spinner" aria-hidden />
              <span>{t('editor.saveSaving')}</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <CheckCircle2 size={11} style={{ color: 'var(--accent)' }} aria-hidden />
              <span>{savedLabel ?? t('editor.savedJustNow')}</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle size={11} aria-hidden />
              <span>{t('editor.saveFailed')}</span>
            </>
          )}
        </div>
      )}

      <div className="breadcrumb__actions">
        {page && (
          <button
            type="button"
            className="breadcrumb__pdf-add"
            onClick={() => void handleAddPdf()}
            disabled={pdfBusy}
            title={t('breadcrumb.addPdf')}
            aria-label={t('breadcrumb.addPdf')}
          >
            <FileText size={12} />
            {t('breadcrumb.addPdf')}
          </button>
        )}
        {pdfFeedback ? <span className="breadcrumb__pdf-feedback">{pdfFeedback}</span> : null}
        {page?.pdfPath && !splitSideBySide && (
          <div className="breadcrumb__pdf-toggle" role="group" aria-label={t('breadcrumb.pdfEditorToggle')}>
            <button
              type="button"
              className={clsx(pdfUiTab === 'pdf' && 'is-active')}
              onClick={() => onPdfUiTab?.('pdf')}
            >
              {t('breadcrumb.viewPdf')}
            </button>
            <button
              type="button"
              className={clsx(pdfUiTab === 'editor' && 'is-active')}
              onClick={() => onPdfUiTab?.('editor')}
            >
              {t('breadcrumb.viewEditor')}
            </button>
          </div>
        )}
        <div className="breadcrumb__mode">
          <button
            type="button"
            className={clsx(viewMode === 'edit' && 'is-active')}
            onClick={() => void setViewMode('edit')}
            title={t('breadcrumb.edit')}
          >
            <Pencil size={11} />
            {t('breadcrumb.edit')}
          </button>
          <button
            type="button"
            className={clsx(viewMode === 'preview' && 'is-active')}
            onClick={() => void setViewMode('preview')}
            title={t('breadcrumb.preview')}
          >
            <Eye size={11} />
            {t('breadcrumb.preview')}
          </button>
          <button
            type="button"
            className={clsx(viewMode === 'split' && 'is-active')}
            onClick={() => void setViewMode('split')}
            title={t('breadcrumb.split')}
          >
            <Columns2 size={11} />
            {t('breadcrumb.split')}
          </button>
        </div>
        <button
          type="button"
          className="breadcrumb__nav-btn"
          onClick={() => void toggleRightRail()}
          aria-label={t('rightRail.title')}
          title={t('rightRail.title')}
        >
          <PanelRight size={14} />
        </button>
        <button
          type="button"
          className="breadcrumb__nav-btn"
          aria-label={t('breadcrumb.more')}
          title={t('breadcrumb.more')}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </header>
  );
}
