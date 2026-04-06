import type { ApiRow } from '../../components/ApiTable.js'

export const getClientApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'baseUrl', type: 'string', description: t('client.apiBaseUrl') },
  { name: 'headers', type: 'Record<string, string>', default: '{}', description: t('client.apiHeaders') },
  { name: 'timeout', type: 'number', default: '30000', description: t('client.apiTimeout') },
  { name: 'retry', type: 'number', default: '0', description: t('client.apiRetry') },
  { name: 'query', type: '{ createQuery, createMutation }', default: 'undefined', description: t('client.apiQuery') },
]
