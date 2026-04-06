import type { ApiRow } from '../../components/ApiTable.js'

export const getConfigApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'shortcut', type: 'string', default: "'ctrl+shift+d'", description: t('devtools.apiShortcut') },
  { name: 'position', type: "'right' | 'bottom' | 'floating'", default: "'right'", description: t('devtools.apiPosition') },
  { name: 'defaultTab', type: "'signals' | 'stores' | 'router' | 'components' | 'performance'", default: "'signals'", description: t('devtools.apiDefaultTab') },
  { name: 'width', type: 'number', default: '360', description: t('devtools.apiWidth') },
  { name: 'height', type: 'number', default: '300', description: t('devtools.apiHeight') },
  { name: 'maxEvents', type: 'number', default: '1000', description: t('devtools.apiMaxEvents') },
]

export const getTabsInfo = (t: (key: string) => string): ApiRow[] => [
  { name: 'Signals', type: 'tab', description: t('devtools.tabSignals') },
  { name: 'Stores', type: 'tab', description: t('devtools.tabStores') },
  { name: 'Router', type: 'tab', description: t('devtools.tabRouter') },
  { name: 'Components', type: 'tab', description: t('devtools.tabComponents') },
  { name: 'Performance', type: 'tab', description: t('devtools.tabPerformance') },
]
