import type { ApiRow } from '../../components/ApiTable.js';

export const getRouteApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'path', type: 'string', description: t('router.apiPath') },
  { name: 'component', type: 'ComponentFactory | () => Promise', description: t('router.apiComponent') },
  { name: 'export', type: 'string', description: t('router.apiExport') },
  { name: 'guard', type: 'RouteGuard | RouteGuard[]', description: t('router.apiGuard') },
  { name: 'children', type: 'RouteDefinition[]', description: t('router.apiChildren') },
  { name: 'meta', type: 'Record<string, unknown>', description: t('router.apiMeta') },
  { name: 'loading', type: '() => Node', description: t('router.apiLoading') },
  { name: 'lazy', type: '{ delay?, timeout? }', description: t('router.apiLazy') },
];
