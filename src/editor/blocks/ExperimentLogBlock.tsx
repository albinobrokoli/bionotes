import { useMemo, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import type { BlockNoteEditor } from '@blocknote/core';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, ClipboardCopy, Lock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type ExperimentLogEntry = {
  id: string;
  timestamp: number;
  text: string;
  author: string;
};

type ExperimentLogProps = {
  entries: string;
  isLocked: boolean;
};

function decodeEntries(value: string | undefined): ExperimentLogEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as ExperimentLogEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.id === 'string' &&
        typeof entry.timestamp === 'number' &&
        typeof entry.text === 'string' &&
        typeof entry.author === 'string',
    );
  } catch {
    return [];
  }
}

function encodeEntries(entries: ExperimentLogEntry[]): string {
  return JSON.stringify(entries);
}

function formatExperimentTimestamp(value: number): string {
  const d = new Date(value);
  const datePart = format(d, "d MMMM yyyy", { locale: tr });
  const timePart = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  }).format(d);
  return `${datePart}, ${timePart}`;
}

function resolveUserEmail(): string {
  if (typeof window === 'undefined') return 'researcher@lab.local';
  const fromStorage = window.localStorage.getItem('bionotes:userEmail');
  if (fromStorage?.trim()) return fromStorage.trim();
  return 'researcher@lab.local';
}

function copyEntriesToClipboard(entries: ExperimentLogEntry[]): Promise<void> {
  const payload = JSON.stringify(entries, null, 2);
  return navigator.clipboard.writeText(payload);
}

function ExperimentLogBlockView(props: {
  block: {
    id: string;
    type: 'experimentLog';
    props: ExperimentLogProps;
  };
  editor: BlockNoteEditor<any, any, any>;
}) {
  const { block, editor } = props;
  const [draftText, setDraftText] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'done'>('idle');
  const entries = useMemo(
    () =>
      [...decodeEntries(block.props.entries)].sort((a, b) => {
        if (a.timestamp === b.timestamp) return a.id.localeCompare(b.id);
        return a.timestamp - b.timestamp;
      }),
    [block.props.entries],
  );

  const handleSave = () => {
    const text = draftText.trim();
    if (!text) return;
    const nextEntry: ExperimentLogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      text,
      author: resolveUserEmail(),
    };
    editor.updateBlock(block, {
      props: {
        ...block.props,
        isLocked: true,
        entries: encodeEntries([...entries, nextEntry]),
      },
    });
    setDraftText('');
  };

  const handleCopyJson = async () => {
    try {
      await copyEntriesToClipboard(entries);
      setCopyState('done');
      window.setTimeout(() => setCopyState('idle'), 1200);
    } catch {
      setCopyState('idle');
    }
  };

  return (
    <section className="bn-exp-log">
      <header className="bn-exp-log__header">
        <div className="bn-exp-log__title-wrap">
          <h4 className="bn-exp-log__title">Deney Defteri</h4>
          <span className="bn-exp-log__locked-indicator">
            <Lock size={13} />
            <span>Kilitli ✓</span>
          </span>
        </div>
        <button type="button" className="bn-exp-log__copy-btn" onClick={handleCopyJson}>
          {copyState === 'done' ? <Check size={14} /> : <ClipboardCopy size={14} />}
          <span>{copyState === 'done' ? 'Kopyalandı' : 'JSON dışa aktar'}</span>
        </button>
      </header>

      <div className="bn-exp-log__timeline">
        {entries.length === 0 ? (
          <p className="bn-exp-log__empty">Henüz giriş yok.</p>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="bn-exp-log__entry">
              <time className="bn-exp-log__time">{formatExperimentTimestamp(entry.timestamp)}</time>
              <div className="bn-exp-log__entry-content">
                <p className="bn-exp-log__text">{entry.text}</p>
                <span className="bn-exp-log__author">{entry.author}</span>
                <span className="bn-exp-log__chip">kilitli</span>
              </div>
            </article>
          ))
        )}
      </div>

      <footer className="bn-exp-log__composer">
        <textarea
          className="bn-exp-log__textarea"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          rows={3}
          placeholder="Deney gözlemini kaydet..."
        />
        <button type="button" className="bn-exp-log__save-btn" onClick={handleSave} disabled={!draftText.trim()}>
          Kaydet
        </button>
      </footer>
    </section>
  );
}

export const createExperimentLogBlockSpec = createReactBlockSpec(
  {
    type: 'experimentLog',
    propSchema: {
      entries: {
        default: '[]',
      },
      isLocked: {
        default: true,
      },
    },
    content: 'none',
  },
  {
    render: ExperimentLogBlockView,
  },
);
