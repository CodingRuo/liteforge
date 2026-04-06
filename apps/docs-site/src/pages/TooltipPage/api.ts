import type { ApiRow } from '../../components/ApiTable.js'

export const getOptionsApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'content', type: 'string | Node', description: t('tooltip.apiContent') },
  { name: 'position', type: "'top' | 'right' | 'bottom' | 'left' | 'auto'", default: "'top'", description: t('tooltip.apiPosition') },
  { name: 'delay', type: 'number', default: '0', description: t('tooltip.apiDelay') },
  { name: 'offset', type: 'number', default: '8', description: t('tooltip.apiOffset') },
  { name: 'disabled', type: 'boolean', default: 'false', description: t('tooltip.apiDisabled') },
  { name: 'showWhen', type: '() => boolean', description: t('tooltip.apiShowWhen') },
]

export const getFuncApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'tooltip(el, input)', type: '() => void', description: t('tooltip.apiFnSignature') },
  { name: 'positionTooltip(el, target, position, offset)', type: 'void', description: t('tooltip.apiFnPositionTooltip') },
]

export const getComponentApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'content', type: 'string | Node', description: t('tooltip.apiCompContent') },
  { name: 'position', type: 'TooltipPosition', default: "'top'", description: t('tooltip.apiCompPosition') },
  { name: 'delay', type: 'number', description: t('tooltip.apiCompDelay') },
  { name: 'offset', type: 'number', description: t('tooltip.apiCompOffset') },
  { name: 'disabled', type: 'boolean', description: t('tooltip.apiCompDisabled') },
  { name: 'showWhen', type: '() => boolean', description: t('tooltip.apiCompShowWhen') },
  { name: 'children', type: 'Node', description: t('tooltip.apiCompChildren') },
]
