import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { open as openExternal } from '@tauri-apps/plugin-shell';
import {
  exportToNotebookLm,
  getNotebookLmScopePageCount,
  type NotebookLmScope,
} from '../services/notebookLmExport';
import { useActivePage, useApp } from '../store/app';
import './ExportDialog.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ExportDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const page = useActivePage();
  const { activeCategoryId, activeSpaceId } = useApp();
  const [scope, setScope] = useState<NotebookLmScope>('page');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    setScope(page ? 'page' : activeCategoryId ? 'category' : 'space');
    setBusy(false);
    setStatus(null);
    setError(null);
    setProgress(null);
  }, [open, page, activeCategoryId, activeSpaceId]);

  const showProgress = useMemo(() => {
    try {
      return getNotebookLmScopePageCount(scope) >= 20;
    } catch {
      return false;
    }
  }, [scope]);

  const onDownloadZip = async () => {
    setBusy(true);
    setStatus(null);
    setError(null);
    setProgress(null);
    try {
      const result = await exportToNotebookLm(scope, (p) => {
        setProgress({ processed: p.processed, total: p.total });
      });
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus(t('notebooklm.downloadDone'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('notebooklm.exportFailed'));
    } finally {
      setBusy(false);
    }
  };

  const onOpenNotebookLm = async () => {
    try {
      await openExternal('https://notebooklm.google.com');
    } catch {
      setError(t('notebooklm.openFailed'));
    }
  };

  if (!open) return null;

  return (
    <div className="export-dialog__overlay" role="dialog" aria-modal="true">
      <div className="export-dialog">
        <header className="export-dialog__header">
          <h3>{t('notebooklm.title')}</h3>
          <button type="button" onClick={onClose}>
            {t('tweaks.close')}
          </button>
        </header>

        <div className="export-dialog__body">
          <p className="export-dialog__desc">{t('notebooklm.description')}</p>

          <div className="export-dialog__group">
            <div className="export-dialog__label">{t('notebooklm.scope')}</div>
            <div className="export-dialog__radios">
              <label>
                <input
                  type="radio"
                  name="notebooklm-scope"
                  checked={scope === 'page'}
                  onChange={() => setScope('page')}
                  disabled={!page}
                />
                <span>{t('notebooklm.scopes.page')}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="notebooklm-scope"
                  checked={scope === 'category'}
                  onChange={() => setScope('category')}
                  disabled={!activeCategoryId}
                />
                <span>{t('notebooklm.scopes.category')}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="notebooklm-scope"
                  checked={scope === 'space'}
                  onChange={() => setScope('space')}
                  disabled={!activeSpaceId}
                />
                <span>{t('notebooklm.scopes.space')}</span>
              </label>
            </div>
          </div>

          {busy ? <div className="export-dialog__status">{t('notebooklm.exporting')}</div> : null}
          {showProgress && progress ? (
            <div className="export-dialog__progress">
              <progress max={progress.total} value={progress.processed} />
              <span>
                {progress.processed}/{progress.total}
              </span>
            </div>
          ) : null}
          {status ? <div className="export-dialog__status">{status}</div> : null}
          {error ? <div className="export-dialog__error">{error}</div> : null}
        </div>

        <footer className="export-dialog__footer">
          <button type="button" onClick={onDownloadZip} disabled={busy}>
            {t('notebooklm.downloadZip')}
          </button>
          <button type="button" onClick={() => void onOpenNotebookLm()} disabled={busy}>
            {t('notebooklm.openNotebookLm')}
          </button>
        </footer>
      </div>
    </div>
  );
}
