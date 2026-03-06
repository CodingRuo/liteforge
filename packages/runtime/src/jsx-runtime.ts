/**
 * JSX Runtime — used when jsxImportSource is set to "liteforge" or "@liteforge/runtime".
 *
 * TypeScript / Vite will auto-import from "liteforge/jsx-runtime" (or
 * "@liteforge/runtime/jsx-runtime") when jsx: "react-jsx" is used.
 * This module re-exports h/Fragment under the expected JSX transform names.
 */

export { h as jsx, h as jsxs, h as jsxDEV, Fragment } from './h.js';
