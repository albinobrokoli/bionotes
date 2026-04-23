import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useApp, ACCENT_MAP, type AccentKey, type FontPair, type Language } from '../store/app';
import { LucideIcons } from '../lib/icons';
import type { CitationFormat } from '../services/bibliography';
import './TweaksPanel.css';

const { Settings, X } = LucideIcons;

const ACCENT_ORDER: AccentKey[] = ['green', 'blue', 'purple', 'amber', 'pink'];
const FONT_ORDER: FontPair[] = ['inter-mono', 'system', 'humanist'];
const LANGS: Language[] = ['tr', 'en'];
const CITATION_FORMATS: CitationFormat[] = ['apa', 'mla', 'vancouver'];

export function TweaksPanel() {
  const { t, i18n } = useTranslation();
  const {
    tweaksOpen,
    toggleTweaks,
    accent,
    setAccent,
    fontPair,
    setFontPair,
    language,
    setLanguage,
    citationFormat,
    setCitationFormat,
    autoUpdatesEnabled,
    setAutoUpdatesEnabled,
  } = useApp();

  if (!tweaksOpen) {
    return (
      <button
        type="button"
        className="tweaks tweaks--collapsed tweaks__toggle-btn"
        onClick={toggleTweaks}
      >
        <Settings size={12} />
        {t('tweaks.open')}
      </button>
    );
  }

  return (
    <div className="tweaks" role="dialog" aria-label={t('tweaks.title')}>
      <div className="tweaks__header">
        <div className="tweaks__title">{t('tweaks.title')}</div>
        <button
          type="button"
          className="tweaks__close"
          onClick={toggleTweaks}
          aria-label={t('tweaks.close')}
        >
          <X size={14} />
        </button>
      </div>

      <div className="tweaks__row">
        <div className="tweaks__label">{t('tweaks.accent')}</div>
        <div className="tweaks__accents">
          {ACCENT_ORDER.map((key) => (
            <button
              type="button"
              key={key}
              className={clsx('tweaks__swatch', accent === key && 'is-active')}
              style={{ backgroundColor: ACCENT_MAP[key].hex }}
              onClick={() => void setAccent(key)}
              title={t(`accents.${key}`)}
              aria-label={t(`accents.${key}`)}
            />
          ))}
        </div>
      </div>

      <div className="tweaks__row">
        <div className="tweaks__label">{t('tweaks.font')}</div>
        <div className="tweaks__segmented">
          {FONT_ORDER.map((f) => (
            <button
              type="button"
              key={f}
              className={clsx(fontPair === f && 'is-active')}
              onClick={() => void setFontPair(f)}
            >
              {t(`tweaks.fonts.${f}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="tweaks__row">
        <div className="tweaks__label">{t('tweaks.language')}</div>
        <div className="tweaks__lang">
          {LANGS.map((lang) => (
            <button
              type="button"
              key={lang}
              className={clsx(language === lang && 'is-active')}
              onClick={() => {
                void setLanguage(lang);
                void i18n.changeLanguage(lang);
              }}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="tweaks__row">
        <div className="tweaks__label">{t('tweaks.citationFormat')}</div>
        <div className="tweaks__segmented">
          {CITATION_FORMATS.map((format) => (
            <button
              type="button"
              key={format}
              className={clsx(citationFormat === format && 'is-active')}
              onClick={() => void setCitationFormat(format)}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="tweaks__row tweaks__row--toggle">
        <div className="tweaks__label">{t('tweaks.autoUpdates')}</div>
        <label className="tweaks__switch">
          <input
            type="checkbox"
            checked={autoUpdatesEnabled}
            onChange={(event) => void setAutoUpdatesEnabled(event.target.checked)}
          />
          <span>{autoUpdatesEnabled ? t('tweaks.on') : t('tweaks.off')}</span>
        </label>
      </div>
    </div>
  );
}
