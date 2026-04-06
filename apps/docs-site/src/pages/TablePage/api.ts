import type { ApiRow } from '../../components/ApiTable.js'

export const getTableApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'data', type: '() => T[]', description: t('table.apiData') },
  { name: 'columns', type: 'ColumnDef<T>[]', description: t('table.apiColumns') },
  { name: 'pagination', type: '{ pageSize: number }', description: t('table.apiPagination') },
  { name: 'selection', type: "{ enabled: boolean, mode: 'single' | 'multi' }", description: t('table.apiSelection') },
  { name: 'filters', type: 'FilterDef[]', description: t('table.apiFilters') },
  { name: 'styles', type: 'TableStyles', description: t('table.apiStyles') },
  { name: 'classes', type: 'Partial<TableClasses>', description: t('table.apiClasses') },
  { name: 'unstyled', type: 'boolean', description: t('table.apiUnstyled') },
]

export const getStyleTokensApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'bg', type: 'string', description: t('table.styleBg') },
  { name: 'border', type: 'string', description: t('table.styleBorder') },
  { name: 'borderRadius', type: 'string', description: t('table.styleBorderRadius') },
  { name: 'headerBg', type: 'string', description: t('table.styleHeaderBg') },
  { name: 'headerColor', type: 'string', description: t('table.styleHeaderColor') },
  { name: 'headerFontWeight', type: 'string', description: t('table.styleHeaderFontWeight') },
  { name: 'rowBg', type: 'string', description: t('table.styleRowBg') },
  { name: 'rowBgHover', type: 'string', description: t('table.styleRowBgHover') },
  { name: 'rowBgSelected', type: 'string', description: t('table.styleRowBgSelected') },
  { name: 'rowBgStriped', type: 'string', description: t('table.styleRowBgStriped') },
  { name: 'cellPadding', type: 'string', description: t('table.styleCellPadding') },
  { name: 'cellColor', type: 'string', description: t('table.styleCellColor') },
  { name: 'cellFontSize', type: 'string', description: t('table.styleCellFontSize') },
  { name: 'accentColor', type: 'string', description: t('table.styleAccentColor') },
  { name: 'sortIconColor', type: 'string', description: t('table.styleSortIconColor') },
  { name: 'paginationBg', type: 'string', description: t('table.stylePaginationBg') },
  { name: 'searchBorder', type: 'string', description: t('table.styleSearchBorder') },
  { name: 'searchFocus', type: 'string', description: t('table.styleSearchFocus') },
]
