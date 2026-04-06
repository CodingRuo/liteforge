import type { ApiRow } from '../../components/ApiTable.js';

export const getSignalApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'signal(initial)', type: 'Signal<T>',         description: t('core.apiSignal')  },
  { name: 'sig()',           type: 'T',                 description: t('core.apiRead')    },
  { name: 'sig.set(value)',  type: 'void',              description: t('core.apiSet')     },
  { name: 'sig.update(fn)',  type: 'void',              description: t('core.apiUpdate')  },
];

export const getComputedApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'computed(fn)',    type: 'ReadonlySignal<T>', description: t('core.apiComputed') },
  { name: 'derived()',       type: 'T',                description: t('core.apiDerived')  },
];

export const getEffectApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'effect(fn)',      type: 'DisposeFn',        description: t('core.apiEffect')  },
  { name: 'dispose()',       type: 'void',             description: t('core.apiDispose') },
];
