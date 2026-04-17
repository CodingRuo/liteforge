/**
 * LiteForge Store Types
 *
 * Type definitions for the store system including defineStore,
 * store registry, and plugins.
 */

import type { Signal } from '@liteforge/core';

// ============================================================================
// Context Types
// ============================================================================

/**
 * The use() function type for accessing context.
 * Available in actions when store is connected to an app.
 */
export type UseFn = <T = unknown>(key: string) => T;

// ============================================================================
// State Types
// ============================================================================

/**
 * Valid state value types.
 * State can be any serializable value.
 */
export type StateValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | StateValue[] 
  | { [key: string]: StateValue }
  | object;

/**
 * State definition object.
 * Maps property names to their initial values.
 */
export type StateDefinition = Record<string, StateValue>;

// ============================================================================
// Type Widening Utilities
// ============================================================================

/**
 * Widen literal types to their base types.
 * - `false` → `boolean`
 * - `true` → `boolean`
 * - `42` → `number`
 * - Strings are NOT widened: `'dark' as Theme` stays `Theme`
 * - Arrays are recursively widened
 * 
 * This allows developers to write `{ loading: false }` instead of 
 * `{ loading: false as boolean }` in state definitions.
 * 
 * Why strings are not widened:
 * - TypeScript already widens string literals in object properties to `string`
 * - Explicit type assertions like `'system' as Theme` preserve the union type
 * - This allows proper type inference for string unions without casting
 */
export type Widen<T> = 
  // Boolean literals → boolean (true/false → boolean)
  T extends boolean ? boolean :
  // Number literals → number (0, 42 → number)
  T extends number ? number :
  // String: DON'T widen! Preserves unions like Theme = 'light' | 'dark'
  T extends string ? T :
  // Arrays: recursive widening
  T extends (infer U)[] ? Widen<U>[] :
  // Everything else: keep as-is (null, undefined, objects, unions)
  T;

/**
 * Transform a state definition into signals with widened types.
 * Each property T becomes Signal<Widen<T>>.
 * 
 * This means `state: { loading: false }` creates a `Signal<boolean>`,
 * not a `Signal<false>`.
 */
export type SignalifiedState<S extends StateDefinition> = {
  [K in keyof S]: Signal<Widen<S[K]>>;
};

/**
 * Widened version of a state definition.
 * All literal types are widened to their base types.
 */
export type WidenedState<S extends StateDefinition> = {
  [K in keyof S]: Widen<S[K]>;
};

// ============================================================================
// Getter Types
// ============================================================================

/**
 * A single getter function.
 * Can be a no-arg function or a function with arguments.
 */
export type GetterFn = ((...args: never[]) => unknown);

/**
 * Getters definition object returned by the getters factory.
 */
export type GettersDefinition = Record<string, GetterFn>;

/**
 * Factory function that creates getters from signalified state.
 */
export type GettersFactory<
  S extends StateDefinition,
  G extends GettersDefinition
> = (state: SignalifiedState<S>) => G;

// ============================================================================
// Action Types
// ============================================================================

/**
 * A single action function.
 * Actions can be sync or async, and can take any arguments.
 */
export type ActionFn = (...args: never[]) => unknown;

/**
 * Actions definition object returned by the actions factory.
 */
export type ActionsDefinition = Record<string, ActionFn>;

/**
 * Factory function that creates actions from signalified state and use().
 */
export type ActionsFactory<
  S extends StateDefinition,
  A extends ActionsDefinition
> = (state: SignalifiedState<S>, use: UseFn) => A;

// ============================================================================
// Store Definition Types
// ============================================================================

/**
 * Full store definition passed to defineStore().
 */
export interface StoreDefinition<
  S extends StateDefinition = StateDefinition,
  G extends GettersDefinition = GettersDefinition,
  A extends ActionsDefinition = ActionsDefinition,
> {
  /** Initial state values. Each becomes a Signal. */
  state: S;

  /** Factory that creates getters from signalified state. */
  getters?: GettersFactory<S, G>;

  /** Factory that creates actions from signalified state and use(). */
  actions?: ActionsFactory<S, A>;
}

// ============================================================================
// Store Instance Types
// ============================================================================

/**
 * Callback for watching a specific state key.
 * Uses widened types so `false` becomes `boolean`.
 */
export type WatchCallback<T> = (newValue: Widen<T>, oldValue: Widen<T>) => void;

/**
 * Callback for watching any state change.
 */
export type OnChangeCallback = (key: string, newValue: unknown, oldValue: unknown) => void;

/**
 * Internal store methods available on every store.
 */
export interface StoreInternalMethods<S extends StateDefinition> {
  /** Watch a specific state key for changes. Returns unsubscribe function. */
  $watch<K extends keyof S>(key: K, callback: WatchCallback<S[K]>): () => void;

  /** Watch any state key for changes. Returns unsubscribe function. */
  $onChange(callback: OnChangeCallback): () => void;

  /** Reset all state to initial values. */
  $reset(): void;

  /** Get a plain object snapshot of current state (with widened types). */
  $snapshot(): WidenedState<S>;

  /** 
   * Restore state from a snapshot (used for time-travel debugging).
   * Accepts Record<string, unknown> for compatibility with AnyStore interface.
   * Only known state keys are restored; unknown keys are ignored.
   */
  $restore(snapshot: Record<string, unknown>): void;
}

/**
 * Store metadata.
 * Uses $ prefix to avoid collisions with user-defined state/getters/actions.
 */
