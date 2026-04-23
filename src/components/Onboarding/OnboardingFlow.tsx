import { useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { AccentKey, Language } from '../../store/app';
import { ACCENT_MAP } from '../../store/app';
import {
  ONBOARDING_AREA_DEFS,
  ONBOARDING_DEFAULT_ACCENT,
  type OnboardingAreaId,
} from '../../data/onboarding';
import './OnboardingFlow.css';

type Props = {
  initialLanguage: Language;
  initialAccent: AccentKey;
  onFinish: (payload: {
    language: Language;
    accent: AccentKey;
    selectedAreaIds: OnboardingAreaId[];
  }) => Promise<void> | void;
};

const TOTAL_STEPS = 4;
const DEFAULT_AREA_IDS: OnboardingAreaId[] = [
  'neurobiology',
  'molecular-biology',
  'cell-biology',
  'ecology',
];

export function OnboardingFlow({ initialLanguage, initialAccent, onFinish }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [accent, setAccent] = useState<AccentKey>(initialAccent || ONBOARDING_DEFAULT_ACCENT);
  const [selectedAreas, setSelectedAreas] = useState<OnboardingAreaId[]>(DEFAULT_AREA_IDS);
  const [submitting, setSubmitting] = useState(false);

  const canGoBack = step > 1;
  const isLastStep = step === TOTAL_STEPS;
  const selectedSet = useMemo(() => new Set(selectedAreas), [selectedAreas]);

  const toggleArea = (id: OnboardingAreaId) => {
    setSelectedAreas((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const finalAreas = selectedAreas.length > 0 ? selectedAreas : DEFAULT_AREA_IDS;
      await onFinish({ language, accent, selectedAreaIds: finalAreas });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onb__overlay" role="dialog" aria-modal="true" aria-label={t('onboarding.title')}>
      <div className="onb__card">
        <button
          type="button"
          className="onb__skip"
          onClick={() => {
            if (!submitting) void submit();
          }}
          disabled={submitting}
        >
          {t('onboarding.skip')}
        </button>
        <div className="onb__header">
          <h1>{t('onboarding.title')}</h1>
          <p>{t('onboarding.subtitle')}</p>
        </div>

        <div className="onb__content">
          {step === 1 ? (
            <section className="onb__step">
              <h2>{t('onboarding.steps.welcome.title')}</h2>
              <p>{t('onboarding.steps.welcome.body')}</p>
              <ul>
                <li>{t('onboarding.steps.welcome.bullets.localFirst')}</li>
                <li>{t('onboarding.steps.welcome.bullets.science')}</li>
                <li>{t('onboarding.steps.welcome.bullets.free')}</li>
              </ul>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="onb__step">
              <h2>{t('onboarding.steps.preferences.title')}</h2>
              <p>{t('onboarding.steps.preferences.body')}</p>
              <div className="onb__group">
                <div className="onb__group-title">{t('onboarding.steps.preferences.language')}</div>
                <div className="onb__row">
                  {(['tr', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={clsx('onb__chip', language === lang && 'is-active')}
                      onClick={() => setLanguage(lang)}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="onb__group">
                <div className="onb__group-title">{t('onboarding.steps.preferences.accent')}</div>
                <div className="onb__row">
                  {(Object.keys(ACCENT_MAP) as AccentKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={clsx('onb__swatch', accent === key && 'is-active')}
                      style={{ '--swatch-color': ACCENT_MAP[key].hex } as CSSProperties}
                      onClick={() => setAccent(key)}
                      aria-label={t(`accents.${key}`)}
                      title={t(`accents.${key}`)}
                    />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="onb__step">
              <h2>{t('onboarding.steps.areas.title')}</h2>
              <p>{t('onboarding.steps.areas.body')}</p>
              <div className="onb__check-grid">
                {ONBOARDING_AREA_DEFS.map((area) => (
                  <label key={area.id} className="onb__check-item">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(area.id)}
                      onChange={() => toggleArea(area.id)}
                    />
                    <span>{area.labels[language]}</span>
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="onb__step">
              <h2>{t('onboarding.steps.shortcuts.title')}</h2>
              <p>{t('onboarding.steps.shortcuts.body')}</p>
              <div className="onb__shortcut-list">
                <div>
                  <kbd>⌘K</kbd> <span>{t('onboarding.steps.shortcuts.command')}</span>
                </div>
                <div>
                  <kbd>/</kbd> <span>{t('onboarding.steps.shortcuts.slash')}</span>
                </div>
                <div>
                  <kbd>[[</kbd> <span>{t('onboarding.steps.shortcuts.wikilink')}</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <div className="onb__footer">
          <div className="onb__dots" aria-label={t('onboarding.progress')}>
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
              <span key={idx} className={clsx('onb__dot', step === idx + 1 && 'is-active')} />
            ))}
          </div>
          <div className="onb__actions">
            <button
              type="button"
              className="onb__btn onb__btn--ghost"
              disabled={!canGoBack || submitting}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              {t('onboarding.prev')}
            </button>
            {!isLastStep ? (
              <button
                type="button"
                className="onb__btn onb__btn--primary"
                onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
              >
                {step === 1 ? t('onboarding.start') : t('onboarding.next')}
              </button>
            ) : (
              <button
                type="button"
                className="onb__btn onb__btn--primary"
                onClick={() => {
                  if (!submitting) void submit();
                }}
                disabled={submitting}
              >
                {t('onboarding.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
