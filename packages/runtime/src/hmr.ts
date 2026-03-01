/**
 * LiteForge HMR Runtime Support
 * 
 * Provides Hot Module Replacement support for LiteForge components.
 * This module sets up the global __LITEFORGE_HMR__ handler that the
 * vite-plugin's injected code communicates with.
 * 
 * Strategy:
 * - Track mounted component instances by module ID
 * - When a module updates, re-render affected components
 * - Signals and stores survive because they're in separate modules
 */

// Vite's import.meta.env type
declare global {
  interface ImportMeta {
    env?: {
      DEV?: boolean;
      PROD?: boolean;
      MODE?: string;
    };
  }
}

// =============================================================================
// Types
// =============================================================================

/**
 * A mounted component instance tracked for HMR.
 * Created by createComponent() and registered with the HMR handler.
 */
export interface HMRInstance {
  /** The HMR identifier (format: "/path/to/file.tsx::ComponentName") */
  __hmrId: string;
  /** The root DOM element of this instance */
  __el: Node;
  /** Current props passed to this instance */
  __props: Record<string, unknown>;
  /** Setup result containing signals (PRESERVED during HMR) */
  __setup: Record<string, unknown>;
  /** Loaded data from load() function */
  __data: Record<string, unknown>;
  /** Cleanup function for mounted effects */
  __cleanup: (() => void) | undefined;
  /** Captured context at time of registration (for HMR restoration) */
  __context: Record<string, unknown>;
  /** 
   * Update this instance with a new module.
   * Called by the HMR handler when the source file changes.
   */
  __hmrUpdate: (newModule: Record<string, unknown>) => void;
}

export interface HMRHandler {
  /** Map of module URL → mounted instances */
  registry: Map<string, Set<HMRInstance>>;
  /** Register a component instance */
  register: (moduleUrl: string, instance: HMRInstance) => void;
  /** Unregister a component instance */
  unregister: (moduleUrl: string, instance: HMRInstance) => void;
  /** Handle a module update */
  update: (moduleUrl: string, newModule: Record<string, unknown> | null) => void;
  /** Full app re-render function (set by createApp) */
  fullRerender: (() => void) | null;
}

// =============================================================================
// Global HMR Handler
// =============================================================================

declare global {
  interface Window {
    __LITEFORGE_HMR__?: HMRHandler;
  }
}

/**
 * Initialize the HMR handler.
 * Called automatically when this module loads in development.
 */
export function initHMR(): HMRHandler {
  if (typeof window === 'undefined') {
    // SSR environment - return dummy handler
    return {
      registry: new Map(),
      register: () => {},
      unregister: () => {},
      update: () => {},
      fullRerender: null,
    };
  }

  // Return existing handler if already initialized
  if (window.__LITEFORGE_HMR__) {
    return window.__LITEFORGE_HMR__;
  }

  const handler: HMRHandler = {
    registry: new Map(),

    register(moduleUrl: string, instance: HMRInstance): void {
      if (!this.registry.has(moduleUrl)) {
        this.registry.set(moduleUrl, new Set());
      }
      const instances = this.registry.get(moduleUrl);
      if (instances) {
        // Clean up any orphaned instances (nodes no longer in document)
        // This happens when a parent component is HMR-replaced, removing child nodes
        for (const existing of instances) {
          if (!existing.__el.isConnected) {
            instances.delete(existing);
            // Run cleanup if available
            if (existing.__cleanup) {
              try {
                existing.__cleanup();
              } catch {
                // Ignore cleanup errors
              }
            }
            console.log(`[LiteForge HMR] 🧹 Cleaned up orphaned: ${existing.__hmrId}`);
          }
        }
        
        instances.add(instance);
        console.log(`[LiteForge HMR] 📝 Registered: ${instance.__hmrId} (${instances.size} instance(s))`);
      }
    },

    unregister(moduleUrl: string, instance: HMRInstance): void {
      const instances = this.registry.get(moduleUrl);
      if (instances) {
        instances.delete(instance);
        console.log(`[LiteForge HMR] 🗑️ Unregistered: ${instance.__hmrId}`);
        if (instances.size === 0) {
          this.registry.delete(moduleUrl);
        }
      }
    },

    update(moduleUrl: string, newModule: Record<string, unknown> | null): void {
      console.log('[LiteForge HMR] 🔄 Module updated:', moduleUrl);
      
      if (!newModule) {
        console.warn('[LiteForge HMR] No new module received, triggering full reload');
        window.location.reload();
        return;
      }

      const instances = this.registry.get(moduleUrl);
      
      if (instances && instances.size > 0) {
        console.log(`[LiteForge HMR] 🔄 Updating ${instances.size} instance(s)`);
        
        let successCount = 0;
        const instancesArray = Array.from(instances);
        
        // Use requestAnimationFrame to batch DOM updates
        requestAnimationFrame(() => {
          for (const instance of instancesArray) {
            try {
              instance.__hmrUpdate(newModule);
              successCount++;
            } catch (err) {
              console.error(`[LiteForge HMR] ❌ Error updating ${instance.__hmrId}:`, err);
            }
          }
          
          if (successCount > 0) {
            console.log(`[LiteForge HMR] ✅ ${successCount} component(s) hot-replaced`);
          } else {
            // All updates failed - fall back to full reload
            console.warn('[LiteForge HMR] All updates failed, triggering full reload');
            window.location.reload();
          }
        });
      } else {
        // No tracked component instances for this module
        // This could be a store/route/utility file
        console.log('[LiteForge HMR] ⚡ No component instances, trying app re-render...');
        
        if (this.fullRerender) {
          this.fullRerender();
        } else {
          // Last resort: page reload
          console.log('[LiteForge HMR] 🔄 Full page reload');
          window.location.reload();
        }
      }
    },

    fullRerender: null,
  };

  window.__LITEFORGE_HMR__ = handler;
  console.log('[LiteForge HMR] Handler initialized');
  
  return handler;
}

/**
 * Get the HMR handler (creates if needed)
 */
export function getHMRHandler(): HMRHandler | null {
  if (typeof window === 'undefined') return null;
  return window.__LITEFORGE_HMR__ ?? initHMR();
}

// Auto-initialize in development
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  initHMR();
}
