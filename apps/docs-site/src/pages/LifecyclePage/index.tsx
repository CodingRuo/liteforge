import { createComponent } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import { FULL_CODE, ONCLEANUP_CODE, TOOLTIP_CLEANUP_CODE, DIFF_CODE } from './snippets.js';
import { getHooksApi, getUtilsApi } from './api.js';
import { LifecycleExample } from './LifecycleExample.js';
import { LifecycleDiagram } from './LifecycleDiagram.js';

export const LifecyclePage = createComponent({
  name: 'LifecyclePage',
  component({ use }) {
    const { t } = use('i18n');

    setToc([
      { id: 'diagram',         label: () => t('lifecycle.diagram'),        level: 2 },
      { id: 'full',            label: () => t('lifecycle.fullExample'),    level: 2 },
      { id: 'demo',            label: () => t('lifecycle.demo'),           level: 2 },
      { id: 'oncleanup',       label: () => t('lifecycle.onCleanup'),      level: 2 },
      { id: 'tooltip-cleanup', label: () => t('lifecycle.tooltipCleanup'), level: 3 },
      { id: 'diff',            label: () => t('lifecycle.cleanupVsDestroyed'), level: 2 },
      { id: 'api',             label: () => t('lifecycle.hooks'),          level: 2 },
      { id: 'utils-api',       label: () => t('lifecycle.utils'),          level: 3 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('lifecycle.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('lifecycle.subtitle')}
          </p>
        </div>

        <DocSection title={() => t('lifecycle.diagram')} id="diagram">
          {LifecycleDiagram({})}
        </DocSection>

        <DocSection title={() => t('lifecycle.fullExample')} id="full" description={() => t('lifecycle.fullExampleDesc')}>
          <CodeBlock code={FULL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('lifecycle.demo')} id="demo" description={() => t('lifecycle.demoDesc')}>
          <LiveExample
            title={() => t('lifecycle.liveTitle')}
            code={`mounted()  → attached\nonCleanup() → effect re-ran\ndestroyed() → removed`}
            component={LifecycleExample}
          />
        </DocSection>

        <DocSection title={() => t('lifecycle.onCleanup')} id="oncleanup"
          description={() => t('lifecycle.onCleanupDesc')}>
          <CodeBlock code={ONCLEANUP_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('lifecycle.tooltipCleanup')} id="tooltip-cleanup"
          description={() => t('lifecycle.tooltipCleanupDesc')}>
          <CodeBlock code={TOOLTIP_CLEANUP_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('lifecycle.cleanupVsDestroyed')} id="diff"
          description={() => t('lifecycle.cleanupVsDestroyedDesc')}>
          <CodeBlock code={DIFF_CODE} language="typescript" />
          <div class="mt-3 overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="border-b border-[var(--line-default)]">
                  <th class="text-left py-2 pr-4 text-[var(--content-muted)] font-medium">Hook</th>
                  <th class="text-left py-2 pr-4 text-[var(--content-muted)] font-medium">Scope</th>
                  <th class="text-left py-2 text-[var(--content-muted)] font-medium">Runs when</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-[var(--line-default)]/50">
                  <td class="py-2 pr-4 font-mono text-xs text-indigo-400">onCleanup()</td>
                  <td class="py-2 pr-4 text-[var(--content-secondary)]">Effect</td>
                  <td class="py-2 text-[var(--content-secondary)]">Before each effect re-run + on unmount</td>
                </tr>
                <tr>
                  <td class="py-2 pr-4 font-mono text-xs text-indigo-400">destroyed()</td>
                  <td class="py-2 pr-4 text-[var(--content-secondary)]">Component</td>
                  <td class="py-2 text-[var(--content-secondary)]">Once, when component is removed from DOM</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DocSection>

        <DocSection title={() => t('lifecycle.hooks')} id="api">
          <ApiTable rows={() => getHooksApi(t)} />
        </DocSection>

        <DocSection title={() => t('lifecycle.utils')} id="utils-api">
          <ApiTable rows={() => getUtilsApi(t)} />
        </DocSection>
      </div>
    );
  },
});
