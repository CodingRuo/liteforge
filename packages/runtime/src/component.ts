/**
 * LiteForge createComponent
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
import { use, withContext, getContextSnapshot } from './context.js';
import { getHMRHandler, type HMRInstance } from './hmr.js';

// Track parent component for debug hierarchy
let currentParentComponentId: string | undefined;

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
// createComponent Implementation
// ============================================================================

/**
 * Create a component factory from a component definition.
 *
 * @param definition - The component definition object
 * @returns A component factory function
 *
 * @example
 * ```ts
 * const MyComponent = createComponent({
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
// Overload 1: With props schema - computes which props are optional based on defaults
export function createComponent<
  Schema extends Record<string, PropDefinition<unknown>>,
  P extends { [K in keyof Schema]: Schema[K] extends PropDefinition<infer T> ? T : never },
  D = undefined,
  S = undefined,
>(
  definition: ComponentDefinition<P, D, S> & { props: Schema }
): ComponentFactory<P, Simplify<InputPropsFromSchema<Schema, P>>>;

// Overload 2: Without props schema - all props use the inferred P type directly
export function createComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
  D = undefined,
  S = undefined,
>(definition: ComponentDefinition<P, D, S>): ComponentFactory<P, P>;

// Implementation
export function createComponent<
  P extends Record<string, unknown>,
  D,
  S,
>(definition: ComponentDefinition<P, D, S>): ComponentFactory<P, Partial<P>> {
  const factory = (inputProps: Partial<P>): ComponentInstance => {
    return createComponentInstance(definition, inputProps as P);
  };

  // Mark as LiteForge component for detection
  const typedFactory = factory as ComponentFactory<P, Partial<P>>;
  typedFactory.__liteforge_component = true;
  
  // Attach HMR metadata for component-level HMR
  if (definition.__hmrId) {
    typedFactory.__hmrId = definition.__hmrId;
    // Cast to unknown first to satisfy exactOptionalPropertyTypes
    typedFactory.__hmrOptions = definition as ComponentDefinition<P, unknown, unknown>;
  }

  return typedFactory;
}

/**
 * Create an instance of a component with full lifecycle management.
 */
function createComponentInstance<
  P extends Record<string, unknown>,
  D,
  S,
