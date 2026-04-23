import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react';
import type { BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import type { PartialBlock } from '@blocknote/core';
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { Atom, CheckCircle2, FlaskConical, HelpCircle, Sigma } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useApp, useActivePage } from '../store/app';
import { useDebouncedSave } from '../hooks/useDebouncedSave';
import {
  BIONOTES_EDITOR_NAVIGATE,
  BIONOTES_INSERT_QUOTE,
  BIONOTES_SOURCE_LINKS_UPDATED,
  dispatchBacklinksUpdated,
  dispatchSourceLinksUpdated,
  dispatchPdfNavigate,
  type SourceLinksUpdatedDetail,
  type EditorNavigateDetail,
  type InsertQuoteDetail,
} from '../lib/bionotesBridge';
import * as repo from '../db/repo';
import { bioNotesSchema, createInlineLatexInputExtension } from '../editor/bioNotesSchema';
import type { Source } from '../types/source';
import { formatCitation } from '../types/source';
import { formatBibliographyEntry } from '../services/bibliography';
import './EditorArea.css';

export function EditorArea() {
  const page = useActivePage();

  if (!page) return <EmptyEditor />;

  return (
    <section className="editor-area">
      <div className="editor-area__inner">
        <BlockNoteForPage key={page.id} pageId={page.id} initial={page.content} />
      </div>
    </section>
  );
}

