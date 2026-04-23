import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Edge, Node } from 'reactflow';
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { PartialBlock } from '@blocknote/core';
import * as repo from '../db/repo';
import { useApp } from '../store/app';
import 'reactflow/dist/style.css';
import './GraphView.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

type SpaceFilter = 'all' | string;
type TagFilter = 'all' | string;

type GraphNodeData = {
  label: string;
  spaceColor: string;
};

function inlineTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      const maybeText = (item as { text?: unknown }).text;
      return typeof maybeText === 'string' ? maybeText : '';
    })
    .join('');
}

function firstParagraphExcerpt(blocks: PartialBlock<any, any, any>[]): string {
  const queue = [...blocks];
  while (queue.length > 0) {
    const block = queue.shift();
    if (!block) continue;
    if (block.type === 'paragraph') {
      const text = inlineTextFromContent(block.content).trim();
      if (text) return text.slice(0, 220);
    }
    if (block.children?.length) queue.push(...block.children);
  }
  return '';
}

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return q.length / Math.max(1, t.length);
  let qi = 0;
  let matched = 0;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) {
      qi += 1;
      matched += 1;
    }
  }
  if (matched === 0) return 0;
  return matched / q.length;
}

function buildForceLayout(nodes: Node<GraphNodeData>[], edges: Edge[], width: number, height: number) {
  if (nodes.length === 0) return nodes;
  const simNodes = nodes.map((n) => ({ id: n.id, x: Math.random() * width, y: Math.random() * height }));
  const simLinks = edges.map((e) => ({ source: e.source, target: e.target }));
  const simulation = forceSimulation(simNodes)
    .force(
      'link',
      forceLink(simLinks)
        .id((d) => (d as { id: string }).id)
        .distance(110)
        .strength(0.09),
    )
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(width / 2, height / 2))
    .stop();

  for (let i = 0; i < 260; i += 1) simulation.tick();

  const posMap = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  return nodes.map((n) => ({
    ...n,
    position: posMap.get(n.id) ?? n.position,
  }));
}

