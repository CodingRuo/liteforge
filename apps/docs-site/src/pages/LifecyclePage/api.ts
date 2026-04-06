import type { ApiRow } from '../../components/ApiTable.js';

export const getHooksApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'setup({ props, use })', type: 'object', description: t('lifecycle.apiSetup') },
  { name: 'load({ props, setup, use })', type: 'Promise<object>', description: t('lifecycle.apiLoad') },
  { name: 'placeholder()', type: 'Node', description: t('lifecycle.apiPlaceholder') },
  { name: 'error({ error, retry })', type: 'Node', description: t('lifecycle.apiError') },
  { name: 'component({ props, setup, data })', type: 'Node', description: t('lifecycle.apiComponent') },
  { name: 'mounted({ el })', type: 'void', description: t('lifecycle.apiMounted') },
  { name: 'destroyed()', type: 'void', description: t('lifecycle.apiDestroyed') },
];

export const getUtilsApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'onCleanup(fn)', type: 'void', description: t('lifecycle.apiOnCleanup') },
];
