import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp, ACCENT_MAP, initAppData, useActivePage } from './store/app';
import { flushPendingSaves } from './hooks/useDebouncedSave';
import { Sidebar } from './components/Sidebar';
import { Breadcrumb } from './components/Breadcrumb';
import { EditorArea } from './components/EditorArea';
import { PdfViewer } from './components/PdfViewer';
import { SplitView } from './components/SplitView';
import { PreviewPane } from './components/PreviewPane';
import { useViewportMinWidth } from './hooks/useViewportMinWidth';
import { CommandPalette } from './components/CommandPalette';
import { TweaksPanel } from './components/TweaksPanel';
import { RightRail } from './components/RightRail';
import { BibliographyExport } from './components/BibliographyExport';
import { ExportDialog } from './components/ExportDialog';
import { GraphView } from './views/GraphView';
import { AboutDialog } from './components/AboutDialog';
import { UpdateBanner } from './components/UpdateBanner';
import { OnboardingFlow } from './components/Onboarding/OnboardingFlow';
import {
  checkForUpdates,
  configureUpdater,
  getUpdaterState,
  subscribeUpdaterState,
  type UpdaterState,
} from './services/updater';
import './App.css';

function App() {
  const { i18n } = useTranslation();
  const {
    accent,
    fontPair,
    language,
    toggleCommand,
    closeCommand,
    commandOpen,
    dbReady,
    activePageId,
    viewMode,
    graphOpen,
    openGraph,
    closeGraph,
    toggleGraph,
    autoUpdatesEnabled,
    onboardedAt,
    completeOnboarding,
    requestOnboardingAgain,
  } = useApp();
  const activePage = useActivePage();
  const splitWide = useViewportMinWidth(960);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bibliographyOpen, setBibliographyOpen] = useState(false);
  const [notebookLmOpen, setNotebookLmOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [updaterState, setUpdaterState] = useState<UpdaterState>(() => getUpdaterState());
  /** PDF ekli sayfada: PDF görünümü mü editör mü (geçici geçiş). */
  const [pdfUiTab, setPdfUiTab] = useState<'pdf' | 'editor'>('pdf');

  useEffect(() => {
    setPdfUiTab(viewMode === 'split' ? 'editor' : 'pdf');
  }, [activePageId, viewMode]);

  useEffect(() => {
    void (async () => {
      try {
        await initAppData();
      } catch (e) {
        setBootError(e instanceof Error ? e.message : 'Veritabanı başlatılamadı');
      }
    })();
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', flushPendingSaves);
    return () => window.removeEventListener('beforeunload', flushPendingSaves);
  }, []);

  useEffect(() => subscribeUpdaterState(setUpdaterState), []);

  useEffect(() => {
    configureUpdater(autoUpdatesEnabled);
    if (!autoUpdatesEnabled) return;
    void checkForUpdates();
  }, [autoUpdatesEnabled]);

  /* Keep i18next in sync with the persisted language preference. */
  useEffect(() => {
    if (i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  /* Apply accent color to CSS variables. */
  useEffect(() => {
    const def = ACCENT_MAP[accent];
    const root = document.documentElement;
    root.style.setProperty('--accent', def.hex);
    root.style.setProperty('--accent-soft', def.soft);
    root.style.setProperty('--accent-line', def.line);
  }, [accent]);

  /* Apply font pair via data attribute. */
  useEffect(() => {
    document.documentElement.setAttribute('data-font', fontPair);
  }, [fontPair]);

  /* Global keyboard shortcuts: Cmd/Ctrl+K → toggle palette, G → graph, Esc → close. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingOnInput =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox');
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      } else if (!typingOnInput && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        toggleGraph();
      } else if (e.key === 'Escape' && commandOpen) {
        e.preventDefault();
        closeCommand();
      } else if (e.key === 'Escape' && graphOpen) {
        e.preventDefault();
        closeGraph();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCommand, toggleGraph, closeCommand, commandOpen, graphOpen, closeGraph]);

  if (bootError) {
    return (
      <div className="app-splash app-splash--error">
        <p>{bootError}</p>
      </div>
    );
  }
  if (!dbReady) {
    return (
      <div className="app-splash" aria-busy>
        <div className="app-splash__inner">
          <div className="app-splash__logo">BioNotes</div>
          <p className="app-splash__msg">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!onboardedAt) {
    return (
      <OnboardingFlow
        initialLanguage={language}
        initialAccent={accent}
        onFinish={async ({ language: nextLanguage, accent: nextAccent, selectedAreaIds }) => {
          await completeOnboarding({
            language: nextLanguage,
            accent: nextAccent,
            selectedAreaIds,
          });
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {updaterState.update ? <UpdateBanner update={updaterState.update} /> : null}
        <Breadcrumb
          pdfUiTab={pdfUiTab}
          onPdfUiTab={setPdfUiTab}
          splitSideBySide={viewMode === 'split' && !!activePage?.pdfPath && splitWide}
        />
        {viewMode === 'split' ? (
          activePage?.pdfPath && splitWide ? (
            <SplitView filePath={activePage.pdfPath} displayName={activePage.pdfFileName ?? 'PDF'} />
          ) : (
            <div className="app-main__split-fallback">
              <EditorArea />
              <PreviewPane />
            </div>
          )
        ) : viewMode === 'preview' ? (
          <PreviewPane />
        ) : activePage?.pdfPath && pdfUiTab === 'pdf' ? (
          <PdfViewer filePath={activePage.pdfPath} displayName={activePage.pdfFileName ?? 'PDF'} pageId={activePage.id} />
        ) : (
          <EditorArea />
        )}
      </main>
      <RightRail />
      <CommandPalette
        onOpenBibliographyExport={() => setBibliographyOpen(true)}
        onOpenNotebookLmExport={() => setNotebookLmOpen(true)}
        onOpenGraphView={() => openGraph()}
        onOpenAbout={() => setAboutOpen(true)}
        onShowOnboardingAgain={() => void requestOnboardingAgain()}
      />
      <BibliographyExport open={bibliographyOpen} onClose={() => setBibliographyOpen(false)} />
      <ExportDialog open={notebookLmOpen} onClose={() => setNotebookLmOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <GraphView open={graphOpen} onClose={closeGraph} />
      <TweaksPanel />
    </div>
  );
}

export default App;
