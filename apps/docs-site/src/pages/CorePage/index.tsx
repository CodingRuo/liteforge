import { createComponent, use } from 'liteforge';
import { setToc } from '../../toc.js';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import {
  SIGNAL_CODE,
  COMPUTED_CODE,
  EFFECT_CODE,
  BATCH_CODE,
  COUNTER_CODE,
  FULLNAME_CODE,
} from './snippets.js';
import { getSignalApi, getComputedApi, getEffectApi } from './api.js';
import { CounterExample } from './CounterExample.js';
import { FullNameExample } from './FullNameExample.js';

export const CorePage = createComponent({
  name: 'CorePage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'how-it-works', label: () => t('core.howItWorks'),    level: 2 },
      { id: 'signal',       label: () => t('core.signal'),         level: 2 },
      { id: 'computed',     label: () => t('core.computed'),        level: 2 },
      { id: 'effect',       label: () => t('core.effect'),          level: 2 },
      { id: 'batch',        label: () => t('core.batch'),           level: 2 },
      { id: 'patterns',     label: () => t('core.patterns'),        level: 2 },
      { id: 'live',         label: () => t('core.liveExample'),     level: 2 },
    ]);
    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/core</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('core.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('core.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/core`} language="bash" />
          <CodeBlock code={`import { signal, computed, effect, batch } from 'liteforge';`} language="typescript" />
        </div>

        {/* Concepts */}
        <DocSection
          title={() => t('core.howItWorks')}
          id="how-it-works"
          description={() => t('core.howItWorksDesc')}
        />

        {/* signal() */}
        <DocSection
          title={() => t('core.signal')}
          id="signal"
          description={() => t('core.signalDesc')}
        >
          <div>
            <CodeBlock code={SIGNAL_CODE} language="typescript" />
            <ApiTable rows={() => getSignalApi(t)} />
          </div>
        </DocSection>

        {/* computed() */}
        <DocSection
          title={() => t('core.computed')}
          id="computed"
          description={() => t('core.computedDesc')}
        >
          <div>
            <CodeBlock code={COMPUTED_CODE} language="typescript" />
            <ApiTable rows={() => getComputedApi(t)} />
            <LiveExample
              title={() => t('core.computedTitle')}
              description={() => t('core.computedDescEx')}
              component={FullNameExample}
              code={FULLNAME_CODE}
            />
          </div>
        </DocSection>

        {/* effect() */}
        <DocSection
          title={() => t('core.effect')}
          id="effect"
          description={() => t('core.effectDesc')}
        >
          <div>
            <CodeBlock code={EFFECT_CODE} language="typescript" />
            <ApiTable rows={() => getEffectApi(t)} />
          </div>
        </DocSection>

        {/* batch() */}
        <DocSection
          title={() => t('core.batch')}
          id="batch"
          description={() => t('core.batchDesc')}
        >
          <CodeBlock code={BATCH_CODE} language="typescript" />
        </DocSection>

        {/* Live demo */}
        <DocSection title={() => t('core.liveExample')} id="live">
          <LiveExample
            title={() => t('core.liveTitle')}
            component={CounterExample}
            code={COUNTER_CODE}
          />
        </DocSection>

        {/* Patterns */}
        <DocSection title={() => t('core.patterns')} id="patterns">
          <div class="space-y-4 text-sm">
            <div class="p-4 border border-emerald-800/40 bg-emerald-950/20" style="border-radius: var(--lf-radius)">
              <p class="font-semibold text-emerald-300 mb-1">{() => t('core.patternDo')}</p>
              <p class="text-[var(--content-secondary)]">{() => t('core.patternDoDesc', { code: '{() => signal()}' })}</p>
            </div>
            <div class="p-4 border border-red-800/40 bg-red-950/20" style="border-radius: var(--lf-radius)">
              <p class="font-semibold text-red-300 mb-1">{() => t('core.patternDont')}</p>
              <p class="text-[var(--content-secondary)]">{() => t('core.patternDontDesc')}</p>
            </div>
          </div>
        </DocSection>
      </div>
    );
  },
});