export interface StoreMetadata {
  /** Store name (unique identifier). */
  $name: string;
}

/**
 * Internal methods for store management.
 */
export interface StoreInternalExtendedMethods<S extends StateDefinition> 
  extends StoreInternalMethods<S> {
  /** Connect the store to an app context. Called by defineApp(). */
  $connectContext(useFn: UseFn): void;

  /** Get the signalified state (for internal use). */
  $getState(): SignalifiedState<S>;

  /** Get the initial state values (for reset, with widened types). */
  $getInitialState(): WidenedState<S>;

  /** Get action names (for inspection). */
  $getActionNames(): string[];

  /** Get getter names (for inspection). */
  $getGetterNames(): string[];
}

/**
 * Internal store interface used by the registry.
 * This is the full store object with all internal methods.
 */
export interface StoreInternal<
  S extends StateDefinition = StateDefinition,
  _G extends GettersDefinition = GettersDefinition,
  _A extends ActionsDefinition = ActionsDefinition,
> extends StoreMetadata, StoreInternalExtendedMethods<S> {
  // State, getters, and actions are accessed via index signature at runtime
  // TypeScript can't express them cleanly without conflicts, so we use
  // the Store type for public-facing code where proper typing is needed
}

/**
 * The public store type returned by defineStore().
 * Combines state signals, getters, actions, and internal methods.
 */
export type Store<
  S extends StateDefinition = StateDefinition,
  G extends GettersDefinition = GettersDefinition,
  A extends ActionsDefinition = ActionsDefinition,
> = StoreMetadata & 
    SignalifiedState<S> & 
    G & 
    A & 
    StoreInternalExtendedMethods<S>;

// ============================================================================
// Store Registry Types
// ============================================================================

/**
 * Detailed store inspection result.
 */
export interface StoreInspection {
  /** Store name. */
  name: string;

  /** Current state as plain object. */
  state: Record<string, unknown>;

  /** Current getter values. */
  getters: Record<string, unknown>;

  /** Action names. */
  actions: string[];

  /** Number of active subscribers watching this store. */
  subscriberCount: number;
}

/**
 * Callback for global state change events.
 */
export type GlobalChangeCallback = (
  storeName: string,
  key: string,
  newValue: unknown,
  oldValue: unknown
) => void;

/**
 * The store registry singleton interface.
 */
export interface StoreRegistry {
  /** 
   * Register a store. Called automatically by defineStore().
   * Returns existing store if one with the same name exists (singleton semantics),
   * or null if a new store was created.
   */
  register<
    S extends StateDefinition,
    G extends GettersDefinition,
    A extends ActionsDefinition,
  >(name: string, store: StoreInternal<S, G, A>): StoreInternal<S, G, A> | null;

  /** Unregister a store by name. */
  unregister(name: string): void;

  /** Clear all registered stores. */
  clear(): void;

  /** Get a store by name. */
  get<
    S extends StateDefinition = StateDefinition,
    G extends GettersDefinition = GettersDefinition,
    A extends ActionsDefinition = ActionsDefinition,
  >(name: string): Store<S, G, A> | undefined;

  /** List all registered store names. */
  list(): string[];

  /** Get a plain-object snapshot of all stores' current state. */
  snapshot(): Record<string, Record<string, unknown>>;

  /** Inspect a single store in detail. */
  inspect(name: string): StoreInspection | undefined;

  /** Listen to all state changes across all stores. Returns unsubscribe. */
  onAnyChange(callback: GlobalChangeCallback): () => void;

  /** Reset a single store to its initial state. */
  reset(name: string): void;

  /** Reset all stores to their initial state. */
  resetAll(): void;

  /** Serialize entire app state to JSON string. */
  serialize(): string;

  /** Restore state from JSON (e.g., SSR hydration, debugging). */
  hydrate(json: string): void;

  /** Register a plugin. */
  use(plugin: StorePlugin): void;

  /** Notify plugins of state change (internal). */
  $notifyChange(storeName: string, key: string, newValue: unknown, oldValue: unknown): void;

  /** Notify plugins of store reset (internal). */
  $notifyReset(storeName: string): void;

  /** Get registered plugins (for testing). */
  $getPlugins(): StorePlugin[];

  /** Clear all plugins (for testing). */
  $clearPlugins(): void;
}

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Store plugin definition.
 */
export interface StorePlugin {
  /** Plugin name (for identification). */
  name: string;

  /** Called when a store is first created/registered. */
  onInit?: (storeName: string, state: SignalifiedState<StateDefinition>) => void;

  /** Called whenever any watched state changes. */
  onStateChange?: (
    storeName: string,
    key: string,
    newValue: unknown,
    oldValue: unknown
  ) => void;

  /** Called when a store is reset. */
  onReset?: (storeName: string) => void;

  /** Optional: filter which stores this plugin applies to. */
  stores?: string[];

  /** Optional: filter which keys to watch per store. */
  include?: Record<string, string[]>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Extract the state type from a store.
 */
export type ExtractState<T> = T extends Store<infer S, infer _G, infer _A> ? S : never;

/**
 * Extract the getters type from a store.
 */
export type ExtractGetters<T> = T extends Store<infer _S, infer G, infer _A> ? G : never;

/**
 * Extract the actions type from a store.
 */
export type ExtractActions<T> = T extends Store<infer _S, infer _G, infer A> ? A : never;
