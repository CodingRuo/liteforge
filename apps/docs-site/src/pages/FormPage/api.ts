import type { ApiRow } from '../../components/ApiTable.js';

export const getFormApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'schema', type: 'ZodSchema', description: t('form.apiSchema') },
  { name: 'initial', type: 'T', description: t('form.apiInitial') },
  { name: 'onSubmit', type: '(values: T) => Promise<void>', description: t('form.apiOnSubmit') },
  { name: 'validateOn', type: "'blur' | 'change' | 'submit'", default: "'submit'", description: t('form.apiValidateOn') },
  { name: 'revalidateOn', type: "'blur' | 'change'", default: "'change'", description: t('form.apiRevalidateOn') },
];

export const getArrayApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'fields()', type: 'ArrayItemField[]', description: t('form.apiFields') },
  { name: 'append(value)', type: 'void', description: t('form.apiAppend') },
  { name: 'prepend(value)', type: 'void', description: t('form.apiPrepend') },
  { name: 'insert(index, value)', type: 'void', description: t('form.apiInsert') },
  { name: 'remove(index)', type: 'void', description: t('form.apiRemove') },
  { name: 'move(from, to)', type: 'void', description: t('form.apiMove') },
  { name: 'swap(indexA, indexB)', type: 'void', description: t('form.apiSwap') },
  { name: 'replace(values)', type: 'void', description: t('form.apiReplace') },
  { name: 'length()', type: 'number', description: t('form.apiLength') },
  { name: 'error()', type: 'string | undefined', description: t('form.apiArrayError') },
  { name: 'item.field(name)', type: 'FieldInstance', description: t('form.apiItemField') },
];
