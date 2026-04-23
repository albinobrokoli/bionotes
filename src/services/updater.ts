import { check, type Update } from '@tauri-apps/plugin-updater';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export type AvailableUpdate = {
  currentVersion: string;
  version: string;
  date?: string;
  body?: string;
};

export type UpdaterState = {
  enabled: boolean;
  checking: boolean;
  update: AvailableUpdate | null;
  lastCheckedAt: number | null;
  error: string | null;
};

let activeUpdate: Update | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let checking = false;
const listeners = new Set<(state: UpdaterState) => void>();

let state: UpdaterState = {
  enabled: true,
  checking: false,
  update: null,
  lastCheckedAt: null,
  error: null,
};

function emit() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function getUpdaterState(): UpdaterState {
  return state;
}

export function subscribeUpdaterState(listener: (state: UpdaterState) => void): () => void {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

function isLikelyTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function stopTimer() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}

export function configureUpdater(enabled: boolean) {
  state = { ...state, enabled };
  emit();

  if (!enabled || !isLikelyTauriRuntime()) {
    stopTimer();
    return;
  }

  if (!timer) {
    timer = setInterval(() => {
      void checkForUpdates();
    }, FOUR_HOURS_MS);
  }
}

export async function checkForUpdates(): Promise<AvailableUpdate | null> {
  if (!state.enabled || !isLikelyTauriRuntime() || checking) {
    return state.update;
  }

  checking = true;
  state = { ...state, checking: true, error: null };
  emit();

  try {
    const update = await check();
    activeUpdate = update;
    const available = update
      ? {
          currentVersion: update.currentVersion,
          version: update.version,
          date: update.date,
          body: update.body,
        }
      : null;
    state = {
      ...state,
      checking: false,
      update: available,
      lastCheckedAt: Date.now(),
      error: null,
    };
    emit();
    return available;
  } catch (error) {
    state = {
      ...state,
      checking: false,
      lastCheckedAt: Date.now(),
      error: error instanceof Error ? error.message : 'Güncelleme kontrolü başarısız oldu.',
    };
    emit();
    return null;
  } finally {
    checking = false;
  }
}

export async function installAvailableUpdate(
  onProgress?: (progress: { downloadedBytes: number; totalBytes?: number }) => void,
) {
  if (!activeUpdate) {
    throw new Error('install_no_update');
  }

  let downloadedBytes = 0;
  await activeUpdate.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      downloadedBytes = 0;
      onProgress?.({ downloadedBytes: 0, totalBytes: event.data.contentLength });
      return;
    }
    if (event.event === 'Progress') {
      downloadedBytes += event.data.chunkLength;
      onProgress?.({ downloadedBytes, totalBytes: undefined });
    }
  });
}