>(
  definition: ComponentDefinition<P, D, S>,
  inputProps: P
): ComponentInstance {
  // Debug info - extract component name from definition
  // Priority: 1. explicit name property, 2. component function name (if meaningful), 3. fallback
  // Skip generic names like 'component' or empty strings
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
  const hasProvide = Boolean(definition.provide);
  let provideContext: Record<string, unknown> | undefined;
  
  // HMR tracking
  let hmrInstance: HMRInstance | null = null;
  let currentDefinition = definition;

  // ========================================
  // Phase 1: Setup (synchronous)
  // ========================================
  if (definition.setup) {
    setupResult = definition.setup({ props, use });
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

    // Unregister from HMR before cleanup
    unregisterFromHMR();

    // Run destroyed callback
    if (currentDefinition.destroyed) {
      currentDefinition.destroyed({ props, setup: setupResult as S });
    }

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

  function updateProps(newProps: Record<string, unknown>): void {
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
      const node = currentDefinition.component({
        props,
        data: loadedData as D,
        setup: setupResult as S,
        use,
      });

      insertNode(node);
      state = ComponentState.Mounted;

      // Phase 4: mounted callback
      if (currentDefinition.mounted && currentNode instanceof Element) {
        mountedCleanup = currentDefinition.mounted({
          el: currentNode,
          props,
          data: loadedData as D,
          setup: setupResult as S,
          use,
        });
      }
      
      // ── HMR Registration ──
      registerWithHMR();
    };

    if (hasProvide && provideContext) {
      withContext(provideContext, render);
    } else {
      render();
    }
  }
  
  /**
   * Register this component instance with the HMR handler.
   * Called after the component is rendered to the DOM.
   */
  function registerWithHMR(): void {
    const hmrHandler = getHMRHandler();
    const hmrId = currentDefinition.__hmrId;
    
    if (!hmrHandler || !hmrId || !currentNode) return;
    
    // Extract module URL from hmrId (format: "/path/to/file.tsx::ComponentName")
    const moduleUrl = hmrId.split('::')[0];
    if (!moduleUrl) return;
    
    // Capture context for HMR restoration (e.g., router:outlet-depth)
    const capturedContext = getContextSnapshot();
    
    // Create HMR instance
    hmrInstance = {
      __hmrId: hmrId,
      __el: currentNode,
      __props: props as Record<string, unknown>,
      __setup: (setupResult ?? {}) as Record<string, unknown>,
      __data: (loadedData ?? {}) as Record<string, unknown>,
      __cleanup: typeof mountedCleanup === 'function' ? mountedCleanup : undefined,
      __context: capturedContext,
      
      __hmrUpdate(newModule: Record<string, unknown>): void {
        // Find the matching component factory in the new module
        let newDefinition: ComponentDefinition<P, D, S> | null = null;
        
        for (const exportValue of Object.values(newModule)) {
          // Check if it's a component factory with matching __hmrId
          if (
            exportValue &&
            typeof exportValue === 'function' &&
            '__liteforge_component' in exportValue &&
            '__hmrId' in exportValue &&
            (exportValue as ComponentFactory<P>).__hmrId === hmrId
          ) {
            const factoryWithOptions = exportValue as ComponentFactory<P>;
            if (factoryWithOptions.__hmrOptions) {
              newDefinition = factoryWithOptions.__hmrOptions as ComponentDefinition<P, D, S>;
              break;
            }
          }
        }
        
        if (!newDefinition) {
          console.warn(`[LiteForge HMR] Could not find updated component for ${hmrId}`);
          return;
        }
        
        // Clean up old mounted effects
        if (mountedCleanup) {
          mountedCleanup();
          mountedCleanup = undefined;
        }
        
        // Update the current definition
        currentDefinition = newDefinition;
        
        // Re-render with new component function but EXISTING setup/data
        // This is the key to preserving state!
        // We restore the captured context so nested RouterOutlets get correct depth
        try {
          const newNode = withContext(this.__context, () =>
            currentDefinition.component({
              props,
              data: loadedData as D,
              setup: setupResult as S,  // ← Signals keep their values!
              use,
            })
          );
          
        // Swap DOM nodes
        const parent = currentNode?.parentNode;
        
        if (parent && currentNode) {
          parent.replaceChild(newNode, currentNode);
          currentNode = newNode;
          
          // Update HMR instance reference
          this.__el = newNode;
          
          // Run new mounted callback
          if (currentDefinition.mounted && currentNode instanceof Element) {
            mountedCleanup = currentDefinition.mounted({
              el: currentNode,
              props,
              data: loadedData as D,
              setup: setupResult as S,
              use,
            });
            this.__cleanup = typeof mountedCleanup === 'function' ? mountedCleanup : undefined;
          }
          
          console.log(`[LiteForge HMR] ✅ Component updated: ${hmrId}`);
        }
        } catch (err) {
          console.error(`[LiteForge HMR] ❌ Render failed for ${hmrId}:`, err);
          
          // Fallback: try full remount with new setup
          try {
            console.log(`[LiteForge HMR] 🔄 Attempting full remount...`);
            
            // Re-run setup with new definition (within captured context)
            if (currentDefinition.setup) {
              setupResult = withContext(this.__context, () =>
                currentDefinition.setup!({ props, use })
              );
            }
            
            const newNode = withContext(this.__context, () =>
              currentDefinition.component({
                props,
                data: loadedData as D,
                setup: setupResult as S,
                use,
              })
            );
            
            const parent = currentNode?.parentNode;
            if (parent && currentNode) {
              parent.replaceChild(newNode, currentNode);
              currentNode = newNode;
              this.__el = newNode;
              this.__setup = (setupResult ?? {}) as Record<string, unknown>;
              
              console.log(`[LiteForge HMR] ✅ Full remount succeeded: ${hmrId}`);
            }
          } catch (remountErr) {
            console.error(`[LiteForge HMR] ❌ Full remount also failed:`, remountErr);
            throw remountErr;  // Let the HMR handler fall back to page reload
          }
        }
      },
    };
    
    // Register with HMR handler
    hmrHandler.register(moduleUrl, hmrInstance);
  }
  
  /**
   * Unregister this component instance from the HMR handler.
   * Called when the component is unmounted.
   */
  function unregisterFromHMR(): void {
    const hmrHandler = getHMRHandler();
    const hmrId = currentDefinition.__hmrId;
    
    if (!hmrHandler || !hmrId || !hmrInstance) return;
    
    const moduleUrl = hmrId.split('::')[0];
    if (moduleUrl) {
      hmrHandler.unregister(moduleUrl, hmrInstance);
    }
    
    hmrInstance = null;
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
function resolveProps<P extends Record<string, unknown>>(
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
