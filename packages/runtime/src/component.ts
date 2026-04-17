/**
 * LiteForge defineComponent
 *
 * The central factory for creating reactive components with full lifecycle support.
 *
 * Lifecycle Flow:
 * 1. setup()      - Synchronous, create local signals
 * 2. placeholder  - Shown immediately (if load exists)
 * 3. load()       - Async data fetching
 * 4. component()  - Render (only when load resolved)
 * 5. mounted()    - After DOM insertion
 * 6. destroyed()  - On unmount
 *
 * HMR Strategy (Component Registry):
 * - In dev mode, defineComponent() registers the definition in componentRegistry
 * - When HMR fires, the module is re-evaluated → registry updated with latest code
 * - fullRerender() rebuilds the app; renderComponent() reads the latest definition
 *   from the registry at call-time, picking up the new component/mounted/etc. fns
 */

import {
  generateDebugId,
  emitComponentMount,
  emitComponentUnmount,
} from '@liteforge/core';
import type {
  ComponentDefinition,
  ComponentFactory,
  ComponentInstance,
  PropDefinition,
  InputPropsFromSchema,
  Simplify,
} from './types.js';
import { use, withContext } from './context.js';
import { registerComponent, getLatestDefinition } from './hmr.js';

// Track parent component for debug hierarchy
let currentParentComponentId: string | undefined;

// Setup-scope cleanup registry — populated during setup(), drained on unmount()
let currentSetupCleanups: (() => void)[] | null = null;

/**
 * Register a cleanup function to run when the current component is destroyed.
 * Must be called synchronously during `setup()`.
 * Outside of setup(), this is a no-op.
 */
export function onSetupCleanup(fn: () => void): void {
  currentSetupCleanups?.push(fn);
}

// Check if we're in development mode
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

// ============================================================================
// Component State Enum
// ============================================================================

const enum ComponentState {
  Created,
  Loading,
  Loaded,
  Error,
  Mounted,
  Unmounted,
}

// ============================================================================
// defineComponent Implementation
// ============================================================================

/**
 * Create a component factory from a component definition.
 *
 * @param definition - The component definition object
 * @returns A component factory function
 *
 * @example
 * ```ts
 * const MyComponent = defineComponent({
 *   props: { name: { type: String, required: true } },
 *   setup({ props }) {
 *     const count = signal(0);
 *     return { count };
 *   },
 *   component({ props, setup }) {
 *     return <div>Hello {props.name}, count: {setup.count()}</div>;
 *   },
 * });
 * ```
 */
// Overload 1: Explicit generic props type parameter — defineComponent<MyProps>({...})
// This is the preferred pattern for typed components without a schema object.
// Uses `object` constraint (not Record<string, unknown>) for compatibility with
// exactOptionalPropertyTypes=true, where optional-propertied interfaces don't
// satisfy Record<string, unknown> due to missing index signature.
export function defineComponent<
  TProps extends object,
  D = undefined,
  S = undefined,
>(definition: ComponentDefinition<TProps, D, S> & { props?: never }): ComponentFactory<TProps, TProps>;

// Overload 2: With props schema - computes which props are optional based on defaults
export function defineComponent<
  Schema extends Record<string, PropDefinition<unknown>>,
  P extends { [K in keyof Schema]: Schema[K] extends PropDefinition<infer T> ? T : never },
  D = undefined,
  S = undefined,
>(
  definition: ComponentDefinition<P, D, S> & { props: Schema }
): ComponentFactory<P, Simplify<InputPropsFromSchema<Schema, P>>>;

// Overload 3: Without props schema - all props use the inferred P type directly
export function defineComponent<
  P extends object = Record<string, unknown>,
  D = undefined,
  S = undefined,
>(definition: ComponentDefinition<P, D, S>): ComponentFactory<P, P>;

// Implementation
export function defineComponent<
  P extends object,
  D,
  S,
>(definition: ComponentDefinition<P, D, S>): ComponentFactory<P, Partial<P>> {
  const factory = (inputProps?: Partial<P>): ComponentInstance => {
    return defineComponentInstance(definition, (inputProps ?? {}) as P);
  };

  // Mark as LiteForge component for detection.
  // The factory returns ComponentInstance at runtime, but ComponentFactory
  // declares the call return as Node for JSX compat — cast through unknown.
  const typedFactory = factory as unknown as ComponentFactory<P, Partial<P>>;
  typedFactory.__liteforge_component = true;

  // Attach HMR metadata and register in the component registry
  if (definition.__hmrId) {
    typedFactory.__hmrId = definition.__hmrId;
    typedFactory.__hmrOptions = definition as ComponentDefinition<P, unknown, unknown>;
    // Register so fullRerender() always reads latest code at call-time
    if (isDev) {
      registerComponent(definition.__hmrId, definition as ComponentDefinition<object, unknown, unknown>);
    }
  }

  return typedFactory;
}

