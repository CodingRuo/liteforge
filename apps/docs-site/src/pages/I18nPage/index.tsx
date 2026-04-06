import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  INSTALL_CODE,
  IMPORT_CODE,
  PLUGIN_CODE,
  USE_CODE,
  INTERPOLATION_CODE,
  PLURAL_CODE,
  PLURAL_DETAIL_CODE,
  FALLBACK_CODE,
  FALLBACK_DETAIL_CODE,
  LOCALE_FILE_CODE,
  LIVE_CODE,
  DEFINE_LOCALE_CODE,
} from './snippets.js';
import { getOptionsApi, getApiApi } from './api.js';
import { I18nExample } from './I18nExample.js';

export const I18nPage = createComponent({
  name: 'I18nPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'setup',               label: () => t('i18n.setup'),          level: 2 },
      { id: 'usage',               label: () => t('i18n.usage'),          level: 2 },
      { id: 'locale-files',        label: () => t('i18n.localeFiles'),    level: 2 },
      { id: 'add-locale',          label: () => t('i18n.addLocale'),      level: 2 },
      { id: 'interpolation',       label: () => t('i18n.interpolation'),  level: 2 },
      { id: 'pluralization-detail', label: () => t('i18n.pluralization'), level: 2 },
      { id: 'fallback-detail',     label: () => t('i18n.fallback'),       level: 2 },
      { id: 'live',                label: () => t('i18n.live'),           level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[--content-muted] mb-1">@liteforge/i18n</p>
          <h1 class="text-3xl font-bold text-[--content-primary] mb-2">{() => t('i18n.title')}</h1>
          <p class="text-[--content-secondary] leading-relaxed max-w-xl">
            {() => t('i18n.subtitlePre')} <code class="text-xs font-mono">t()</code> {() => t('i18n.subtitleSuffix')}
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title={() => t('i18n.setup')}
          id="setup"
          description={() => t('i18n.setupDesc')}
        >
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
          <ApiTable rows={() => getOptionsApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('i18n.usage')}
          id="usage"
          description={() => t('i18n.usageDesc')}
        >
          <CodeBlock code={USE_CODE} language="typescript" />
          <ApiTable rows={() => getApiApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('i18n.localeFiles')}
          id="locale-files"
          description={() => t('i18n.localeFilesDesc')}
        >
          <CodeBlock code={LOCALE_FILE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.addLocale')}
          id="add-locale"
          description={() => t('i18n.addLocaleDesc')}
        >
          <CodeBlock code={DEFINE_LOCALE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.plural')}
          id="pluralization"
          description={() => t('i18n.pluralDesc')}
        >
          <CodeBlock code={PLURAL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.fallback')}
          id="fallback"
          description={() => t('i18n.fallbackDesc')}
        >
          <CodeBlock code={FALLBACK_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.interpolation')}
          id="interpolation"
          description={() => t('i18n.interpolationDesc')}
        >
          <CodeBlock code={INTERPOLATION_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.pluralization')}
          id="pluralization-detail"
          description={() => t('i18n.pluralizationDesc')}
        >
          <CodeBlock code={PLURAL_DETAIL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('i18n.fallback')}
          id="fallback-detail"
          description={() => t('i18n.fallbackDesc')}
        >
          <CodeBlock code={FALLBACK_DETAIL_CODE} language="typescript" />
        </DocSection>

        <div class="mt-8 p-4 border border-[var(--line-default)] bg-[var(--surface-raised)]/50" style="border-radius: var(--lf-radius)">
          <p class="text-xs font-semibold text-[var(--content-secondary)] uppercase tracking-wider mb-2">{() => t('i18n.vsParaglide')}</p>
          <p class="text-sm text-[var(--content-muted)]">{() => t('i18n.vsParaglideDesc')}</p>
        </div>

        <DocSection
          title={() => t('i18n.live')}
          id="live"
          description={() => t('i18n.liveDesc')}
        >
          <LiveExample
            title={() => t('i18n.liveTitle')}
            component={I18nExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
