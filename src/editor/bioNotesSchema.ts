import {
  BlockNoteSchema,
  createExtension,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
} from '@blocknote/core';
import { Extension, nodeInputRule } from '@tiptap/core';
import { createLatexBlockSpec } from './blocks/LatexBlock';
import { createExperimentLogBlockSpec } from './blocks/ExperimentLogBlock';
import { createHypothesisBlockSpec } from './blocks/HypothesisBlock';
import { createConclusionBlockSpec } from './blocks/ConclusionBlock';
import { createChemistryBlockSpec } from './blocks/ChemistryBlock';
import { inlineLatexSpec } from './blocks/InlineLatex';
import { wikiLinkSpec } from './inline/WikiLink';

export const bioNotesSchema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    latex: createLatexBlockSpec(),
    experimentLog: createExperimentLogBlockSpec(),
    hypothesis: createHypothesisBlockSpec(),
    conclusion: createConclusionBlockSpec(),
    chemistry: createChemistryBlockSpec(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    inlineLatex: inlineLatexSpec,
    wikiLink: wikiLinkSpec,
  },
});

export const createInlineLatexInputExtension = () =>
  createExtension(({ editor }) => ({
    key: 'inlineLatexDollarInput',
    tiptapExtensions: [
      Extension.create({
        name: 'inlineLatexDollarInputRules',
        addInputRules() {
          const nodeType = editor._tiptapEditor.schema.nodes.inlineLatex;
          if (!nodeType) return [];
          return [
            nodeInputRule({
              find: /\$([^$\n]+)\$/,
              type: nodeType,
              getAttributes: (match) => ({ latex: match[1] ?? '' }),
            }),
          ];
        },
      }),
    ],
  }))();
