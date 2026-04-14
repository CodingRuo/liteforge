/**
 * @liteforge/core
 *
 * Fine-grained reactive primitives for LiteForge.
 */

// Primitives
export { signal } from './signal.js';
export type { Signal, ReadonlySignal, SignalOptions } from './signal.js';

export { effect } from './effect.js';
export type { EffectFn, DisposeFn, EffectOptions } from './effect.js';

export { computed } from './computed.js';
export type { ComputeFn, ComputedOptions } from './computed.js';

export { batch } from './batch.js';

export { onCleanup } from './cleanup.js';

export { untrack } from './internals.js';

// Debug utilities
export {
  enableDebug,
  disableDebug,
  isDebugEnabled,
  createDebugBus,
  generateDebugId,
  resetDebugIdCounter,
  // Emit helpers (for packages that hook into the debug system)
  emitSignalCreate,
  emitSignalUpdate,
  emitEffectRun,
  emitEffectDispose,
  emitComputedRecalc,
  emitStoreCreate,
  emitStoreStateChange,
  emitStoreAction,
  emitNavigationStart,
  emitNavigationEnd,
  emitGuardRun,
  emitComponentMount,
  emitComponentUnmount,
} from './debug.js';

export type {
  DebugBus,
  DebugEvent,
  DebugEventType,
  DebugEventCallback,
  PayloadFor,
  Unsubscribe,
  // Payload types
  SignalCreatePayload,
  SignalUpdatePayload,
  EffectRunPayload,
  EffectDisposePayload,
  ComputedRecalcPayload,
  StoreCreatePayload,
  StoreStateChangePayload,
  StoreActionPayload,
  NavigationStartPayload,
  NavigationEndPayload,
  GuardRunPayload,
  ComponentMountPayload,
  ComponentUnmountPayload,
} from './debug.js';
