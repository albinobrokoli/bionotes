import { useCallback, useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { createReactInlineContentSpec } from '@blocknote/react';
import type { DefaultStyleSchema } from '@blocknote/core';

const inlineConfig = {
  type: 'inlineLatex',
  propSchema: {
    latex: { default: '' },
  },
  content: 'none',
} as const;

function InlineLatexView(props: {
  inlineContent: { type: 'inlineLatex'; props: { latex: string } };
  updateInlineContent: (u: { type?: 'inlineLatex'; props?: { latex?: string } }) => void;
  contentRef: (el: HTMLElement | null) => void;
}) {
  const { inlineContent, updateInlineContent, contentRef } = props;
  const { latex } = inlineContent.props;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(latex);
  const outerRef = useRef<HTMLSpanElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    contentRef(outerRef.current);
    return () => contentRef(null);
  }, [contentRef]);

  useEffect(() => {
    setDraft(latex);
  }, [latex]);

  const flush = useCallback(() => {
    updateInlineContent({ props: { latex: draft.trim() } });
    setEditing(false);
  }, [draft, updateInlineContent]);

  useEffect(() => {
    if (editing || !mountRef.current) return;
    mountRef.current.innerHTML = '';
    if (!latex.trim()) return;
    try {
      katex.render(latex, mountRef.current, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      mountRef.current.textContent = latex;
    }
  }, [latex, editing]);

  if (editing) {
    return (
      <span ref={outerRef} className="bn-inline-latex bn-inline-latex--edit">
        <input
          className="bn-inline-latex__input mono"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={flush}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              flush();
            }
          }}
          size={Math.max(draft.length, 4)}
          spellCheck={false}
        />
      </span>
    );
  }

  return (
    <span
      ref={outerRef}
      className="bn-inline-latex bn-inline-latex--preview"
      onDoubleClick={(e) => {
        e.preventDefault();
        setEditing(true);
      }}
    >
      <span ref={mountRef} />
    </span>
  );
}

export const inlineLatexSpec = createReactInlineContentSpec<
  typeof inlineConfig,
  DefaultStyleSchema
>(inlineConfig, {
  render: InlineLatexView as any,
});
