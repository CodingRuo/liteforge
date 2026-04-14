---
"@liteforge/runtime": patch
---

fix(@liteforge/runtime): replace requestAnimationFrame with queueMicrotask in Show deferred path

The deferred render path in `Show` (used when the component is built before being
inserted into the DOM — e.g. the template-compiler path) previously used
`requestAnimationFrame`. Since rAF fires *after* the browser's next paint, there was
a one-frame gap where neither content nor fallback was visible. This was most
noticeable in auth flows: `<Show when={() => isLoggedIn()}>` briefly showed nothing
on initial render.

`queueMicrotask` fires before the next paint, eliminating the flash entirely.
