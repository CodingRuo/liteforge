import type { ApiRow } from '../../components/ApiTable.js';

export const getQueryApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'key', type: 'string | unknown[] | () => unknown[]', description: t('query.apiKey') },
  { name: 'fn', type: '() => Promise<T>', description: t('query.apiFn') },
  { name: 'staleTime', type: 'number', default: '0', description: t('query.apiStaleTime') },
  { name: 'enabled', type: 'boolean | () => boolean', default: 'true', description: t('query.apiEnabled') },
];

export const getMutationApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'fn', type: '(variables: TVariables) => Promise<TData>', description: t('query.apiMutationFn') },
  { name: 'invalidate', type: 'string[]', default: '[]', description: t('query.apiInvalidate') },
];
