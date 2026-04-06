---
title: "Toast"
category: "toast"
tags: ["toast", "ToastProvider", "notification", "success", "error", "warning", "info"]
related: ["createModal", "Tooltip"]
---

# Toast

> Non-blocking toast notifications with auto-dismiss, positions, and promise support.

## Installation

```bash
npm install @liteforge/toast
```

## Quick Start

```tsx
import { toast, ToastProvider } from '@liteforge/toast'

// 1. Add ToastProvider to your app root (once)
const App = createComponent({
  component() {
    return (
      <div>
        <ToastProvider position="top-right" />
        {/* your app */}
      </div>
    )
  },
})

// 2. Show toasts from anywhere
toast.success('Saved successfully!')
toast.error('Something went wrong.')
toast.warning('Low disk space.')
toast.info('New update available.')

// 3. Promise toast
toast.promise(saveData(), {
  loading: 'Saving...',
  success: 'Saved!',
  error: (err) => `Error: ${err.message}`,
})
```

## API Reference

### `toast` object

| Method | Signature | Description |
|--------|-----------|-------------|
| `toast.success(message, opts?)` | `(msg: string, opts?: ToastOptions) => string` | Show success toast, returns ID |
| `toast.error(message, opts?)` | `(msg: string, opts?: ToastOptions) => string` | Show error toast |
| `toast.warning(message, opts?)` | `(msg: string, opts?: ToastOptions) => string` | Show warning toast |
| `toast.info(message, opts?)` | `(msg: string, opts?: ToastOptions) => string` | Show info toast |
| `toast.dismiss(id)` | `(id: string) => void` | Dismiss a specific toast by ID |
| `toast.promise(promise, msgs, opts?)` | `<T>(p: Promise<T>, msgs: ToastPromiseMessages, opts?: ToastOptions) => Promise<T>` | Track a promise |

### `ToastOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `duration` | `number` | `4000` | Auto-dismiss delay in ms. `0` = persistent. |
| `pauseOnHover` | `boolean` | `true` | Pause timer on hover |
| `closable` | `boolean` | `true` | Show close button |

### `ToastProvider(props?)`

Mount the toast stack in the DOM.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `ToastPosition` | `'top-right'` | Stack position |
| `duration` | `number` | `4000` | Default duration |
| `pauseOnHover` | `boolean` | `true` | Default pause behavior |
| `closable` | `boolean` | `true` | Default closable |
| `unstyled` | `boolean` | `false` | Skip default CSS |

**`ToastPosition`:** `'top-left' \| 'top-center' \| 'top-right' \| 'bottom-left' \| 'bottom-center' \| 'bottom-right'`

### Low-level API

```ts
import { toasts, addToast, removeToast, clearToasts } from '@liteforge/toast'

toasts()         // Signal<ToastEntry[]> — all current toasts
addToast(entry)  // Add manually
removeToast(id)  // Remove by ID
clearToasts()    // Remove all
```

### `toastPlugin`

```ts
import { toastPlugin } from '@liteforge/toast'

await createApp({ root: App, target: '#app' })
  .use(toastPlugin({ position: 'bottom-right' }))
```

## Examples

### Promise with error handling

```ts
const result = await toast.promise(
  fetch('/api/upload').then(r => r.json()),
  {
    loading: 'Uploading...',
    success: (data) => `Uploaded: ${data.filename}`,
    error: (err) => `Upload failed: ${err.message}`,
  },
  { duration: 6000 }
)
```

### Persistent notification

```ts
const id = toast.info('Processing...', { duration: 0, closable: false })
await doLongTask()
toast.dismiss(id)
toast.success('Done!')
```

## Notes

- `ToastProvider` must be mounted once in your app. Multiple providers will stack.
- `toast.promise()` returns the original promise — you can `await` it for the resolved value.
- The `toastPlugin` registers a `toast` key in app context accessible via `use('toast')`.
