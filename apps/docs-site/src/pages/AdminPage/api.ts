import type { ApiRow } from '../../components/ApiTable.js'

export const getDefineResourceApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'name',     type: 'string',              description: t('admin.apiName') },
  { name: 'label',    type: 'string',  default: 'capitalize(name)', description: t('admin.apiLabel') },
  { name: 'endpoint', type: 'string',              description: t('admin.apiEndpoint') },
  { name: 'schema',   type: 'z.ZodObject',         description: t('admin.apiSchema') },
  { name: 'actions',  type: "AdminAction[]", default: "['index','show','create','edit','destroy']", description: t('admin.apiActions') },
  { name: 'list',     type: 'ListConfig',           description: t('admin.apiList') },
  { name: 'show',     type: 'ShowConfig?',          description: t('admin.apiShow') },
  { name: 'form',     type: 'FormConfig?',          description: t('admin.apiForm') },
  { name: 'hooks',    type: 'ResourceHooks?',       description: t('admin.apiHooks') },
  { name: 'rowActions', type: 'RowAction[]?',       description: t('admin.apiRowActions') },
]

export const getFieldTypesApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'text',     type: 'FieldType', description: t('admin.fieldText') },
  { name: 'textarea', type: 'FieldType', description: t('admin.fieldTextarea') },
  { name: 'number',   type: 'FieldType', description: t('admin.fieldNumber') },
  { name: 'date',     type: 'FieldType', description: t('admin.fieldDate') },
  { name: 'boolean',  type: 'FieldType', description: t('admin.fieldBoolean') },
  { name: 'select',   type: 'FieldType', description: t('admin.fieldSelect') },
  { name: 'badge',    type: 'FieldType', description: t('admin.fieldBadge') },
  { name: 'image',    type: 'FieldType', description: t('admin.fieldImage') },
  { name: 'relation', type: 'FieldType', description: t('admin.fieldRelation') },
  { name: 'custom',   type: 'FieldType', description: t('admin.fieldCustom') },
]

export const getPluginApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'basePath',  type: 'string',  default: "'/admin'", description: t('admin.pluginBasePath') },
  { name: 'title',     type: 'string',  default: "'Admin'",  description: t('admin.pluginTitle') },
  { name: 'logo',      type: 'string | (() => Node)', description: t('admin.pluginLogo') },
  { name: 'unstyled',  type: 'boolean', default: 'false',    description: t('admin.pluginUnstyled') },
]

export const getHooksApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'beforeCreate',  type: '(data) => data | Promise<data>',          description: t('admin.hookBeforeCreate') },
  { name: 'afterCreate',   type: '(record: T) => void',                     description: t('admin.hookAfterCreate') },
  { name: 'beforeEdit',    type: '(data) => data | Promise<data>',          description: t('admin.hookBeforeEdit') },
  { name: 'afterEdit',     type: '(record: T) => void',                     description: t('admin.hookAfterEdit') },
  { name: 'beforeDestroy', type: '(id) => boolean | Promise<boolean>',      description: t('admin.hookBeforeDestroy') },
  { name: 'afterDestroy',  type: '(id: string | number) => void',           description: t('admin.hookAfterDestroy') },
]
