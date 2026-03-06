// Use relative paths so Vite resolves to the same file as the @liteforge/* aliases.
// @liteforge/core and @liteforge/runtime both resolve to these same files,
// ensuring a single module instance and a shared reactivity graph.
export * from '../../core/src/index.js';
export * from '../../runtime/src/index.js';
