/**
 * i18n Demo Page — demonstrates @liteforge/i18n
 *
 * Features shown:
 * - signal-based locale switching (no re-render, fine-grained updates)
 * - Interpolation: {name}, {locale}
 * - Pluralization: 2-part (singular|plural) and 3-part (zero|one|many)
 * - Dot-notation nested keys
 * - Fallback locale (key missing in 'de' → falls back to 'en')
 * - localStorage persistence (survives page reload)
 */

import { createComponent, signal } from 'liteforge';
import { useTitle } from 'liteforge/router';
import type { I18nApi } from 'liteforge/i18n';

export const I18nPage = createComponent({
  name: 'I18nPage',

  setup({ use }) {
    useTitle('i18n Demo');
    const i18n = use<I18nApi>('i18n');
    const itemCount = signal(0);
    const userName = signal('World');
    return { i18n, itemCount, userName };
  },

  component({ setup }) {
    const { i18n, itemCount, userName } = setup;
    const { t, locale, setLocale } = i18n;

    const switchLocale = async (next: string) => {
      await setLocale(next);
    };

    return (
      <div class="i18n-page">
        <h1>{() => t('welcome')}</h1>
        <p class="page-description">{() => t('description')}</p>

        {/* ── Locale Switcher ─────────────────────────────────────────── */}
        <section class="demo-section">
          <h2>Locale Switcher</h2>
          <p class="demo-description">
            {() => t('currentLocale', { locale: locale() })}
          </p>
          <div class="demo-row">
            <button
              type="button"
              class={() => `demo-btn ${locale() === 'en' ? 'demo-btn--primary' : ''}`}
              onclick={() => switchLocale('en')}
            >
              🇬🇧 English
            </button>
            <button
              type="button"
              class={() => `demo-btn ${locale() === 'de' ? 'demo-btn--primary' : ''}`}
              onclick={() => switchLocale('de')}
            >
              🇩🇪 Deutsch
            </button>
          </div>
        </section>

        {/* ── Interpolation ───────────────────────────────────────────── */}
        <section class="demo-section">
          <h2>Interpolation</h2>
          <p class="demo-description">
            {'t(\'greeting\', { name }) → '}
            <strong>{() => t('greeting', { name: userName() })}</strong>
          </p>
          <div class="demo-row">
            <input
              class="demo-input"
              type="text"
              placeholder="Your name"
              value={() => userName()}
              oninput={(e: Event) => userName.set((e.target as HTMLInputElement).value)}
            />
          </div>
        </section>

        {/* ── Pluralization ───────────────────────────────────────────── */}
        <section class="demo-section">
          <h2>Pluralization</h2>
          <p class="demo-description">
            2-part (singular|plural): <strong>{() => t('counter.value', { count: itemCount() }, itemCount())}</strong>
          </p>
          <p class="demo-description">
            3-part (zero|one|many): <strong>{() => t('counter.zero', { count: itemCount() }, itemCount())}</strong>
          </p>
          <div class="demo-row">
            <button
              type="button"
              class="demo-btn"
              onclick={() => itemCount.update(n => Math.max(0, n - 1))}
            >
              −
            </button>
            <span class="counter-value">{() => itemCount()}</span>
            <button
              type="button"
              class="demo-btn"
              onclick={() => itemCount.update(n => n + 1)}
            >
              +
            </button>
          </div>
        </section>

        {/* ── Dot-Notation ────────────────────────────────────────────── */}
        <section class="demo-section">
          <h2>{() => t('dotNotation.title')}</h2>
          <p class="demo-description">{() => t('dotNotation.description')}</p>
          <div class="demo-status">
            <code>t('dotNotation.deep.nested.key')</code>
            {' → '}
            <strong>{() => t('dotNotation.deep.nested.key')}</strong>
          </div>
        </section>

        {/* ── Fallback Locale ─────────────────────────────────────────── */}
        <section class="demo-section">
          <h2>{() => t('fallback.title')}</h2>
          <p class="demo-description">{() => t('fallback.description')}</p>
          <div class="demo-status">
            <code>t('fallback.onlyInFallback')</code>
            {' → '}
            <strong>{() => t('fallback.onlyInFallback')}</strong>
          </div>
          <p class="demo-hint">
            Switch to Deutsch above — this key is missing in <code>de</code>, so it falls back to <code>en</code>.
          </p>
        </section>

        <style>{`
          .i18n-page {
            padding: 20px;
          }

          .i18n-page h1 {
            margin: 0 0 8px;
            font-size: 24px;
            color: #1e293b;
          }

          [data-theme="dark"] .i18n-page h1 {
            color: #cdd6f4;
          }

          .page-description {
            color: #64748b;
            margin: 0 0 32px;
            font-size: 14px;
          }

          .demo-section {
            margin-bottom: 32px;
            padding: 24px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #fff;
          }

          [data-theme="dark"] .demo-section {
            border-color: #313244;
            background: #1e1e2e;
          }

          .demo-section h2 {
            margin: 0 0 6px;
            font-size: 18px;
            color: #1e293b;
          }

          [data-theme="dark"] .demo-section h2 {
            color: #cdd6f4;
          }

          .demo-description {
            color: #64748b;
            margin: 0 0 16px;
            font-size: 14px;
          }

          .demo-row {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
          }

          .demo-btn {
            padding: 8px 16px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            background: #f8fafc;
            color: #374151;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.15s;
          }

          .demo-btn:hover {
            background: #f1f5f9;
          }

          [data-theme="dark"] .demo-btn {
            background: #313244;
            border-color: #45475a;
            color: #cdd6f4;
          }

          [data-theme="dark"] .demo-btn:hover {
            background: #45475a;
          }

          .demo-btn--primary {
            background: #3b82f6;
            border-color: #3b82f6;
            color: #fff;
          }

          .demo-btn--primary:hover {
            background: #2563eb;
            border-color: #2563eb;
          }

          .counter-value {
            display: inline-block;
            min-width: 32px;
            text-align: center;
            font-size: 20px;
            font-weight: 600;
            color: #1e293b;
          }

          [data-theme="dark"] .counter-value {
            color: #cdd6f4;
          }

          .demo-status {
            font-size: 13px;
            color: #64748b;
            padding: 10px 14px;
            background: #f8fafc;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
            margin-bottom: 8px;
          }

          [data-theme="dark"] .demo-status {
            background: #181825;
            border-color: #313244;
            color: #a6adc8;
          }

          .demo-hint {
            font-size: 12px;
            color: #94a3b8;
            margin: 8px 0 0;
          }

          .demo-input {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            background: #fff;
            color: #1e293b;
            min-width: 200px;
          }

          [data-theme="dark"] .demo-input {
            background: #313244;
            border-color: #45475a;
            color: #cdd6f4;
          }
        `}</style>
      </div>
    );
  },
});
