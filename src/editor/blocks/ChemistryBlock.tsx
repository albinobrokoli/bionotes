import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import SmilesDrawer from 'smiles-drawer';

type ChemistryProps = {
  smiles: string;
  label: string;
};

const QUICK_INSERT_SMILES: Array<{ label: string; smiles: string }> = [
  { label: 'Su', smiles: 'O' },
  { label: 'Glukoz', smiles: 'OCC1OC(O)C(C(C1O)O)O' },
  { label: 'Kafein', smiles: 'Cn1cnc2n(C)c(=O)n(C)c(=O)c12' },
  {
    label: 'ATP',
    smiles: 'NC1=NC=NC2=C1N=CN2[C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O',
  },
  { label: 'Dopamin', smiles: 'NCCc1ccc(O)c(O)c1' },
];

function parseSmiles(smiles: string): Promise<any> {
  return new Promise((resolve, reject) => {
    SmilesDrawer.parse(smiles, resolve, reject);
  });
}

function ChemistryBlockView(props: any) {
  const { block, editor } = props;
  const blockProps = block.props as ChemistryProps;
  const [draftSmiles, setDraftSmiles] = useState(blockProps.smiles);
  const [draftLabel, setDraftLabel] = useState(blockProps.label);
  const [debouncedSmiles, setDebouncedSmiles] = useState(blockProps.smiles);
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawerRef = useRef<any>(null);

  useEffect(() => {
    setDraftSmiles(blockProps.smiles);
    setDebouncedSmiles(blockProps.smiles);
  }, [blockProps.smiles]);

  useEffect(() => {
    setDraftLabel(blockProps.label);
  }, [blockProps.label]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSmiles(draftSmiles.trim());
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draftSmiles]);

  const commit = useCallback(
    (next: Partial<ChemistryProps>) => {
      editor.updateBlock(block, {
        props: {
          ...blockProps,
          ...next,
        },
      });
    },
    [block, blockProps, editor],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const smiles = debouncedSmiles.trim();
    if (!smiles) {
      setIsValid(true);
      setValidationMessage(null);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    if (!drawerRef.current) {
      drawerRef.current = new SmilesDrawer.Drawer({
        width: 480,
        height: 280,
        theme: 'dark',
      });
    }

    parseSmiles(smiles)
      .then((tree) => {
        drawerRef.current.draw(tree, canvas, 'dark', false);
        setIsValid(true);
        setValidationMessage(null);
        if (smiles !== blockProps.smiles) {
          commit({ smiles });
        }
      })
      .catch(() => {
        setIsValid(false);
        setValidationMessage('Geçersiz SMILES notasyonu');
      });
  }, [blockProps.smiles, commit, debouncedSmiles]);

  const onValidate = useCallback(() => {
    const smiles = draftSmiles.trim();
    if (!smiles) {
      setIsValid(false);
      setValidationMessage('Geçersiz SMILES notasyonu');
      return;
    }
    parseSmiles(smiles)
      .then(() => {
        setIsValid(true);
        setValidationMessage(null);
      })
      .catch(() => {
        setIsValid(false);
        setValidationMessage('Geçersiz SMILES notasyonu');
      });
  }, [draftSmiles]);

  const onExportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const href = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const safeName = (draftLabel.trim() || 'chemical-structure')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    a.href = href;
    a.download = `${safeName || 'chemical-structure'}.png`;
    a.click();
  }, [draftLabel]);

  const quickButtons = useMemo(
    () =>
      QUICK_INSERT_SMILES.map((item) => (
        <button
          key={item.label}
          type="button"
          className="bn-chem__quick-btn"
          onClick={() => {
            setDraftLabel(item.label);
            setDraftSmiles(item.smiles);
            commit({ label: item.label, smiles: item.smiles });
          }}
        >
          {item.label}
        </button>
      )),
    [commit],
  );

  return (
    <section className="bn-chem-block">
      <header className="bn-chem__toolbar">
        <div className="bn-chem__inputs">
          <label className="bn-chem__field">
            <span className="bn-chem__field-label">SMILES</span>
            <input
              className="bn-chem__input mono"
              value={draftSmiles}
              placeholder="CC(=O)OC1=CC=CC=C1C(=O)O"
              onChange={(e) => setDraftSmiles(e.target.value)}
              onBlur={() => commit({ smiles: draftSmiles.trim() })}
              spellCheck={false}
            />
          </label>
          <label className="bn-chem__field">
            <span className="bn-chem__field-label">Label</span>
            <input
              className="bn-chem__input"
              value={draftLabel}
              placeholder="Aspirin"
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={() => commit({ label: draftLabel.trim() })}
              spellCheck={false}
            />
          </label>
        </div>
        <div className="bn-chem__actions">
          <button type="button" className="bn-chem__btn" onClick={onValidate}>
            Validate
          </button>
          <button type="button" className="bn-chem__btn bn-chem__btn--accent" onClick={onExportPng}>
            PNG Export
          </button>
        </div>
      </header>

      <div className="bn-chem__quick-row">{quickButtons}</div>

      {!isValid && validationMessage ? <div className="bn-chem__alert">{validationMessage}</div> : null}

      <div className="bn-chem__canvas-wrap">
        <canvas ref={canvasRef} className="bn-chem__canvas" width={480} height={280} />
      </div>
    </section>
  );
}

export const createChemistryBlockSpec = createReactBlockSpec(
  {
    type: 'chemistry',
    propSchema: {
      smiles: {
        default: '',
      },
      label: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: ChemistryBlockView,
  },
);
