import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  MINIMAL_CODE,
  FULL_CODE,
  PLUGIN_CODE,
  USE_CODE,
  CONTEXT_CODE,
  STORES_CODE,
  DEBUG_CODE,
  THENABLE_CODE,
  DESTROY_CODE,
} from './snippets.js';
import {
  getCreateAppApi,
  getBuilderApi,
  getPluginApi,
  getPluginCtxApi,
  getAppApi,
} from './api.js';

export const AppPage = createComponent({
  name: 'AppPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'minimal',      label: () => t('app.minimal'),      level: 2 },
      { id: 'full',         label: () => t('app.full'),         level: 2 },
      { id: 'plugins',      label: () => t('app.plugins'),      level: 2 },
      { id: 'use',          label: () => t('app.use'),          level: 2 },
      { id: 'context',      label: () => t('app.context'),      level: 2 },
      { id: 'stores',       label: () => t('app.stores'),       level: 2 },
      { id: 'debug',        label: () => t('app.debug'),        level: 2 },
      { id: 'thenable',     label: () => t('app.thenable'),     level: 2 },
      { id: 'destroy',      label: () => t('app.unmount'),      level: 2 },
      { id: 'api',          label: () => t('app.apiOptions'),   level: 2 },
      { id: 'builder-api',  label: () => t('app.apiBuilder'),   level: 2 },
      { id: 'plugin-api',   label: () => t('app.apiPlugin'),    level: 2 },
      { id: 'plugin-ctx-api', label: () => t('app.apiCtx'),    level: 2 },
      { id: 'app-api',      label: () => t('app.apiApp'),       level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('app.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            <code class="text-indigo-400 text-sm">createApp()</code> {() => t('app.subtitlePre')}{' '}
            <code class="text-indigo-400 text-sm">Thenable</code> — {() => t('app.subtitleTopLevel')}{' '}
            <code class="text-indigo-400 text-sm">await</code> {() => t('app.subtitleMid')}{' '}
            <code class="text-indigo-400 text-sm">.mount()</code> {() => t('app.subtitleSuffix')}
          </p>
        </div>

        <DocSection title={() => t('app.minimal')} id="minimal">
          <CodeBlock code={MINIMAL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.full')} id="full"
          description={() => t('app.fullDesc')}>
          <CodeBlock code={FULL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.plugins')} id="plugins"
          description={() => t('app.pluginsDesc')}>
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.use')} id="use"
          description={() => t('app.useDesc')}>
          <CodeBlock code={USE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.context')} id="context"
          description={() => t('app.contextDesc')}>
          <CodeBlock code={CONTEXT_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.stores')} id="stores"
          description={() => t('app.storesDesc')}>
          <CodeBlock code={STORES_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.debug')} id="debug"
          description={() => t('app.debugDesc')}>
          <CodeBlock code={DEBUG_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.thenable')} id="thenable"
          description={() => t('app.thenableDesc')}>
          <CodeBlock code={THENABLE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.unmount')} id="destroy"
          description={() => t('app.unmountDesc')}>
          <CodeBlock code={DESTROY_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('app.apiOptions')} id="api">
          <ApiTable rows={() => getCreateAppApi(t)} />
        </DocSection>

        <DocSection title={() => t('app.apiBuilder')} id="builder-api">
          <ApiTable rows={() => getBuilderApi(t)} />
        </DocSection>

        <DocSection title={() => t('app.apiPlugin')} id="plugin-api">
          <ApiTable rows={() => getPluginApi(t)} />
        </DocSection>

        <DocSection title={() => t('app.apiCtx')} id="plugin-ctx-api">
          <ApiTable rows={() => getPluginCtxApi(t)} />
        </DocSection>

        <DocSection title={() => t('app.apiApp')} id="app-api">
          <ApiTable rows={() => getAppApi(t)} />
        </DocSection>
      </div>
    );
  },
});
