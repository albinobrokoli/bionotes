import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PageCallback } from 'react-pdf/dist/shared/types.js';
import { LucideIcons } from '../lib/icons';
import {
  BIONOTES_PDF_NAVIGATE,
  dispatchEditorNavigate,
  dispatchInsertQuote,
  type PdfNavigateDetail,
} from '../lib/bionotesBridge';
import { clientRectsToPdfQuads, pdfQuadToViewportBox } from '../lib/pdfAnnotationCoords';
import * as repo from '../db/repo';
import type { PdfAnnotation } from '../db/repo';
import './PdfViewer.css';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const { ChevronLeft, ChevronRight, Minus, Plus } = LucideIcons;

const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;

export type HighlightColorKey = 'yellow' | 'green' | 'red';

const HIGHLIGHT_HEX: Record<HighlightColorKey, string> = {
  yellow: '#FFE066',
  green: '#4ADE80',
  red: '#F87171',
};

export type PdfViewerProps = {
  filePath: string;
  displayName: string;
  /** Doluysa vurgu kaydı ve metin seçimi etkin. */
  pageId?: string | null;
};

type SelectionPopupState = {
  x: number;
  y: number;
  text: string;
  range: Range;
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,224,102,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function newAnnotationId(): string {
  return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newBlockId(): string {
  return `blk_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function PdfViewer({ filePath, displayName, pageId = null }: PdfViewerProps) {
  const { t } = useTranslation();
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoomPct, setZoomPct] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [selectionPopup, setSelectionPopup] = useState<SelectionPopupState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; annotationId: string } | null>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  /** Sayfa viewport’u hazır olunca artırılır (overlay geometrisi için). */
  const [layerTick, setLayerTick] = useState(0);

  const pageWrapRef = useRef<HTMLDivElement | null>(null);
  const pageProxyRef = useRef<PageCallback | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileUrl = useMemo(() => convertFileSrc(filePath), [filePath]);
  const scale = zoomPct / 100;

  const onDocLoad = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setLoadError(null);
      setNumPages(n);
      setPageNumber(1);
    },
    [],
  );

  const onDocError = useCallback(
    (err: Error) => {
      setLoadError(err.message || t('pdfViewer.loadError'));
    },
    [t],
  );

  const reloadAnnotations = useCallback(async () => {
    if (!pageId) {
      setAnnotations([]);
      return;
    }
    try {
      const rows = await repo.listAnnotationsForPdfPage(pageId, filePath, pageNumber);
      setAnnotations(rows);
    } catch {
      setAnnotations([]);
    }
  }, [pageId, filePath, pageNumber]);

  useEffect(() => {
    void reloadAnnotations();
  }, [reloadAnnotations]);

  const onRenderSuccess = useCallback((page: PageCallback) => {
    pageProxyRef.current = page;
    setLayerTick((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!pulsingId) return;
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setPulsingId(null);
      pulseTimerRef.current = null;
    }, 3000);
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [pulsingId]);

  useEffect(() => {
    if (!pageId) return;
    const onPdfNav = (ev: Event) => {
      const e = ev as CustomEvent<PdfNavigateDetail>;
      const d = e.detail;
      if (!d || d.pageId !== pageId) return;
      setPageNumber(d.pageNum);
      setPulsingId(d.annotationId);
      const scrollToAnn = () => {
        const el = pageWrapRef.current?.querySelector(`[data-annotation-id="${d.annotationId}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      };
      requestAnimationFrame(scrollToAnn);
      window.setTimeout(scrollToAnn, 220);
    };
    window.addEventListener(BIONOTES_PDF_NAVIGATE, onPdfNav);
    return () => window.removeEventListener(BIONOTES_PDF_NAVIGATE, onPdfNav);
  }, [pageId]);

  useEffect(() => {
    const closeCtx = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t?.closest('.pdf-viewer__ctx-menu')) return;
      setContextMenu(null);
    };
    const closeOnScroll = () => setContextMenu(null);
    window.addEventListener('mousedown', closeCtx, true);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      window.removeEventListener('mousedown', closeCtx, true);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
  }, []);

  useEffect(() => {
    if (!pageId) return;
    const onMouseUp = (ev: MouseEvent) => {
      if (ev.button !== 0) return;
      const wrap = pageWrapRef.current;
      if (!wrap) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setSelectionPopup(null);
        return;
      }
      const textLayer = wrap.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        setSelectionPopup(null);
        return;
      }
      const anchor = sel.anchorNode;
      const focus = sel.focusNode;
      if (!anchor || !focus) {
        setSelectionPopup(null);
        return;
      }
      const aEl = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element);
      const fEl = focus.nodeType === Node.TEXT_NODE ? focus.parentElement : (focus as Element);
      if (!aEl || !fEl || !textLayer.contains(aEl) || !textLayer.contains(fEl)) {
        setSelectionPopup(null);
        return;
      }
      const raw = sel.toString().trim();
      if (!raw) {
        setSelectionPopup(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rects = range.getClientRects();
      if (!rects.length) {
        setSelectionPopup(null);
        return;
      }
      const last = rects[rects.length - 1]!;
      setSelectionPopup({
        x: last.right + 4,
        y: last.top,
        text: raw,
        range: range.cloneRange(),
      });
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [pageId]);

  const closeSelectionPopup = useCallback(() => {
    setSelectionPopup(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const applyHighlight = useCallback(
    async (colorKey: HighlightColorKey) => {
      if (!pageId || !selectionPopup) return;
      const page = pageProxyRef.current;
      const wrap = pageWrapRef.current;
      if (!page || !wrap) return;
      const vp = page.getViewport({ scale, rotation: page.rotate });
      const pr = wrap.getBoundingClientRect();
      const range = selectionPopup.range.cloneRange();
      const quads = clientRectsToPdfQuads(vp, range.getClientRects(), pr.left, pr.top);
      const excerpt = selectionPopup.text;
      if (!quads.length) {
        closeSelectionPopup();
        return;
      }
      const blockId = newBlockId();
      const annId = newAnnotationId();
      const color = HIGHLIGHT_HEX[colorKey];
      const now = Date.now();
      try {
        await repo.insertAnnotation({
          id: annId,
          pageId,
          pdfPath: filePath,
          pdfPageNum: pageNumber,
          quadPoints: quads,
          color,
          textExcerpt: excerpt,
          linkedBlockId: blockId,
          createdAt: now,
        });
        dispatchInsertQuote({ pageId, blockId, text: excerpt });
        closeSelectionPopup();
        await reloadAnnotations();
      } catch {
        closeSelectionPopup();
      }
    },
    [pageId, selectionPopup, scale, filePath, pageNumber, closeSelectionPopup, reloadAnnotations],
  );

  const onHighlightClick = useCallback(
    (ev: React.MouseEvent, ann: PdfAnnotation) => {
      ev.stopPropagation();
      if (!pageId || !ann.linkedBlockId) return;
      dispatchEditorNavigate({ pageId, blockId: ann.linkedBlockId });
    },
    [pageId],
  );

  const onHighlightContextMenu = useCallback((ev: React.MouseEvent, annotationId: string) => {
    ev.preventDefault();
    ev.stopPropagation();
    setContextMenu({ x: ev.clientX, y: ev.clientY, annotationId });
  }, []);

  const deleteAnnotationAt = useCallback(
    async (annotationId: string) => {
      try {
        await repo.deleteAnnotation(annotationId);
        setContextMenu(null);
        await reloadAnnotations();
      } catch {
        setContextMenu(null);
      }
    },
    [reloadAnnotations],
  );

  const goPrev = useCallback(() => {
    setPageNumber((p) => Math.max(1, p - 1));
  }, []);

  const goNext = useCallback(() => {
    setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p));
  }, [numPages]);

  const zoomOut = useCallback(() => {
    setZoomPct((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomPct((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }, []);

  const overlayBoxes = useMemo(() => {
    const page = pageProxyRef.current;
    if (!page || !annotations.length) return [] as { ann: PdfAnnotation; quadIndex: number; box: ReturnType<typeof pdfQuadToViewportBox> }[];
    const vp = page.getViewport({ scale, rotation: page.rotate });
    const out: { ann: PdfAnnotation; quadIndex: number; box: ReturnType<typeof pdfQuadToViewportBox> }[] = [];
    for (const ann of annotations) {
      ann.quadPoints.forEach((quad, qi) => {
        if (quad.length < 8) return;
        out.push({ ann, quadIndex: qi, box: pdfQuadToViewportBox(vp, quad) });
      });
    }
    return out;
  }, [annotations, scale, pageNumber, zoomPct, layerTick]);

  return (
    <section className="pdf-viewer" aria-label={t('pdfViewer.title')}>
      <div className="pdf-viewer__toolbar pdf-viewer__toolbar--top">
        <span className="pdf-viewer__filename" title={displayName}>
          {displayName}
        </span>
        <span className="pdf-viewer__meta">
          {numPages > 0
            ? t('pdfViewer.pageOf', { current: pageNumber, total: numPages })
            : '—'}
        </span>
        <div className="pdf-viewer__zoom">
          <button type="button" className="pdf-viewer__icon-btn" onClick={zoomOut} aria-label={t('pdfViewer.zoomOut')} disabled={zoomPct <= ZOOM_MIN}>
            <Minus size={14} />
          </button>
          <span className="pdf-viewer__zoom-label">{zoomPct}%</span>
          <button type="button" className="pdf-viewer__icon-btn" onClick={zoomIn} aria-label={t('pdfViewer.zoomIn')} disabled={zoomPct >= ZOOM_MAX}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="pdf-viewer__scroll">
        {loadError ? (
          <div className="pdf-viewer__error" role="alert">
            {loadError}
          </div>
        ) : (
          <div className="pdf-viewer__canvas-wrap">
            <Document file={fileUrl} onLoadSuccess={onDocLoad} onLoadError={onDocError}>
              <div ref={pageWrapRef} className="pdf-viewer__page-stack">
                <Page
                  key={`${pageNumber}-${zoomPct}`}
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer
                  renderAnnotationLayer
                  onRenderSuccess={onRenderSuccess}
                />
                {pageId ? (
                  <div className="pdf-viewer__highlight-layer" aria-hidden>
                    {overlayBoxes.map(({ ann, quadIndex, box }) => (
                      <button
                        key={`${ann.id}-${quadIndex}`}
                        type="button"
                        className={`pdf-viewer__highlight ${pulsingId === ann.id ? 'pdf-viewer__highlight--pulse' : ''}`}
                        data-annotation-id={ann.id}
                        style={{
                          left: box.left,
                          top: box.top,
                          width: Math.max(2, box.width),
                          height: Math.max(2, box.height),
                          background: hexToRgba(ann.color, 0.35),
                        }}
                        title={ann.textExcerpt}
                        onClick={(e) => onHighlightClick(e, ann)}
                        onContextMenu={(e) => onHighlightContextMenu(e, ann.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </Document>
          </div>
        )}
      </div>

      {pageId && selectionPopup ? (
        <div
          className="pdf-viewer__hl-popup"
          style={{ left: selectionPopup.x, top: selectionPopup.y }}
          role="dialog"
          aria-label={t('pdfViewer.highlight.title')}
        >
          <span className="pdf-viewer__hl-popup-label">{t('pdfViewer.highlight.addAsNote')}</span>
          <div className="pdf-viewer__hl-popup-colors">
            <button type="button" className="pdf-viewer__hl-swatch pdf-viewer__hl-swatch--yellow" title={t('pdfViewer.highlight.yellow')} aria-label={t('pdfViewer.highlight.yellow')} onClick={() => void applyHighlight('yellow')} />
            <button type="button" className="pdf-viewer__hl-swatch pdf-viewer__hl-swatch--green" title={t('pdfViewer.highlight.green')} aria-label={t('pdfViewer.highlight.green')} onClick={() => void applyHighlight('green')} />
            <button type="button" className="pdf-viewer__hl-swatch pdf-viewer__hl-swatch--red" title={t('pdfViewer.highlight.red')} aria-label={t('pdfViewer.highlight.red')} onClick={() => void applyHighlight('red')} />
          </div>
        </div>
      ) : null}

      {contextMenu ? (
        <div className="pdf-viewer__ctx-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button type="button" className="pdf-viewer__ctx-item" onClick={() => void deleteAnnotationAt(contextMenu.annotationId)}>
            {t('pdfViewer.highlight.delete')}
          </button>
        </div>
      ) : null}

      <div className="pdf-viewer__toolbar pdf-viewer__toolbar--bottom">
        <button type="button" className="pdf-viewer__nav-btn" onClick={goPrev} disabled={pageNumber <= 1 || numPages === 0} aria-label={t('pdfViewer.prev')}>
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="pdf-viewer__nav-btn"
          onClick={goNext}
          disabled={numPages === 0 || pageNumber >= numPages}
          aria-label={t('pdfViewer.next')}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}
