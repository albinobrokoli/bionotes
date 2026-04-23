import { useEffect } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';

export type ConclusionConfidence = 'low' | 'medium' | 'high';

type ConclusionProps = {
  text: string;
  confidence: ConclusionConfidence;
  uid: string;
};

const ALL_CONFIDENCE: ConclusionConfidence[] = ['low', 'medium', 'high'];

function toConfidence(value: string): ConclusionConfidence {
  return ALL_CONFIDENCE.includes(value as ConclusionConfidence) ? (value as ConclusionConfidence) : 'medium';
}

function ConclusionBlockView(props: any) {
  const { block, editor } = props;
  const { t } = useTranslation();
  const blockProps = block.props as ConclusionProps;

  useEffect(() => {
    if (blockProps.uid) return;
    editor.updateBlock(block, {
      props: {
        ...blockProps,
        uid: uuidv4(),
      },
    });
  }, [block, blockProps, editor]);

  return (
    <section className="bn-conclusion-block">
      <header className="bn-conclusion-block__header">
        <span className="bn-conclusion-block__title">{t('editor.scienceBlocks.conclusion.title')}</span>
        <span className="bn-conclusion-block__chip">
          {t(`editor.scienceBlocks.confidence.${toConfidence(blockProps.confidence)}`)}
        </span>
      </header>
      <textarea
        className="bn-conclusion-block__textarea"
        rows={3}
        placeholder={t('editor.scienceBlocks.conclusion.placeholder')}
        value={blockProps.text}
        onChange={(e) =>
          editor.updateBlock(block, {
            props: {
              ...blockProps,
              text: e.target.value,
            },
          })
        }
      />
    </section>
  );
}

export const createConclusionBlockSpec = createReactBlockSpec(
  {
    type: 'conclusion',
    propSchema: {
      text: {
        default: '',
      },
      confidence: {
        default: 'medium',
      },
      uid: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: ConclusionBlockView,
  },
);
