import { create } from 'zustand';
import type { PartialBlock } from '@blocknote/core';
import { initDB } from '../db/client';
import { ensureSeed } from '../db/ensureSeed';
import * as repo from '../db/repo';
import type { CitationFormat } from '../services/bibliography';
import type { OnboardingAreaId } from '../data/onboarding';

export type IconName =
  | 'brain'
  | 'dna'
  | 'cell'
  | 'leaf'
  | 'flask'
  | 'microscope'
  | 'atom'
  | 'book'
  | 'file';

export type AccentKey = 'green' | 'blue' | 'purple' | 'amber' | 'pink';
export type FontPair = 'inter-mono' | 'system' | 'humanist';
export type Language = 'tr' | 'en';
export type ViewMode = 'edit' | 'preview' | 'split';

export type EditorSaveStatus = 'saving' | 'saved' | 'error';

export interface Space {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  categoryIds: string[];
  expanded: boolean;
}

export interface Category {
  id: string;
  spaceId: string;
  name: string;
  pageIds: string[];
  expanded: boolean;
}

export interface Page {
  id: string;
  categoryId: string;
  title: string;
  icon?: IconName;
  favorite: boolean;
  tags: string[];
  content: PartialBlock<any, any, any>[];
  createdAt: number;
  updatedAt: number;
  /** Son eklenen PDF eki (page_attachments, kind = pdf) */
  pdfPath: string | null;
  pdfFileName: string | null;
}

export const ACCENT_MAP: Record<AccentKey, { hex: string; soft: string; line: string; name: string }> = {
  green: { hex: '#30D158', soft: 'rgba(48,209,88,0.14)', line: 'rgba(48,209,88,0.45)', name: 'System Green' },
  blue: { hex: '#0A84FF', soft: 'rgba(10,132,255,0.14)', line: 'rgba(10,132,255,0.45)', name: 'System Blue' },
  purple: { hex: '#A78BFA', soft: 'rgba(167,139,250,0.14)', line: 'rgba(167,139,250,0.45)', name: 'Lavender' },
  amber: { hex: '#FF9F0A', soft: 'rgba(255,159,10,0.14)', line: 'rgba(255,159,10,0.45)', name: 'System Orange' },
  pink: { hex: '#FF2D55', soft: 'rgba(255,45,85,0.14)', line: 'rgba(255,45,85,0.45)', name: 'System Pink' },
};

type DataSlice = {
  spaces: Space[];
  categories: Category[];
  pages: Page[];
  activeSpaceId: string | null;
  activeCategoryId: string | null;
  activePageId: string | null;
};

function snapshotData(get: () => AppState): DataSlice {
  const s = get();
  return {
    spaces: s.spaces,
    categories: s.categories,
    pages: s.pages,
    activeSpaceId: s.activeSpaceId,
    activeCategoryId: s.activeCategoryId,
    activePageId: s.activePageId,
  };
}

interface AppState {
  /* bootstrap */
  dbReady: boolean;
  loadStore: () => Promise<void>;
  /* Data */
  spaces: Space[];
  categories: Category[];
  pages: Page[];

  /* Selection */
  activeSpaceId: string | null;
  activeCategoryId: string | null;
  activePageId: string | null;

  /* UI */
  viewMode: ViewMode;
  commandOpen: boolean;
  graphOpen: boolean;
  tweaksOpen: boolean;
  rightRailOpen: boolean;

  /** Editör otomatik kayıt göstergesi (Breadcrumb) */
  saveStatus: EditorSaveStatus;
  lastSavedAt: number | null;

  /* Preferences */
  accent: AccentKey;
  fontPair: FontPair;
  language: Language;
  citationFormat: CitationFormat;
  autoUpdatesEnabled: boolean;
  onboardedAt: string | null;

  /* Actions — selection */
  selectSpace: (id: string) => Promise<void>;
  selectCategory: (id: string) => Promise<void>;
  selectPage: (id: string) => Promise<void>;
  toggleSpace: (id: string) => Promise<void>;
  toggleCategory: (id: string) => Promise<void>;

