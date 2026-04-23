import { useEffect } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FlaskConical, Hourglass, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export type HypothesisStatus = 'proposed' | 'testing' | 'supported' | 'rejected';

type HypothesisProps = {
  text: string;
  status: HypothesisStatus;
  uid: string;
};

const ALL_STATUSES: HypothesisStatus[] = ['proposed', 'testing', 'supported', 'rejected'];

function toHypothesisStatus(value: string): HypothesisStatus {
  return ALL_STATUSES.includes(value as HypothesisStatus) ? (value as HypothesisStatus) : 'proposed';
}

const STATUS_META: Record<
  HypothesisStatus,
  {
    icon: typeof FlaskConical;
    color: string;
  }
> = {
  proposed: {
    icon: FlaskConical,
    color: 'var(--info)',
  },
  testing: {
    icon: Hourglass,
    color: 'var(--warn)',
  },
  supported: {
    icon: CheckCircle2,
    color: 'var(--accent)',
  },
  rejected: {
    icon: XCircle,
    color: 'var(--danger)',
  },
};

function HypothesisBlockView(props: any) {
  const { block, editor } = props;
  const { t } = useTranslation();
  const blockProps = block.props as HypothesisProps;

  useEffect(() => {
    if (blockProps.uid) return;
    editor.updateBlock(block, {
      props: {
        ...blockProps,
        uid: uuidv4(),
      },
    });
  }, [block, blockProps, editor]);

  const status = toHypothesisStatus(blockProps.status);
  const statusMeta = STATUS_META[status];
  const StatusIcon = statusMeta.icon;

  return (
    <section className="bn-hypothesis-block">
      <header className="bn-hypothesis-block__header">
        <div className="bn-hypothesis-block__left">
          <span className="bn-hypothesis-block__title">{t('editor.scienceBlocks.hypothesis.title')}</span>
          <select
            className="bn-hypothesis-block__status-select"
            value={status}
            onChange={(e) =>
              editor.updateBlock(block, {
                props: {
                  ...blockProps,
                  status: toHypothesisStatus(e.target.value),
                },
              })
            }
          >
            <option value="proposed">{t('editor.scienceBlocks.status.proposed')}</option>
            <option value="testing">{t('editor.scienceBlocks.status.testing')}</option>
            <option value="supported">{t('editor.scienceBlocks.status.supported')}</option>
            <option value="rejected">{t('editor.scienceBlocks.status.rejected')}</option>
          </select>
        </div>
        <span className="bn-hypothesis-block__status-icon" style={{ color: statusMeta.color }}>
          <StatusIcon size={14} />
        </span>
      </header>
      <textarea
        className="bn-hypothesis-block__textarea"
        rows={3}
        placeholder={t('editor.scienceBlocks.hypothesis.placeholder')}
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

export const createHypothesisBlockSpec = createReactBlockSpec(
  {
    type: 'hypothesis',
    propSchema: {
      text: {
        default: '',
      },
      status: {
        default: 'proposed',
      },
      uid: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: HypothesisBlockView,
  },
);
