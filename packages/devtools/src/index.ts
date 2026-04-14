/**
 * @liteforge/devtools
 *
 * DevTools panel for debugging LiteForge applications.
 */

// Plugin
export { devtoolsPlugin, createDevTools } from './plugin.js';

// Types from plugin
export type { StandaloneDevToolsConfig } from './plugin.js';

// Types
export type {
  DevToolsConfig,
  ResolvedDevToolsConfig,
  DevToolsInstance,
  DevToolsApi,
  SignalGetter,
  PanelPosition,
  TabId,
  PanelState,
  EventBuffer,
  StoredEvent,
  SignalInfo,
  StoreInfo,
  StoreHistoryEntry,
  NavigationInfo,
  ComponentInfo,
  PerformanceCounters,
  DevToolsStore,
  DevToolsStoreMap,
} from './types.js';

// Buffer (for advanced usage)
export { createEventBuffer } from './buffer.js';