  /* Actions — pages */
  createPage: (categoryId: string, title?: string) => Promise<string>;
  deletePage: (id: string) => Promise<void>;
  renamePage: (id: string, title: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  updatePageContent: (id: string, content: PartialBlock<any, any, any>[]) => Promise<void>;
  attachPagePdf: (pageId: string, filePath: string, fileName: string) => Promise<void>;
  setSaveStatus: (patch: { state?: EditorSaveStatus; lastSavedAt?: number | null }) => void;

  /* Actions — UI */
  setViewMode: (mode: ViewMode) => Promise<void>;
  openCommand: () => void;
  closeCommand: () => void;
  toggleCommand: () => void;
  openGraph: () => void;
  closeGraph: () => void;
  toggleGraph: () => void;
  toggleTweaks: () => void;
  toggleRightRail: () => Promise<void>;

  /* Actions — preferences */
  setAccent: (accent: AccentKey) => Promise<void>;
  setFontPair: (pair: FontPair) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setCitationFormat: (format: CitationFormat) => Promise<void>;
  setAutoUpdatesEnabled: (enabled: boolean) => Promise<void>;
  completeOnboarding: (payload: {
    language: Language;
    accent: AccentKey;
    selectedAreaIds: OnboardingAreaId[];
  }) => Promise<void>;
  requestOnboardingAgain: () => Promise<void>;

  /* Maintenance */
  resetToSeed: () => Promise<void>;
}

export const useApp = create<AppState>()((set, get) => ({
  dbReady: false,
  loadStore: async () => {
    const data = await repo.loadAppStateFromDb();
    set({
      ...data,
      dbReady: true,
    });
  },
  spaces: [],
  categories: [],
  pages: [],
  activeSpaceId: null,
  activeCategoryId: null,
  activePageId: null,
  viewMode: 'edit',
  commandOpen: false,
  graphOpen: false,
  tweaksOpen: false,
  rightRailOpen: false,
  saveStatus: 'saved',
  lastSavedAt: null,
  accent: 'green',
  fontPair: 'inter-mono',
  language: 'tr',
  citationFormat: 'apa',
  autoUpdatesEnabled: true,
  onboardedAt: null,

  selectSpace: async (id) => {
    const firstCat = get().categories.find((c) => c.spaceId === id);
    const firstPage = firstCat
      ? get().pages.find((p) => p.categoryId === firstCat.id)
      : undefined;
    const before = snapshotData(get);
    set({
      activeSpaceId: id,
      activeCategoryId: firstCat?.id ?? null,
      activePageId: firstPage?.id ?? null,
    });
    try {
      await repo.setManyPreferences([
        [repo.PREF.activeSpaceId, id],
        [repo.PREF.activeCategoryId, firstCat?.id ?? ''],
        [repo.PREF.activePageId, firstPage?.id ?? ''],
      ]);
    } catch {
      set(before);
    }
  },

  selectCategory: async (id) => {
    const firstPage = get().pages.find((p) => p.categoryId === id);
    const before = snapshotData(get);
    set({
      activeCategoryId: id,
      activePageId: firstPage?.id ?? null,
    });
    try {
      await repo.setManyPreferences([
        [repo.PREF.activeCategoryId, id],
        [repo.PREF.activePageId, firstPage?.id ?? ''],
      ]);
    } catch {
      set(before);
    }
  },

  selectPage: async (id) => {
    const page = get().pages.find((p) => p.id === id);
    if (!page) return;
    const cat = get().categories.find((c) => c.id === page.categoryId);
    const before = snapshotData(get);
    set({
      activePageId: id,
      activeCategoryId: cat?.id ?? null,
      activeSpaceId: cat?.spaceId ?? null,
    });
    try {
      await repo.setManyPreferences([
        [repo.PREF.activeSpaceId, cat?.spaceId ?? ''],
        [repo.PREF.activeCategoryId, cat?.id ?? ''],
        [repo.PREF.activePageId, id],
      ]);
    } catch {
      set(before);
    }
  },

  toggleSpace: async (id) => {
    const before = snapshotData(get);
    set((s) => ({
      spaces: s.spaces.map((sp) => (sp.id === id ? { ...sp, expanded: !sp.expanded } : sp)),
    }));
    try {
      const m = Object.fromEntries(get().spaces.map((sp) => [sp.id, sp.expanded]));
      await repo.setPreference(repo.PREF.expandedSpaces, JSON.stringify(m));
    } catch {
      set(before);
    }
  },

  toggleCategory: async (id) => {
    const before = snapshotData(get);
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, expanded: !c.expanded } : c)),
    }));
    try {
      const m = Object.fromEntries(get().categories.map((c) => [c.id, c.expanded]));
      await repo.setPreference(repo.PREF.expandedCategories, JSON.stringify(m));
    } catch {
      set(before);
    }
  },

  createPage: async (categoryId, title = 'Yeni sayfa') => {
    const newId = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const page: Page = {
      id: newId,
      categoryId,
      title,
      favorite: false,
      tags: [],
      content: [
        { type: 'heading', props: { level: 1 }, content: title },
        { type: 'paragraph', content: '' },
      ],
      createdAt: now,
      updatedAt: now,
      pdfPath: null,
      pdfFileName: null,
    };
    const cat = get().categories.find((c) => c.id === categoryId);
    const before = snapshotData(get);
    set((s) => ({
      pages: [...s.pages, page],
      categories: s.categories.map((c) =>
        c.id === categoryId ? { ...c, pageIds: [...c.pageIds, newId], expanded: true } : c,
      ),
      activePageId: newId,
      activeCategoryId: categoryId,
      activeSpaceId: cat?.spaceId ?? s.activeSpaceId,
    }));
    try {
      await repo.insertPage(page);
      if (cat) {
        await repo.setManyPreferences([
          [repo.PREF.activeSpaceId, cat.spaceId],
          [repo.PREF.activeCategoryId, categoryId],
          [repo.PREF.activePageId, newId],
        ]);
      } else {
        await repo.setManyPreferences([
          [repo.PREF.activeCategoryId, categoryId],
          [repo.PREF.activePageId, newId],
        ]);
      }
    } catch {
      set(before);
    }
    return newId;
  },

  deletePage: async (id) => {
    const before = snapshotData(get);
    set((s) => {
      const remaining = s.pages.filter((p) => p.id !== id);
      const newActive = s.activePageId === id ? (remaining[0]?.id ?? null) : s.activePageId;
      return {
        pages: remaining,
        categories: s.categories.map((c) => ({
          ...c,
          pageIds: c.pageIds.filter((pid) => pid !== id),
        })),
        activePageId: newActive,
      };
    });
    try {
      await repo.deletePageRow(id);
      const next = get();
      await repo.setManyPreferences([
        [repo.PREF.activePageId, next.activePageId ?? ''],
        [repo.PREF.activeCategoryId, next.activeCategoryId ?? ''],
        [repo.PREF.activeSpaceId, next.activeSpaceId ?? ''],
      ]);
    } catch {
      set(before);
    }
  },

  renamePage: async (id, title) => {
    const before = snapshotData(get);
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, title, updatedAt: Date.now() } : p)),
    }));
    try {
      const p = get().pages.find((x) => x.id === id);
      if (p) {
        await repo.updatePage(id, { title, updatedAt: p.updatedAt });
      }
    } catch {
      set(before);
    }
  },

  toggleFavorite: async (id) => {
    const before = snapshotData(get);
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)),
    }));
    try {
      const p = get().pages.find((x) => x.id === id);
      if (p) {
        await repo.updatePage(id, { favorite: p.favorite });
      }
    } catch {
      set(before);
    }
  },

  setSaveStatus: (patch) =>
    set((s) => ({
      saveStatus: patch.state ?? s.saveStatus,
      lastSavedAt: patch.lastSavedAt !== undefined ? patch.lastSavedAt : s.lastSavedAt,
    })),

  updatePageContent: async (id, content) => {
    const before = snapshotData(get);
    const now = Date.now();
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, content, updatedAt: now } : p)),
    }));
    try {
      await repo.updatePage(id, { content, updatedAt: now });
    } catch {
      set(before);
      throw new Error('persist_failed');
    }
  },

  attachPagePdf: async (pageId, filePath, fileName) => {
    const before = snapshotData(get);
    const now = Date.now();
    set((s) => ({
      pages: s.pages.map((p) =>
        p.id === pageId ? { ...p, pdfPath: filePath, pdfFileName: fileName, updatedAt: now } : p,
      ),
    }));
    try {
      await repo.replacePagePdfAttachment(pageId, filePath, fileName);
      await repo.updatePage(pageId, { updatedAt: now });
    } catch {
      set(before);
    }
  },

  setViewMode: async (mode) => {
    const before = { viewMode: get().viewMode };
    set({ viewMode: mode });
    try {
      await repo.setPreference(repo.PREF.viewMode, mode);
    } catch {
      set(before);
    }
  },
  openCommand: () => set({ commandOpen: true }),
  closeCommand: () => set({ commandOpen: false }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),
  openGraph: () => set({ graphOpen: true }),
  closeGraph: () => set({ graphOpen: false }),
  toggleGraph: () => set((s) => ({ graphOpen: !s.graphOpen })),
  toggleTweaks: () => set((s) => ({ tweaksOpen: !s.tweaksOpen })),
  toggleRightRail: async () => {
    const before = { rightRailOpen: get().rightRailOpen };
    set((s) => ({ rightRailOpen: !s.rightRailOpen }));
    try {
      await repo.setPreference(repo.PREF.rightRailOpen, get().rightRailOpen ? '1' : '0');
    } catch {
      set(before);
    }
  },

  setAccent: async (accent) => {
    const before = { accent: get().accent };
    set({ accent });
    try {
      await repo.setPreference(repo.PREF.accent, accent);
    } catch {
      set(before);
    }
  },
  setFontPair: async (fontPair) => {
    const before = { fontPair: get().fontPair };
    set({ fontPair });
    try {
      await repo.setPreference(repo.PREF.fontPair, fontPair);
    } catch {
      set(before);
    }
  },
  setLanguage: async (language) => {
    const before = { language: get().language };
    set({ language });
    try {
      await repo.setPreference(repo.PREF.language, language);
    } catch {
      set(before);
    }
  },
  setCitationFormat: async (citationFormat) => {
    const before = { citationFormat: get().citationFormat };
    set({ citationFormat });
    try {
      await repo.setPreference(repo.PREF.citationFormat, citationFormat);
    } catch {
      set(before);
    }
  },
  setAutoUpdatesEnabled: async (autoUpdatesEnabled) => {
    const before = { autoUpdatesEnabled: get().autoUpdatesEnabled };
    set({ autoUpdatesEnabled });
    try {
      await repo.setPreference(repo.PREF.autoUpdatesEnabled, autoUpdatesEnabled ? '1' : '0');
    } catch {
      set(before);
    }
  },
  completeOnboarding: async ({ language, accent, selectedAreaIds }) => {
    const prev = {
      dbReady: get().dbReady,
      onboardedAt: get().onboardedAt,
      language: get().language,
      accent: get().accent,
    };
    set({ dbReady: false });
    try {
      const now = Date.now().toString();
      if ((await repo.countSpaces()) === 0) {
        await ensureSeed({ selectedAreaIds, language });
      }
      await repo.setManyPreferences([
        [repo.PREF.language, language],
        [repo.PREF.accent, accent],
        [repo.PREF.onboardedAt, now],
      ]);
      const data = await repo.loadAppStateFromDb();
      set({ ...data, dbReady: true });
    } catch {
      set({ ...prev, dbReady: true });
    }
  },
  requestOnboardingAgain: async () => {
    const prev = { onboardedAt: get().onboardedAt };
    set({ onboardedAt: null });
    try {
      await repo.setPreference(repo.PREF.onboardedAt, '');
    } catch {
      set(prev);
    }
  },

  resetToSeed: async () => {
    const prev = {
      spaces: get().spaces,
      categories: get().categories,
      pages: get().pages,
      activeSpaceId: get().activeSpaceId,
      activeCategoryId: get().activeCategoryId,
      activePageId: get().activePageId,
      viewMode: get().viewMode,
      commandOpen: get().commandOpen,
      graphOpen: get().graphOpen,
      tweaksOpen: get().tweaksOpen,
      rightRailOpen: get().rightRailOpen,
      accent: get().accent,
      fontPair: get().fontPair,
      language: get().language,
      citationFormat: get().citationFormat,
      autoUpdatesEnabled: get().autoUpdatesEnabled,
      saveStatus: get().saveStatus,
      lastSavedAt: get().lastSavedAt,
    };
    set({ dbReady: false });
    try {
      await repo.clearAllData();
      await ensureSeed();
      const data = await repo.loadAppStateFromDb();
      set({ ...data, dbReady: true });
    } catch {
      set({ ...prev, dbReady: true });
    }
  },
}));

/* boot helpers (initDB + ensureSeed) — not on store to avoid Tauri in tests */
export async function initAppData(): Promise<void> {
  await initDB();
  await useApp.getState().loadStore();
}

/* Selectors (typed helpers) */
export const useActivePage = () => {
  const { pages, activePageId } = useApp();
  return pages.find((p) => p.id === activePageId) ?? null;
};

export const useActiveCategory = () => {
  const { categories, activeCategoryId } = useApp();
  return categories.find((c) => c.id === activeCategoryId) ?? null;
};

export const useActiveSpace = () => {
  const { spaces, activeSpaceId } = useApp();
  return spaces.find((s) => s.id === activeSpaceId) ?? null;
};
