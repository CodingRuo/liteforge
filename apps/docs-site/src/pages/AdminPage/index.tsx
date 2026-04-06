import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  INSTALL_CODE,
  IMPORT_CODE,
  DEFINE_CODE,
  ROUTER_CODE,
  PLUGIN_CODE,
  HOOKS_CODE,
  CUSTOM_CELL_CODE,
  RELATION_CODE,
} from './snippets.js';
import { getDefineResourceApi, getFieldTypesApi, getPluginApi, getHooksApi } from './api.js';

export const AdminPage = createComponent({
  name: 'AdminPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'define-resource', label: () => t('admin.defineResource'),     level: 2 },
      { id: 'router',          label: () => t('admin.routerIntegration'),  level: 2 },
      { id: 'plugin',          label: () => t('admin.pluginSetup'),        level: 2 },
      { id: 'field-types',     label: () => t('admin.fieldTypes'),         level: 2 },
      { id: 'hooks',           label: () => t('admin.hooks'),              level: 2 },
      { id: 'custom',          label: () => t('admin.customCells'),        level: 2 },
      { id: 'relations',       label: () => t('admin.relations'),          level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[--content-muted] mb-1">@liteforge/admin</p>
          <h1 class="text-3xl font-bold text-[--content-primary] mb-2">{() => t('admin.title')}</h1>
          <p class="text-[--content-secondary] leading-relaxed max-w-xl">
            {() => t('admin.subtitle')}
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title={() => t('admin.defineResource')}
          id="define-resource"
          description={() => t('admin.defineResourceDesc')}
        >
          <CodeBlock code={DEFINE_CODE} language="typescript" />
          <ApiTable rows={() => getDefineResourceApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('admin.routerIntegration')}
          id="router"
          description={() => t('admin.routerIntegrationDesc')}
        >
          <CodeBlock code={ROUTER_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('admin.pluginSetup')}
          id="plugin"
          description={() => t('admin.pluginSetupDesc')}
        >
          <CodeBlock code={PLUGIN_CODE} language="typescript" />
          <ApiTable rows={() => getPluginApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('admin.fieldTypes')}
          id="field-types"
          description={() => t('admin.fieldTypesDesc')}
        >
          <ApiTable rows={() => getFieldTypesApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('admin.hooks')}
          id="hooks"
          description={() => t('admin.hooksDesc')}
        >
          <CodeBlock code={HOOKS_CODE} language="typescript" />
          <ApiTable rows={() => getHooksApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('admin.customCells')}
          id="custom"
          description={() => t('admin.customCellsDesc')}
        >
          <CodeBlock code={CUSTOM_CELL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('admin.relations')}
          id="relations"
          description={() => t('admin.relationsDesc')}
        >
          <CodeBlock code={RELATION_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});
