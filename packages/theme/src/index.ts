/**
 * @liteforge/theme
 *
 * Shared design-token system for the LiteForge UI packages.
 *
 * CSS usage (recommended for bundler projects):
 *   import '@liteforge/theme/css'       // base + dark
 *   import '@liteforge/theme/css/base'  // light tokens only
 *   import '@liteforge/theme/css/dark'  // dark overrides only
 *   import '@liteforge/theme/css/reset' // optional reset
 *
 * JS runtime usage (plugin-driven or lazy injection):
 *   import { injectTheme } from '@liteforge/theme';
 *   injectTheme();
 *   injectTheme({ tokens: { colorAccent: '#7c3aed' } });
 */

export { injectTheme, resetThemeInjection } from './inject.js';
export type { InjectThemeOptions } from './inject.js';
export { TOKEN_MAP } from './tokens.js';
export type { ThemeTokens } from './tokens.js';
export { colorScheme, resetColorScheme } from './scheme.js';
export type { ColorScheme } from './scheme.js';
