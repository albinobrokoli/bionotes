import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import './AboutDialog.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: Props) {
  const [version, setVersion] = useState('—');

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch {
        setVersion('dev');
      }
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div className="about-dialog__overlay" role="dialog" aria-modal="true">
      <div className="about-dialog">
        <header className="about-dialog__header">
          <h3>Hakkında</h3>
          <button type="button" onClick={onClose}>
            Kapat
          </button>
        </header>
        <div className="about-dialog__body">
          <p className="about-dialog__name">BioNotes</p>
          <p>Sürüm: v{version}</p>
          <p>Yerel-öncelikli bilim notları için masaüstü uygulaması.</p>
        </div>
      </div>
    </div>
  );
}
