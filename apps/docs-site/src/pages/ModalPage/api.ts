import type { ApiRow } from '../../components/ApiTable.js';

export const getConfigApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'title', type: 'string', description: t('modal.apiTitle') },
  { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl' | 'full'", default: "'md'", description: t('modal.apiSize') },
  { name: 'closable', type: 'boolean', default: 'true', description: t('modal.apiClosable') },
  { name: 'closeOnBackdrop', type: 'boolean', default: 'true', description: t('modal.apiCloseOnBackdrop') },
  { name: 'closeOnEsc', type: 'boolean', default: 'true', description: t('modal.apiCloseOnEsc') },
  { name: 'unstyled', type: 'boolean', default: 'false', description: t('modal.apiUnstyled') },
  { name: 'styles', type: 'ModalStyles', description: t('modal.apiStyles') },
  { name: 'classes', type: 'ModalClasses', description: t('modal.apiClasses') },
  { name: 'onOpen', type: '() => void', description: t('modal.apiOnOpen') },
  { name: 'onClose', type: '() => void', description: t('modal.apiOnClose') },
];

export const getInstanceApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'isOpen', type: 'Signal<boolean>', description: t('modal.apiIsOpen') },
  { name: 'open()', type: 'void', description: t('modal.apiOpen') },
  { name: 'close()', type: 'void', description: t('modal.apiClose') },
  { name: 'toggle()', type: 'void', description: t('modal.apiToggle') },
  { name: 'destroy()', type: 'void', description: t('modal.apiDestroy') },
];

export const getPresetApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'confirm(message, config?)', type: 'Promise<boolean>', description: t('modal.apiConfirm') },
  { name: 'alert(message, config?)', type: 'Promise<void>', description: t('modal.apiAlert') },
  { name: 'prompt(message, default?, config?)', type: 'Promise<string | null>', description: t('modal.apiPrompt') },
];
