/**
 * Browser entry.
 *
 * Loaded by the HTML shell (the framework auto-injects
 * `<script type="module" src="/client.js">`). Mounts the same app config
 * declared in `src/app.ts` into the DOM.
 */

import { app } from './app.js'

// Styles are served from public/styles.css via the publicDir static handler —
// referenced in the HTML shell through the document's head.links config.

await app.mount()
