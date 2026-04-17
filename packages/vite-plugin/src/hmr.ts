/**
 * LiteForge HMR Support
 * 
 * Hot Module Replacement integration for LiteForge components.
 * 
 * Strategy:
 * 1. Each transformed module gets an HMR boundary that accepts updates
 * 2. When a module updates, we notify the global __LITEFORGE_HMR__ handler
 * 3. The runtime tracks mounted component instances and can re-render them
 * 4. Signals and stores survive the update (they're in separate modules)
 * 
 * Level 2 HMR adds:
 * - __hmrId injection into defineComponent() calls
 * - Component instance tracking by module URL
 * - Re-render with preserved setup signals
 */

// =============================================================================
// __hmrId Injection
// =============================================================================

/**
 * Inject __hmrId into all defineComponent() calls in a module.
 * 
 * This enables component-level HMR by giving each component a unique identifier
 * based on file path + export name.
 * 
 * Patterns handled:
 * - `export const Sidebar = defineComponent({` → adds __hmrId: "/path::Sidebar"
 * - `export default defineComponent({` → adds __hmrId: "/path::default"
 * - `const Sidebar = defineComponent({` → adds __hmrId: "/path::Sidebar"
 * 
 * @param code - The source code to transform
 * @param fileId - The absolute file path (used as module identifier)
 * @returns Transformed code with __hmrId injected
 */
export function injectHmrIds(code: string, fileId: string): string {
  // Normalize the file path for consistent IDs across platforms
  const normalizedId = fileId.replace(/\\/g, '/');
  
  let result = code;
  
  // Pattern 1: Named variable assignment (with or without export)
  // Matches: `export const Sidebar = defineComponent({`
  // Matches: `const Sidebar = defineComponent({`
  // Matches: `let Sidebar = defineComponent({`
  // Matches: `var Sidebar = defineComponent({`
  result = result.replace(
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*defineComponent\s*\(\s*\{/g,
    (match, name: string) => {
      const hmrId = `${normalizedId}::${name}`;
      return match.replace(
        'defineComponent({',
        `defineComponent({ __hmrId: ${JSON.stringify(hmrId)},`
      );
    }
  );
  
  // Pattern 2: Export default defineComponent
  // Matches: `export default defineComponent({`
  result = result.replace(
    /export\s+default\s+defineComponent\s*\(\s*\{/g,
    (match) => {
      const hmrId = `${normalizedId}::default`;
      return match.replace(
        'defineComponent({',
        `defineComponent({ __hmrId: ${JSON.stringify(hmrId)},`
      );
    }
  );
  
  return result;
}

// =============================================================================
// HMR Code Injection
// =============================================================================

/**
 * Generate HMR acceptance code to append to a module
 * 
 * @param moduleId - The module's file path/URL for tracking
 */
export function generateHmrCode(moduleId: string): string {
  // Escape the moduleId for use in a string literal
  const escapedId = JSON.stringify(moduleId);
  
  return `

// ── LiteForge HMR ──
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (typeof window !== 'undefined' && window.__LITEFORGE_HMR__) {
      window.__LITEFORGE_HMR__.handleUpdate(${escapedId}, newModule);
    }
  });
}
`;
}

/**
 * Append HMR code to the transformed output
 * 
 * @param code - The transformed code
 * @param moduleId - The module's file path for identification
 */
export function appendHmrCode(code: string, moduleId?: string): string {
  const id = moduleId ?? 'unknown';
  return code + generateHmrCode(id);
}

/**
 * Check if code already has HMR acceptance
 */
export function hasHmrAcceptance(code: string): boolean {
  return code.includes('import.meta.hot.accept');
}
