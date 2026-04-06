import type { ApiRow } from '../../components/ApiTable.js';

export const getComponentApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'name', type: 'string', description: t('runtime.apiName') },
  { name: 'component(args)', type: 'Node', description: t('runtime.apiComponent') },
  { name: 'setup(args)', type: 'object', description: t('runtime.apiSetup') },
  { name: 'load(args)', type: 'Promise<object>', description: t('runtime.apiLoad') },
  { name: 'placeholder()', type: 'Node', description: t('runtime.apiPlaceholder') },
  { name: 'error(args)', type: 'Node', description: t('runtime.apiError') },
  { name: 'mounted({ el })', type: 'void', description: t('runtime.apiMounted') },
  { name: 'destroyed()', type: 'void', description: t('runtime.apiDestroyed') },
];