export function GraphView({ open, onClose }: Props) {
  const pages = useApp((s) => s.pages);
  const spaces = useApp((s) => s.spaces);
  const categories = useApp((s) => s.categories);
  const selectPage = useApp((s) => s.selectPage);
  const closeGraph = useApp((s) => s.closeGraph);
  const [backlinkEdges, setBacklinkEdges] = useState<repo.BacklinkEdge[]>([]);
  const [spaceFilter, setSpaceFilter] = useState<SpaceFilter>('all');
  const [tagFilter, setTagFilter] = useState<TagFilter>('all');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const rows = await repo.listAllBacklinkEdges();
      setBacklinkEdges(rows);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedNodeId(null);
      setZoom(1);
    }
  }, [open]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const spaceById = useMemo(() => new Map(spaces.map((s) => [s.id, s])), [spaces]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const p of pages) {
      for (const tag of p.tags) {
        const clean = tag.trim();
        if (clean) tags.add(clean);
      }
    }
    return [...tags].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [pages]);

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      const cat = categoryById.get(p.categoryId);
      if (!cat) return false;
      if (spaceFilter !== 'all' && cat.spaceId !== spaceFilter) return false;
      if (tagFilter !== 'all' && !p.tags.includes(tagFilter)) return false;
      if (favoriteOnly && !p.favorite) return false;
      return true;
    });
  }, [pages, categoryById, spaceFilter, tagFilter, favoriteOnly]);

  const filteredPageIds = useMemo(() => new Set(filteredPages.map((p) => p.id)), [filteredPages]);

  const visibleEdges = useMemo(() => {
    const uniq = new Set<string>();
    const out: Edge[] = [];
    for (const e of backlinkEdges) {
      if (!filteredPageIds.has(e.sourcePageId) || !filteredPageIds.has(e.targetPageId)) continue;
      const key = `${e.sourcePageId}->${e.targetPageId}`;
      if (uniq.has(key)) continue;
      uniq.add(key);
      out.push({
        id: key,
        source: e.sourcePageId,
        target: e.targetPageId,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: { stroke: 'rgba(153, 165, 190, 0.42)', strokeWidth: 1.1 },
      });
    }
    return out;
  }, [backlinkEdges, filteredPageIds]);

  const matchByPageId = useMemo(() => {
    const m = new Map<string, boolean>();
    const q = search.trim();
    for (const p of filteredPages) {
      if (!q) {
        m.set(p.id, true);
        continue;
      }
      const hay = `${p.title} ${p.tags.join(' ')}`;
      m.set(p.id, fuzzyScore(hay, q) >= 0.55);
    }
    return m;
  }, [filteredPages, search]);

  const baseNodes = useMemo<Node<GraphNodeData>[]>(() => {
    const hideLabels = filteredPages.length > 200 || zoom < 0.6;
    return filteredPages.map((p) => {
      const cat = categoryById.get(p.categoryId);
      const spaceColor = cat ? (spaceById.get(cat.spaceId)?.color ?? '#7aa2f7') : '#7aa2f7';
      const matched = matchByPageId.get(p.id) ?? true;
      return {
        id: p.id,
        data: { label: hideLabels ? '' : p.title, spaceColor },
        position: { x: 0, y: 0 },
        style: {
          background: spaceColor,
          color: '#08111d',
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          padding: '8px 10px',
          border: selectedNodeId === p.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.33)',
          width: hideLabels ? 20 : undefined,
          minHeight: hideLabels ? 20 : undefined,
          opacity: matched ? 1 : 0.2,
        },
      };
    });
  }, [filteredPages, categoryById, spaceById, matchByPageId, selectedNodeId, zoom]);

  const nodes = useMemo(() => buildForceLayout(baseNodes, visibleEdges, 1500, 960), [baseNodes, visibleEdges]);

  const edges = useMemo(() => {
    if (!search.trim()) return visibleEdges;
    return visibleEdges.map((e) => {
      const srcOk = matchByPageId.get(e.source) ?? false;
      const dstOk = matchByPageId.get(e.target) ?? false;
      const active = srcOk && dstOk;
      return {
        ...e,
        style: {
          ...e.style,
          opacity: active ? 1 : 0.12,
        },
      };
    });
  }, [visibleEdges, matchByPageId, search]);

  const selectedPage = useMemo(
    () => filteredPages.find((p) => p.id === selectedNodeId) ?? null,
    [filteredPages, selectedNodeId],
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    if (!filteredPageIds.has(selectedNodeId)) setSelectedNodeId(null);
  }, [filteredPageIds, selectedNodeId]);

  if (!open) return null;

  return createPortal(
    <div className="graph-view__overlay" role="dialog" aria-modal="true">
      <div className="graph-view__body">
        <aside className="graph-view__filters">
          <h3>Kavram Haritasi</h3>
          <div className="graph-view__stats">
            <span>{filteredPages.length} sayfa</span>
            <span>{visibleEdges.length} baglanti</span>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sayfa ara..."
            className="graph-view__search"
          />
          <select value={spaceFilter} onChange={(e) => setSpaceFilter(e.target.value)} className="graph-view__select">
            <option value="all">Tum alanlar</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="graph-view__select">
            <option value="all">Tum etiketler</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <label className="graph-view__toggle">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(e) => setFavoriteOnly(e.target.checked)}
            />
            <span>Sadece favoriler</span>
          </label>
          <button type="button" onClick={onClose} className="graph-view__close">
            Kapat
          </button>
        </aside>

        <div className="graph-view__canvas">
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.14 }}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onMove={(_, viewport) => setZoom(viewport.zoom)}
              minZoom={0.18}
              maxZoom={1.6}
              defaultEdgeOptions={{
                markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
              }}
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background gap={18} size={1} />
            </ReactFlow>
          </ReactFlowProvider>
        </div>

        <aside className="graph-view__detail">
          {selectedPage ? (
            <>
              <h3>{selectedPage.title}</h3>
              <div className="graph-view__detail-tags">
                {selectedPage.tags.length > 0 ? selectedPage.tags.join(', ') : 'Etiket yok'}
              </div>
              <p>{firstParagraphExcerpt(selectedPage.content) || 'Onizleme metni yok.'}</p>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await selectPage(selectedPage.id);
                    closeGraph();
                    onClose();
                  })();
                }}
              >
                Notu ac
              </button>
            </>
          ) : (
            <p className="graph-view__detail-empty">Detay gormek icin bir dugum secin.</p>
          )}
        </aside>
      </div>
    </div>,
    document.body,
  );
}
