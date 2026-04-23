import { useMemo } from 'react';
import { createReactInlineContentSpec } from '@blocknote/react';
import type { DefaultStyleSchema, PartialBlock } from '@blocknote/core';
import { useApp } from '../../store/app';

const wikiLinkConfig = {
  type: 'wikiLink',
  propSchema: {
    title: { default: '' },
    pageId: { default: '' },
  },
  content: 'none',
} as const;

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
      if (text) return text.slice(0, 120);
    }
    if (block.children?.length) queue.push(...block.children);
  }
  return '';
}

function WikiLinkView(props: {
  inlineContent: { type: 'wikiLink'; props: { title: string; pageId: string } };
  updateInlineContent: (u: { type?: 'wikiLink'; props?: { title?: string; pageId?: string } }) => void;
  contentRef: (el: HTMLElement | null) => void;
}) {
  const pages = useApp((s) => s.pages);
  const selectPage = useApp((s) => s.selectPage);
  const createPage = useApp((s) => s.createPage);
  const activeCategoryId = useApp((s) => s.activeCategoryId);
  const categories = useApp((s) => s.categories);

  const title = props.inlineContent.props.title || 'Untitled';
  const rawPageId = props.inlineContent.props.pageId || '';
  const linkedPage = useMemo(() => pages.find((p) => p.id === rawPageId) ?? null, [pages, rawPageId]);
  const resolved = !!linkedPage;
  const preview = linkedPage ? firstParagraphExcerpt(linkedPage.content) : 'Sayfa bulunamadı';

  const onClick = () => {
    void (async () => {
      if (linkedPage) {
        await selectPage(linkedPage.id);
        return;
      }
      const ok = window.confirm(`"${title}" sayfası bulunamadı. Yeni sayfa oluşturulsun mu?`);
      if (!ok) return;
      const categoryId = activeCategoryId ?? categories[0]?.id;
      if (!categoryId) return;
      const newId = await createPage(categoryId, title);
      props.updateInlineContent({ props: { pageId: newId, title } });
    })();
  };

  return (
    <span ref={props.contentRef}>
      <button
        type="button"
        className={resolved ? 'bn-wikilink' : 'bn-wikilink bn-wikilink--unresolved'}
        title={preview}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
      >
        {title}
      </button>
    </span>
  );
}

export const wikiLinkSpec = createReactInlineContentSpec<typeof wikiLinkConfig, DefaultStyleSchema>(
  wikiLinkConfig,
  {
    render: WikiLinkView as any,
  },
);
