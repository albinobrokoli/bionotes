import { useMemo } from 'react';
import type { PartialBlock } from '@blocknote/core';
import { useActivePage } from '../store/app';
import './PreviewPane.css';

function inlineText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const maybeText = (item as { text?: unknown }).text;
      if (typeof maybeText === 'string') return maybeText;
      const maybeWiki = item as { type?: string; props?: { title?: string } };
      if (maybeWiki.type === 'wikiLink') return maybeWiki.props?.title ?? '';
      return '';
    })
    .join('');
}

function blockToText(block: PartialBlock<any, any, any>): string {
  const text = inlineText(block.content).trim();
  if (block.type === 'heading') return text.toUpperCase();
  if (block.type === 'bulletListItem') return `• ${text}`;
  if (block.type === 'numberedListItem') return `- ${text}`;
  return text;
}

export function PreviewPane() {
  const page = useActivePage();
  const lines = useMemo(() => {
    if (!page) return [];
    return page.content.map(blockToText).filter(Boolean);
  }, [page]);

  return (
    <section className="preview-pane">
      <div className="preview-pane__inner">
        {!page ? (
          <p className="preview-pane__empty">Onizleme icin bir sayfa secin.</p>
        ) : lines.length === 0 ? (
          <p className="preview-pane__empty">Bu sayfada onizlenecek icerik yok.</p>
        ) : (
          lines.map((line, idx) => (
            <p key={`${idx}-${line.slice(0, 8)}`} className="preview-pane__line">
              {line}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
