import type { ApiRow } from '../../components/ApiTable.js';

export const getDefineStoreApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'state', type: 'Record<string, unknown>', description: t('store.apiState') },
  { name: 'getters', type: '(state) => Record<string, () => T>', description: t('store.apiGetters') },
  { name: 'actions', type: '(state) => Record<string, Function>', description: t('store.apiActions') },
  { name: 'plugins', type: 'StorePlugin[]', description: t('store.apiPlugins') },
];

export const getStoreInstanceApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'state[key]()', type: 'T', description: t('store.apiStateRead') },
  { name: 'state[key].set(v)', type: 'void', description: t('store.apiStateSet') },
  { name: 'state[key].update(fn)', type: 'void', description: t('store.apiStateUpdate') },
  { name: 'getters[name]()', type: 'T', description: t('store.apiGetterRead') },
  { name: 'actions[name](...)', type: 'void | Promise', description: t('store.apiActionCall') },
  { name: '$snapshot()', type: 'object', description: t('store.apiSnapshot') },
  { name: '$restore(snap)', type: 'void', description: t('store.apiRestore') },
];
