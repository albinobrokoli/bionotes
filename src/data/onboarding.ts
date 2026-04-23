import type { AccentKey, IconName, Language } from '../store/app';

export type OnboardingAreaId =
  | 'neurobiology'
  | 'molecular-biology'
  | 'cell-biology'
  | 'ecology'
  | 'medicine'
  | 'chemistry'
  | 'physics'
  | 'other';

export type OnboardingAreaDef = {
  id: OnboardingAreaId;
  labels: Record<Language, string>;
  icon: IconName;
  color: string;
  seedSpaceId?: string;
};

export const ONBOARDING_AREA_DEFS: OnboardingAreaDef[] = [
  {
    id: 'neurobiology',
    labels: { tr: 'Nörobiyoloji', en: 'Neurobiology' },
    icon: 'brain',
    color: '#A78BFA',
    seedSpaceId: 'sp_neuro',
  },
  {
    id: 'molecular-biology',
    labels: { tr: 'Moleküler Biyoloji', en: 'Molecular Biology' },
    icon: 'dna',
    color: '#34D399',
    seedSpaceId: 'sp_mol',
  },
  {
    id: 'cell-biology',
    labels: { tr: 'Hücre Biyolojisi', en: 'Cell Biology' },
    icon: 'cell',
    color: '#60A5FA',
    seedSpaceId: 'sp_cell',
  },
  {
    id: 'ecology',
    labels: { tr: 'Ekoloji', en: 'Ecology' },
    icon: 'leaf',
    color: '#F59E0B',
    seedSpaceId: 'sp_eco',
  },
  {
    id: 'medicine',
    labels: { tr: 'Tıp', en: 'Medicine' },
    icon: 'microscope',
    color: '#0A84FF',
  },
  {
    id: 'chemistry',
    labels: { tr: 'Kimya', en: 'Chemistry' },
    icon: 'flask',
    color: '#FF9F0A',
  },
  {
    id: 'physics',
    labels: { tr: 'Fizik', en: 'Physics' },
    icon: 'atom',
    color: '#BF5AF2',
  },
  {
    id: 'other',
    labels: { tr: 'Diğer', en: 'Other' },
    icon: 'book',
    color: '#5AC8FA',
  },
];

export const ONBOARDING_DEFAULT_ACCENT: AccentKey = 'green';
