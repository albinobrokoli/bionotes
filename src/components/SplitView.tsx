import { useCallback, useState } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { Layout } from 'react-resizable-panels';
import { useActivePage } from '../store/app';
import { PdfViewer } from './PdfViewer';
import { EditorArea } from './EditorArea';
import './SplitView.css';

const STORAGE_KEY = 'splitRatio';
const PANEL_PDF = 'pdf';
const PANEL_EDITOR = 'editor';

function parseStoredLayout(): Layout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { [PANEL_PDF]: 50, [PANEL_EDITOR]: 50 };
    const v = JSON.parse(raw) as Record<string, unknown>;
    const pdf = Number(v[PANEL_PDF]);
    const editor = Number(v[PANEL_EDITOR]);
    if (
      Number.isFinite(pdf) &&
      Number.isFinite(editor) &&
      pdf >= 15 &&
      pdf <= 85 &&
      editor >= 15 &&
      editor <= 85 &&
      Math.abs(pdf + editor - 100) < 0.02
    ) {
      return { [PANEL_PDF]: pdf, [PANEL_EDITOR]: editor };
    }
  } catch {
    /* ignore */
  }
  return { [PANEL_PDF]: 50, [PANEL_EDITOR]: 50 };
}

export type SplitViewProps = {
  filePath: string;
  displayName: string;
};

/**
 * Yatay split: solda PDF, sağda not editörü (react-resizable-panels v4: Group / Panel / Separator).
 */
export function SplitView({ filePath, displayName }: SplitViewProps) {
  const activePage = useActivePage();
  const [defaultLayout] = useState(parseStoredLayout);

  const onLayoutChanged = useCallback((layout: Layout) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="split-view">
      <Group
        id="bionotes-split"
        orientation="horizontal"
        className="split-view__group"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        <Panel
          id={PANEL_PDF}
          className="split-view__panel split-view__panel--pdf"
          minSize="15%"
          maxSize="85%"
        >
          <PdfViewer filePath={filePath} displayName={displayName} pageId={activePage?.id ?? null} />
        </Panel>
        <Separator className="split-view__resize-handle" />
        <Panel
          id={PANEL_EDITOR}
          className="split-view__panel split-view__panel--editor"
          minSize="15%"
          maxSize="85%"
        >
          <EditorArea />
        </Panel>
      </Group>
    </div>
  );
}
