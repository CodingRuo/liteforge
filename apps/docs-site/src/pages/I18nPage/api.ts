import type { ApiRow } from '../../components/ApiTable.js'

export const getOptionsApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'default',       type: 'T',                                             description: t('i18n.apiDefault') },
  { name: 'fallback',      type: 'string',                        default: '—',   description: t('i18n.apiFallbackLocale') },
  { name: 'localesDir',    type: 'string',                        default: '—',   description: t('i18n.apiLocalesDir') },
  { name: 'load',          type: '(locale: string) => Promise<T>', default: '—',  description: t('i18n.apiLoad') },
  { name: 'persist',       type: 'boolean',                       default: 'true', description: t('i18n.apiPersist') },
  { name: 'storageKey',    type: 'string',                        default: "'lf-locale'", description: t('i18n.apiStorageKey') },
]

export const getApiApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'locale()',             type: '() => string',                    description: t('i18n.apiLocale') },
  { name: 'setLocale(locale)',    type: '(locale: string) => Promise<void>', description: t('i18n.apiSetLocale') },
  { name: 't(key, params?, count?)', type: 'string',                       description: t('i18n.apiT') },
]
