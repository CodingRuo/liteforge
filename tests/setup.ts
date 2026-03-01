// Catch happy-dom script loading errors that don't affect tests
// Happy-DOM tries to execute Vite's <script> tags which fails in Node environment

const isHappyDomScriptError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false
  return (
    err.message.includes('Cannot use import statement outside a module') ||
    err.message.includes('JavaScript file loading is disabled')
  )
}

process.on('unhandledRejection', (reason) => {
  if (isHappyDomScriptError(reason)) return
  // Let vitest handle other rejections
})

process.on('uncaughtException', (err) => {
  if (isHappyDomScriptError(err)) return
  // For real errors, log and let the test fail naturally
  console.error('Uncaught exception:', err)
})
