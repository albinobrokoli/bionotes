import { useState } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import type { AvailableUpdate } from '../services/updater';
import { installAvailableUpdate } from '../services/updater';
import './UpdateBanner.css';

type Props = {
  update: AvailableUpdate;
};

export function UpdateBanner({ update }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onInstall = async () => {
    setBusy(true);
    setError(null);
    try {
      await installAvailableUpdate();
      await relaunch();
    } catch (installError) {
      setError(installError instanceof Error ? installError.message : 'Güncelleme yüklenemedi.');
      setBusy(false);
    }
  };

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span>
        Yeni sürüm v{update.version} mevcut.
        <button type="button" onClick={() => void onInstall()} disabled={busy}>
          {busy ? 'Yükleniyor…' : 'İndir'}
        </button>
      </span>
      {error ? <span className="update-banner__error">{error}</span> : null}
    </div>
  );
}