function pulseBlockDom(editor: BlockNoteEditor<any, any, any>, blockId: string): (() => void) | void {
  const root = editor.domElement;
  if (!root) return;
  const safe = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(blockId) : blockId.replace(/"/g, '\\"');
  const wrap = root.querySelector(`[data-node-type="blockContainer"][data-id="${safe}"]`) as HTMLElement | null;
  if (!wrap) return;
  wrap.classList.add('bn-block-pulse');
  const t = window.setTimeout(() => wrap.classList.remove('bn-block-pulse'), 3000);
  return () => {
    clearTimeout(t);
    wrap.classList.remove('bn-block-pulse');
  };
}

function scrollBlockIntoEditor(blockEl: HTMLElement | null): void {
  if (!blockEl) return;
  const scrollArea = blockEl.closest('.editor-area');
  if (!scrollArea) {
    blockEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const ar = scrollArea.getBoundingClientRect();
  const br = blockEl.getBoundingClientRect();
  const delta = br.top - ar.top - (ar.height / 2 - br.height / 2);
  scrollArea.scrollTo({ top: scrollArea.scrollTop + delta, behavior: 'smooth' });
}

type ExperimentLogEntry = {
  id: string;
  timestamp: number;
  text: string;
  author: string;
};

type ExperimentLogProps = {
  entries?: string;
  isLocked?: boolean;
};

function parseExperimentEntries(value: string | undefined): ExperimentLogEntry[] {
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

function collectExperimentLogBlocks(
  blocks: PartialBlock<any, any, any>[],
  map: Map<string, PartialBlock<any, any, any>>,
): void {
  for (const block of blocks) {
    if (block.type === 'experimentLog' && block.id) map.set(block.id, block);
    if (block.children?.length) collectExperimentLogBlocks(block.children, map);
  }
}

function collectBlocksById(
  blocks: PartialBlock<any, any, any>[],
  map: Map<string, PartialBlock<any, any, any>>,
): void {
  for (const block of blocks) {
    if (block.id) map.set(block.id, block);
    if (block.children?.length) collectBlocksById(block.children, map);
  }
}

function textFromInlineContent(content: unknown): string {
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

function excerptFromBlock(block: PartialBlock<any, any, any>): string {
  const base = textFromInlineContent(block.content).replace(/\s+/g, ' ').trim();
  return base.slice(0, 80);
}

function collectWikiLinksFromBlocks(
  blocks: PartialBlock<any, any, any>[],
  out: Array<{ targetPageId: string; blockId: string; contextExcerpt: string }>,
): void {
  for (const block of blocks) {
    const blockId = typeof block.id === 'string' ? block.id : '';
    if (Array.isArray(block.content) && blockId) {
      const contextExcerpt = excerptFromBlock(block);
      for (const item of block.content) {
        if (!item || typeof item !== 'object') continue;
        const n = item as { type?: string; props?: { pageId?: string } };
        const targetPageId = n.type === 'wikiLink' ? (n.props?.pageId ?? '') : '';
        if (!targetPageId) continue;
        out.push({ targetPageId, blockId, contextExcerpt });
      }
    }
    if (block.children?.length) collectWikiLinksFromBlocks(block.children, out);
  }
}

function sanitizeExperimentLogDocument(
  nextBlocks: PartialBlock<any, any, any>[],
  prevBlocks: PartialBlock<any, any, any>[],
): PartialBlock<any, any, any>[] {
  const prevById = new Map<string, PartialBlock<any, any, any>>();
  collectExperimentLogBlocks(prevBlocks, prevById);

  const walk = (blocks: PartialBlock<any, any, any>[]): PartialBlock<any, any, any>[] =>
    blocks.map((block) => {
      const children = block.children?.length ? walk(block.children) : block.children;
      if (block.type !== 'experimentLog' || !block.id) return children ? { ...block, children } : block;

      const prev = prevById.get(block.id);
      if (!prev) return children ? { ...block, children } : block;

      const nextProps = (block.props ?? {}) as ExperimentLogProps;
      const prevProps = (prev.props ?? {}) as ExperimentLogProps;
      const prevEntries = parseExperimentEntries(prevProps.entries);
      const nextEntries = parseExperimentEntries(nextProps.entries);
      const prevIds = new Set(prevEntries.map((entry) => entry.id));
      const appended = nextEntries.filter((entry) => !prevIds.has(entry.id));

      return {
        ...block,
        ...(children ? { children } : {}),
        props: {
          ...nextProps,
          isLocked: true,
          entries: JSON.stringify([...prevEntries, ...appended]),
        },
      };
    });

  return walk(nextBlocks);
}

function BlockNoteForPage({
  pageId,
  initial,
}: {
  pageId: string;
  initial: PartialBlock<any, any, any>[];
}) {
  const { t } = useTranslation();
  const updatePageContent = useApp((s) => s.updatePageContent);
  const setSaveStatus = useApp((s) => s.setSaveStatus);
  const citationFormat = useApp((s) => s.citationFormat);
  const allPages = useApp((s) => s.pages);
  const [linkedSources, setLinkedSources] = useState<Source[]>([]);

  const editor = useCreateBlockNote(
    {
      schema: bioNotesSchema,
      initialContent: initial.length ? initial : undefined,
      extensions: [createInlineLatexInputExtension()],
    },
    [pageId],
  );

  const getSlashItems = useCallback(
    async (query: string) => {
      const defaults = getDefaultReactSlashMenuItems(editor as unknown as BlockNoteEditor);
      const scienceItems = [
        {
          title: 'Deney defteri / Experiment log',
          subtext: 'Immutable ve timestamped deney kayıt bloğu',
          group: 'Bilim Blokları',
          aliases: ['experiment', 'lab', 'log', 'audit', 'defter', 'deney'],
          key: 'code_block' as never,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor as unknown as BlockNoteEditor, {
              type: 'experimentLog',
              props: { entries: '[]', isLocked: true },
            } as PartialBlock<any, any, any>),
          icon: <FlaskConical size={18} strokeWidth={1.75} />,
        },
        {
          title: 'Hipotez / Hypothesis',
          subtext: 'Durumu yönetilen hipotez kartı',
          group: 'Bilim Blokları',
          aliases: ['hypothesis', 'hipotez', 'tez', 'claim', 'science'],
          key: 'code_block' as never,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor as unknown as BlockNoteEditor, {
              type: 'hypothesis',
              props: { text: '', status: 'proposed', uid: '' },
            } as PartialBlock<any, any, any>),
          icon: <HelpCircle size={18} strokeWidth={1.75} />,
        },
        {
          title: 'Sonuç / Conclusion',
          subtext: 'Sonuç kaydı ve güven düzeyi rozeti',
          group: 'Bilim Blokları',
          aliases: ['conclusion', 'sonuc', 'result', 'finding', 'science'],
          key: 'code_block' as never,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor as unknown as BlockNoteEditor, {
              type: 'conclusion',
              props: { text: '', confidence: 'medium', uid: '' },
            } as PartialBlock<any, any, any>),
          icon: <CheckCircle2 size={18} strokeWidth={1.75} />,
        },
        {
          title: 'Kimyasal yapı / Chemical structure',
          subtext: 'SMILES notasyonundan 2D kimyasal yapı çizimi',
          group: 'Bilim Blokları',
          aliases: ['chem', 'chemical', 'smiles', 'molecule', 'kimya', 'yapi'],
          key: 'code_block' as never,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor as unknown as BlockNoteEditor, {
              type: 'chemistry',
              props: { smiles: '', label: '' },
            } as PartialBlock<any, any, any>),
          icon: <Atom size={18} strokeWidth={1.75} />,
        },
        {
          title: 'Formül',
          subtext: 'Matematiksel formül ekle',
          group: 'Bilim Blokları',
          aliases: ['latex', 'math', 'katex', 'eq', 'formula'],
          key: 'code_block' as never,
          onItemClick: () =>
            insertOrUpdateBlockForSlashMenu(editor as unknown as BlockNoteEditor, {
              type: 'latex',
              props: { latex: '', display: false },
            } as PartialBlock<any, any, any>),
          icon: <Sigma size={18} strokeWidth={1.75} />,
        },
      ];
      return filterSuggestionItems([...defaults, ...scienceItems], query);
    },
    [editor],
  );

  const refreshLinkedSources = useCallback(async () => {
    const sources = await repo.listSourcesForPage(pageId);
    setLinkedSources(sources);
  }, [pageId]);

  const getCitationItems = useCallback(
    async (query: string) => {
      const sources = await repo.listSources(query);
      return sources.slice(0, 8).map((source) => ({
        title: source.title,
        subtext: `${formatCitation(source)}${source.doi ? ` • ${source.doi}` : ''}`,
        group: 'Kaynaklar',
        onItemClick: () => {
          const citation = formatCitation(source);
          editor.insertInlineContent(citation);
          const cursor = editor.getTextCursorPosition();
          if (!cursor?.block?.id) return;
          void repo
            .linkSourceToPage({
              sourceId: source.id,
              pageId,
              blockId: cursor.block.id,
              contextExcerpt: source.title,
            })
            .then(() => {
              dispatchSourceLinksUpdated({ pageId });
              return refreshLinkedSources();
            })
            .catch(() => undefined);
        },
      }));
    },
    [editor, pageId, refreshLinkedSources],
  );

  const getWikiLinkItems = useCallback(
    async (query: string) => {
      const raw = query.replace(/^\[/, '').trim().toLowerCase();
      const score = (title: string) => {
        const t = title.toLowerCase();
        if (!raw) return 0;
        if (t.startsWith(raw)) return 0;
        const idx = t.indexOf(raw);
        return idx >= 0 ? idx + 10 : 9999;
      };
      return allPages
        .slice()
        .sort((a, b) => score(a.title) - score(b.title) || a.title.localeCompare(b.title))
        .filter((p) => !raw || p.title.toLowerCase().includes(raw))
        .slice(0, 10)
        .map((p) => ({
          title: p.title,
          subtext: p.id,
          group: 'Sayfalar',
          onItemClick: () => {
            editor.insertInlineContent([{ type: 'wikiLink', props: { title: p.title, pageId: p.id } }]);
          },
        }));
    },
    [allPages, editor],
  );

  const save = useCallback(
    async (content: PartialBlock<any, any, any>[]) => {
      try {
        await updatePageContent(pageId, content);
        const at = Date.now();
        if (useApp.getState().activePageId === pageId) {
          setSaveStatus({ state: 'saved', lastSavedAt: at });
        }
      } catch {
        if (useApp.getState().activePageId === pageId) {
          setSaveStatus({ state: 'error' });
        }
        throw new Error('persist_failed');
      }
    },
    [pageId, setSaveStatus, updatePageContent],
  );

  const { schedule } = useDebouncedSave({ debounceMs: 800, save });
  const lastSafeDocumentRef = useRef<PartialBlock<any, any, any>[]>(initial);
  const reconcilingRef = useRef(false);
  const backlinkTargetsRef = useRef<Set<string>>(new Set());
  const backlinkSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSaveStatus({ state: 'saved', lastSavedAt: null });
  }, [pageId, setSaveStatus]);

  useEffect(() => {
    void refreshLinkedSources();
  }, [refreshLinkedSources]);

  useEffect(() => {
    const onInsertQuote = (ev: Event) => {
      const d = (ev as CustomEvent<InsertQuoteDetail>).detail;
      if (!d || d.pageId !== pageId) return;
      const doc = editor.document;
      const ref = doc[doc.length - 1];
      if (!ref) return;
      try {
        editor.insertBlocks(
          [
            {
              id: d.blockId,
              type: 'quote',
              props: { backgroundColor: 'default', textColor: 'default' },
              content: d.text,
            },
          ],
          ref.id,
          'after',
        );
      } catch {
        /* ignore */
      }
    };
    window.addEventListener(BIONOTES_INSERT_QUOTE, onInsertQuote);
    return () => window.removeEventListener(BIONOTES_INSERT_QUOTE, onInsertQuote);
  }, [editor, pageId]);

  useEffect(() => {
    return () => {
      if (backlinkSyncTimerRef.current) {
        window.clearTimeout(backlinkSyncTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onEditorNav = (ev: Event) => {
      const d = (ev as CustomEvent<EditorNavigateDetail>).detail;
      if (!d || d.pageId !== pageId) return;
      const b = editor.getBlock(d.blockId);
      if (!b) return;
      try {
        editor.setTextCursorPosition(d.blockId, 'start');
        editor.focus();
      } catch {
        /* ignore */
      }
      requestAnimationFrame(() => {
        const root = editor.domElement;
        const safe =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(d.blockId)
            : d.blockId.replace(/"/g, '\\"');
        const wrap = root?.querySelector(`[data-node-type="blockContainer"][data-id="${safe}"]`) as HTMLElement | null;
        scrollBlockIntoEditor(wrap);
        pulseBlockDom(editor, d.blockId);
      });
    };
    window.addEventListener(BIONOTES_EDITOR_NAVIGATE, onEditorNav);
    return () => window.removeEventListener(BIONOTES_EDITOR_NAVIGATE, onEditorNav);
  }, [editor, pageId]);

  useEffect(() => {
    const onSourceLinksUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent<SourceLinksUpdatedDetail>).detail;
      if (!detail || detail.pageId !== pageId) return;
      void refreshLinkedSources();
    };
    window.addEventListener(BIONOTES_SOURCE_LINKS_UPDATED, onSourceLinksUpdated);
    return () => window.removeEventListener(BIONOTES_SOURCE_LINKS_UPDATED, onSourceLinksUpdated);
  }, [pageId, refreshLinkedSources]);

  useEffect(() => {
    const root = editor.domElement;
    if (!root) return;
    const onClickCapture = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const inBlockContent = !!t.closest('.bn-block-content');
      if (inBlockContent && !e.metaKey && !e.ctrlKey) return;
      const blockWrap = t.closest('[data-node-type="blockContainer"]') as HTMLElement | null;
      if (!blockWrap) return;
      const blockId = blockWrap.getAttribute('data-id');
      if (!blockId) return;
      void (async () => {
        const ann = await repo.getAnnotationByLinkedBlock(pageId, blockId);
        if (!ann) return;
        dispatchPdfNavigate({
          pageId,
          pageNum: ann.pdfPageNum,
          annotationId: ann.id,
        });
      })();
    };
    root.addEventListener('click', onClickCapture, true);
    return () => root.removeEventListener('click', onClickCapture, true);
  }, [editor, pageId]);

  return (
    <>
      <BlockNoteView
        editor={editor}
        theme="dark"
        slashMenu={false}
        onChange={() => {
          if (reconcilingRef.current) {
            reconcilingRef.current = false;
            return;
          }
          const currentDoc = editor.document as PartialBlock<any, any, any>[];
          const sanitized = sanitizeExperimentLogDocument(currentDoc, lastSafeDocumentRef.current);
          const changed = JSON.stringify(sanitized) !== JSON.stringify(currentDoc);
          if (changed) {
            reconcilingRef.current = true;
            const currentById = new Map<string, PartialBlock<any, any, any>>();
            const sanitizedById = new Map<string, PartialBlock<any, any, any>>();
            collectBlocksById(currentDoc, currentById);
            collectBlocksById(sanitized, sanitizedById);
            for (const [id, safeBlock] of sanitizedById) {
              const curr = currentById.get(id);
              if (!curr || curr.type !== 'experimentLog' || safeBlock.type !== 'experimentLog') continue;
              const same = JSON.stringify(curr.props ?? {}) === JSON.stringify(safeBlock.props ?? {});
              if (!same) {
                editor.updateBlock(id, {
                  props: {
                    ...(safeBlock.props ?? {}),
                  },
                });
              }
            }
          }
          lastSafeDocumentRef.current = sanitized;
          const links: Array<{ targetPageId: string; blockId: string; contextExcerpt: string }> = [];
          collectWikiLinksFromBlocks(sanitized, links);
          const deduped = Array.from(
            new Map(links.map((link) => [`${link.targetPageId}::${link.blockId}`, link] as const)).values(),
          );
          if (backlinkSyncTimerRef.current) {
            window.clearTimeout(backlinkSyncTimerRef.current);
          }
          backlinkSyncTimerRef.current = window.setTimeout(() => {
            void repo.syncBacklinksForSourcePage(pageId, deduped).then(() => {
              const targets = new Set(deduped.map((item) => item.targetPageId));
              const prevTargets = backlinkTargetsRef.current;
              backlinkTargetsRef.current = targets;
              const notify = new Set<string>([...targets, ...prevTargets, pageId]);
              for (const targetId of notify) {
                dispatchBacklinksUpdated({ pageId: targetId });
              }
            });
          }, 350);
          setSaveStatus({ state: 'saving' });
          schedule(sanitized);
        }}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          shouldOpen={(state) => !state.selection.$from.parent.type.isInGroup('tableContent')}
          getItems={getSlashItems}
        />
        <SuggestionMenuController
          triggerCharacter="@"
          shouldOpen={(state) => !state.selection.$from.parent.type.isInGroup('tableContent')}
          getItems={getCitationItems}
        />
        <SuggestionMenuController
          triggerCharacter="["
          shouldOpen={(state) => {
            if (state.selection.$from.parent.type.isInGroup('tableContent')) return false;
            const before = state.selection.$from.parent.textBetween(
              Math.max(0, state.selection.$from.parentOffset - 2),
              state.selection.$from.parentOffset,
              '',
            );
            return before.endsWith('[[');
          }}
          getItems={getWikiLinkItems}
        />
      </BlockNoteView>
      <section className="editor-sources">
        <h3>{t('rightRail.sources')}</h3>
        {linkedSources.length === 0 ? (
          <p>{t('rightRail.empty')}</p>
        ) : (
          <ol>
            {linkedSources.map((source) => (
              <li key={source.id}>
                {formatBibliographyEntry(source, citationFormat)}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function EmptyEditor() {
  const { t } = useTranslation();
  const createPage = useApp((s) => s.createPage);
  const activeCategoryId = useApp((s) => s.activeCategoryId);
  return (
    <section className="editor-area">
      <div className="editor-empty">
        <h2>{t('editor.emptyState.title')}</h2>
        <p>{t('editor.emptyState.body')}</p>
        <button
          type="button"
          className="editor-empty__create"
          onClick={() => {
            void createPage(activeCategoryId ?? undefined, t('editor.untitled'));
          }}
        >
          Yeni sayfa olustur
        </button>
      </div>
    </section>
  );
}
