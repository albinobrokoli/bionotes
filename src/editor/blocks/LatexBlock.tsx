import { useCallback, useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { createReactBlockSpec } from '@blocknote/react';
import type { BlockNoteEditor } from '@blocknote/core';

function LatexBlockView(props: {
  block: {
    id: string;
    type: 'latex';
    props: { latex: string; display: boolean };
  };
  editor: BlockNoteEditor<any, any, any>;
}) {
  const { block, editor } = props;
  const { latex, display } = block.props;
  const [editing, setEditing] = useState(!latex.trim());
  const [draft, setDraft] = useState(latex);
  const mountRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(latex);
  }, [latex]);

  const flush = useCallback(() => {
    const next = draft.trimEnd();
    editor.updateBlock(block, { props: { ...block.props, latex: next } });
    setEditing(false);
  }, [block, draft, editor]);

  useEffect(() => {
    if (editing || !mountRef.current) return;
    mountRef.current.innerHTML = '';
    if (!latex.trim()) {
      mountRef.current.textContent = 'Boş formül — düzenlemek için çift tıklayın';
      return;
    }
    try {
      katex.render(latex, mountRef.current, {
        throwOnError: false,
        displayMode: display,
      });
    } catch {
      mountRef.current.textContent = latex;
    }
  }, [latex, display, editing]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <div className="bn-latex-block bn-latex-block--edit">
        <label className="bn-latex-block__label">
          <span className="bn-latex-block__label-text">LaTeX</span>
          <textarea
            ref={textareaRef}
            className="bn-latex-block__textarea mono"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={flush}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                flush();
              }
            }}
            rows={display ? 4 : 2}
            spellCheck={false}
          />
        </label>
        <label className="bn-latex-block__display-toggle">
          <input
            type="checkbox"
            checked={display}
            onChange={(e) =>
              editor.updateBlock(block, {
                props: { ...block.props, display: e.target.checked },
              })
            }
          />
          <span>Display mode</span>
        </label>
      </div>
    );
  }

  return (
    <div
      className={`bn-latex-block bn-latex-block--preview${display ? ' bn-latex-block--display' : ''}`}
      onDoubleClick={() => setEditing(true)}
      role="presentation"
    >
      <div ref={mountRef} className="bn-latex-block__katex" />
    </div>
  );
}

export const createLatexBlockSpec = createReactBlockSpec(
  {
    type: 'latex',
    propSchema: {
      latex: { default: '' },
      display: { default: false },
    },
    content: 'none',
  },
  {
    render: LatexBlockView,
  },
);
