/**
 * PDF.js PageViewport: viewport (px, y aşağı) ↔ PDF kullanıcı uzayı.
 */

export type ViewportLike = {
  convertToPdfPoint: (x: number, y: number) => number[];
  convertToViewportPoint: (x: number, y: number) => number[];
};

/** Tek satır DOMRect → PDF düzleminde 8 sayılı quad [tl, tr, br, bl] x,y çiftleri. */
export function domRectToPdfQuad(
  viewport: ViewportLike,
  rect: DOMRectReadOnly,
  pageOffsetX: number,
  pageOffsetY: number,
): number[] {
  const x = rect.left - pageOffsetX;
  const y = rect.top - pageOffsetY;
  const w = rect.width;
  const h = rect.height;
  const tl = viewport.convertToPdfPoint(x, y);
  const tr = viewport.convertToPdfPoint(x + w, y);
  const br = viewport.convertToPdfPoint(x + w, y + h);
  const bl = viewport.convertToPdfPoint(x, y + h);
  return [tl[0]!, tl[1]!, tr[0]!, tr[1]!, br[0]!, br[1]!, bl[0]!, bl[1]!];
}

export function clientRectsToPdfQuads(
  viewport: ViewportLike,
  rects: DOMRectList | DOMRect[],
  pageOffsetX: number,
  pageOffsetY: number,
): number[][] {
  const list = Array.from(rects as Iterable<DOMRectReadOnly>);
  const out: number[][] = [];
  for (const r of list) {
    if (r.width < 1 && r.height < 1) continue;
    out.push(domRectToPdfQuad(viewport, r, pageOffsetX, pageOffsetY));
  }
  return out;
}

/** Kayıtlı quad (8 sayı) → mevcut viewport’ta sınırlayıcı kutu (px). */
export function pdfQuadToViewportBox(viewport: ViewportLike, quad: number[]): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < 8; i += 2) {
    const vx = viewport.convertToViewportPoint(quad[i]!, quad[i + 1]!);
    xs.push(vx[0]!);
    ys.push(vx[1]!);
  }
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}
