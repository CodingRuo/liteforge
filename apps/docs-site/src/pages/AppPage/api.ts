import type { ApiRow } from '../../components/ApiTable.js';

export const getCreateAppApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'root', type: 'ComponentFactory', description: t('app.apiRoot') },
  { name: 'target', type: 'string | HTMLElement', description: t('app.apiTarget') },
  { name: 'stores', type: 'AnyStore[]', default: '[]', description: t('app.apiStores') },
  { name: 'context', type: 'Record<string, unknown>', default: '{}', description: t('app.apiContext') },
  { name: 'debug', type: 'boolean', default: 'false', description: t('app.apiDebug') },
  { name: 'onReady', type: '(app: AppInstance) => void', description: t('app.apiOnReady') },
  { name: 'errorComponent', type: 'ErrorComponent', description: t('app.apiErrorComponent') },
  { name: 'onError', type: 'ErrorHandler', description: t('app.apiOnError') },
];

export const getBuilderApi = (t: (key: string) => string): ApiRow[] => [
  { name: '.use(plugin)', type: 'AppBuilder', description: t('app.builderUse') },
  { name: '.useDev(factory)', type: 'AppBuilder', description: t('app.builderUseDev') },
  { name: '.mount()', type: 'Promise<App>', description: t('app.builderMount') },
  { name: '.then(fn)', type: 'Promise<App>', description: t('app.builderThen') },
  { name: '.catch(fn)', type: 'Promise<App>', description: t('app.builderCatch') },
];

export const getPluginApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'name', type: 'string', description: t('app.pluginName') },
  { name: 'install(ctx)', type: 'void | (() => void) | Promise<void | (() => void)>', description: t('app.pluginInstall') },
];

export const getPluginCtxApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'provide(key, value)', type: 'void', description: t('app.ctxProvide') },
  { name: 'resolve(key)', type: 'PluginRegistry[K]', description: t('app.ctxResolve') },
  { name: 'target', type: 'HTMLElement', description: t('app.ctxTarget') },
];

export const getAppApi = (t: (key: string) => string): ApiRow[] => [
  { name: 'unmount()', type: 'void', description: t('app.appUnmount') },
  { name: 'use(key)', type: 'T', description: t('app.appUse') },
  { name: 'stores', type: 'Record<string, AnyStore>', description: t('app.appStores') },
  { name: 'router?', type: 'RouterLike', description: t('app.appRouter') },
];