/**
 * Create an instance of a component with full lifecycle management.
 */
function defineComponentInstance<
  P extends object,
  D,
  S,
>(
  definition: ComponentDefinition<P, D, S>,
  inputProps: P
): ComponentInstance {
  // Debug info - extract component name from definition
  const funcName = definition.component.name;
  const componentName = definition.name
    ?? (funcName && funcName !== 'component' && funcName !== '' ? funcName : 'Component');
  const componentId = generateDebugId(componentName);
  const parentId = currentParentComponentId;

  // State
  let state = ComponentState.Created;
  let currentNode: Node | null = null;
  let parentElement: Element | null = null;
  let beforeNode: Node | null = null;
  let props = resolveProps(definition.props, inputProps);
  let setupResult: S | undefined;
  let loadedData: D | undefined;
  let mountedCleanup: (() => void) | void;
  const setupCleanups: (() => void)[] = [];
  const hasProvide = Boolean(definition.provide);
  let provideContext: Record<string, unknown> | undefined;

  // currentDefinition is the frozen import binding. In dev mode with an hmrId
  // we resolve the latest definition from the registry so that setup(), load(),
  // component() etc. all see the freshest code on every fullRerender().
  const currentDefinition = (isDev && definition.__hmrId)
    ? (getLatestDefinition(definition.__hmrId) as ComponentDefinition<P, D, S> ?? definition)
    : definition;

  // ========================================
  // Phase 1: Setup (synchronous)
  // ========================================
  if (currentDefinition.setup) {
    const prevCleanups = currentSetupCleanups;
    currentSetupCleanups = setupCleanups;
    setupResult = currentDefinition.setup({ props, use });
    currentSetupCleanups = prevCleanups;
  }

  // ========================================
  // Lifecycle Methods
  // ========================================

  function mount(parent: Element, before: Node | null = null): void {
    if (state === ComponentState.Unmounted) {
      throw new Error('Cannot mount an unmounted component');
    }

    parentElement = parent;
    beforeNode = before;

    // Set up provide context if defined
    if (hasProvide && currentDefinition.provide) {
      provideContext = currentDefinition.provide({ use });
    }

    // Track parent component for nested components
    const previousParentId = currentParentComponentId;
    currentParentComponentId = componentId;

    // Run within context scope
    const mountWithContext = () => {
      if (currentDefinition.load) {
        // Has async loading - show placeholder first
        state = ComponentState.Loading;
        renderPlaceholder();
        startLoading();
      } else {
        // No loading - render directly
        state = ComponentState.Loaded;
        loadedData = undefined as D;
        renderComponent();
      }
    };

    if (hasProvide && provideContext) {
      withContext(provideContext, mountWithContext);
    } else {
      mountWithContext();
    }

    // Restore parent component tracking
    currentParentComponentId = previousParentId;

    // Emit mount event (zero cost if debug not enabled)
    emitComponentMount(componentId, componentName, parentId);
  }

  function unmount(): void {
    if (state === ComponentState.Unmounted) return;

    // Run destroyed callback
    if (currentDefinition.destroyed) {
      currentDefinition.destroyed({ props, setup: setupResult as S });
    }

    // Run setup-scope cleanups (registered via onSetupCleanup during setup())
    for (let i = setupCleanups.length - 1; i >= 0; i--) {
      try { setupCleanups[i]!(); } catch { /* ignore */ }
    }
    setupCleanups.length = 0;

    // Run mounted cleanup
    if (mountedCleanup) {
      mountedCleanup();
      mountedCleanup = undefined;
    }

    // Remove from DOM
    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.removeChild(currentNode);
    }

    currentNode = null;
    parentElement = null;
    state = ComponentState.Unmounted;

    // Emit unmount event (zero cost if debug not enabled)
    emitComponentUnmount(componentId, componentName);
  }

  function getNode(): Node | null {
    return currentNode;
  }

  function updateProps(newProps: object): void {
    props = resolveProps(definition.props, newProps as P);
    // In a full implementation, this would trigger a re-render
    // For now, props are static after initial render
  }

  // ========================================
  // Internal Methods
  // ========================================

  function renderPlaceholder(): void {
    if (!parentElement) return;

    let placeholderNode: Node;

    if (currentDefinition.placeholder) {
      placeholderNode = currentDefinition.placeholder({ props });
    } else {
      // Default placeholder is an empty comment node
      placeholderNode = document.createComment('loading');
    }

    insertNode(placeholderNode);
  }

  function renderComponent(): void {
    if (!parentElement) return;
    if (state === ComponentState.Unmounted) return;

    const render = () => {
      // In dev mode with an hmrId, read the latest definition from the registry.
      // This ensures fullRerender() picks up updated code even though the import
      // binding is statically frozen.
      const liveDefinition = (isDev && currentDefinition.__hmrId)
        ? (getLatestDefinition(currentDefinition.__hmrId) as ComponentDefinition<P, D, S> ?? currentDefinition)
        : currentDefinition;

      const node = liveDefinition.component({
        props,
        data: loadedData as D,
        setup: setupResult as S,
        use,
      });

      insertNode(node);
      state = ComponentState.Mounted;

      // Phase 4: mounted callback
      if (liveDefinition.mounted && node instanceof Element) {
        mountedCleanup = liveDefinition.mounted({
          el: node,
          props,
          data: loadedData as D,
          setup: setupResult as S,
          use,
        });
      }
    };

    if (hasProvide && provideContext) {
      withContext(provideContext, render);
    } else {
      render();
    }
  }

  function renderError(error: Error): void {
    if (!parentElement) return;
    if (state === ComponentState.Unmounted) return;

    state = ComponentState.Error;

    if (currentDefinition.error) {
      const errorNode = currentDefinition.error({
        props,
        error,
        retry: () => {
          // Re-attempt loading
          state = ComponentState.Loading;
          renderPlaceholder();
          startLoading();
        },
      });
      insertNode(errorNode);
    } else {
      // Default error: show a text node with the error message
      const errorNode = document.createTextNode(`Error: ${error.message}`);
      insertNode(errorNode);
    }
  }

  function startLoading(): void {
    if (!currentDefinition.load) return;

    currentDefinition
      .load({
        props,
        setup: setupResult as S,
        use,
      })
      .then((data) => {
        if (state === ComponentState.Unmounted) return;
        loadedData = data;
        state = ComponentState.Loaded;
        renderComponent();
      })
      .catch((error: unknown) => {
        if (state === ComponentState.Unmounted) return;
        renderError(error instanceof Error ? error : new Error(String(error)));
      });
  }

  function insertNode(newNode: Node): void {
    if (!parentElement) return;

    // Remove old node if exists
    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.removeChild(currentNode);
    }

    // Insert new node
    if (beforeNode) {
      parentElement.insertBefore(newNode, beforeNode);
    } else {
      parentElement.appendChild(newNode);
    }

    currentNode = newNode;
  }

  return {
    mount,
    unmount,
    getNode,
    updateProps,
  };
}

// ============================================================================
// Prop Resolution
// ============================================================================

/**
 * Resolve props with defaults and type checking.
 */
function resolveProps<P extends object>(
  propsSchema: Record<string, { default?: unknown; required?: boolean }> | undefined,
  inputProps: P
): P {
  if (!propsSchema) {
    return inputProps;
  }

  const resolved = { ...inputProps } as Record<string, unknown>;

  for (const [key, propDef] of Object.entries(propsSchema)) {
    if (!(key in resolved) || resolved[key] === undefined) {
      // Apply default if available
      if ('default' in propDef) {
        resolved[key] =
          typeof propDef.default === 'function'
            ? (propDef.default as () => unknown)()
            : propDef.default;
      } else if (propDef.required) {
        console.warn(`Required prop "${key}" is missing`);
      }
    }
  }

  return resolved as P;
}

// ============================================================================
// Utility: Check if value is a component factory
// ============================================================================

/**
 * Check if a value is a LiteForge component factory.
 */
export function isComponentFactory(value: unknown): value is ComponentFactory<Record<string, unknown>> {
  return (
    typeof value === 'function' &&
    (value as ComponentFactory<Record<string, unknown>>).__liteforge_component === true
  );
}
