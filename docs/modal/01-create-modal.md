---
title: "createModal"
category: "modal"
tags: ["modal", "createModal", "ModalProvider", "confirm", "alert", "prompt", "dialog"]
related: ["Toast", "Tooltip"]
---

# createModal

> Programmatic modal dialogs with typed data, focus trap, CSS transitions, and built-in presets.

## Installation

```bash
npm install @liteforge/modal
```

## Quick Start

```tsx
import { createModal, ModalProvider } from '@liteforge/modal'

// 1. Add ModalProvider to your app root
const App = defineComponent({
  component() {
    return (
      <div>
        <ModalProvider />
        {/* your app */}
      </div>
    )
  },
})

// 2. Define a modal
const confirmModal = createModal({
  config: { title: 'Confirm', size: 'sm', closeOnBackdrop: true },
  component: () => <p>Are you sure?</p>,
})

// 3. Open it
confirmModal.open()
```

## API Reference

### `createModal<TData>(options)` → `ModalResult<TData>`

**Options (`CreateModalOptions<TData>`):**

| Option | Type | Description |
|--------|------|-------------|
| `config` | `ModalConfig` | Modal configuration |
| `component` | `(data: TData) => Node` | Content renderer. Receives data passed to `open()`. |

**Options (`CreateModalOptionsNoData`) — no data variant:**

| Option | Type | Description |
|--------|------|-------------|
| `config` | `ModalConfig` | Modal configuration |
| `component` | `() => Node` | Content renderer with no data |

**`ModalConfig`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | `string` | — | Modal header title |
| `size` | `ModalSize` | `'md'` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` |
| `closable` | `boolean` | `true` | Show close button |
| `closeOnBackdrop` | `boolean` | `true` | Close when clicking backdrop |
| `closeOnEsc` | `boolean` | `true` | Close on Escape key |
| `unstyled` | `boolean` | `false` | Skip default CSS |
| `styles` | `ModalStyles` | — | CSS variable overrides |
| `classes` | `ModalClasses` | — | BEM class overrides |
| `onOpen` | `() => void` | — | Open callback |
| `onClose` | `() => void` | — | Close callback |

**Returns (`ModalResult<TData>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `isOpen` | `Signal<boolean>` | Current open state |
| `open(data)` | `(data: TData) => void` | Open with data |
| `close()` | `() => void` | Close the modal |
| `toggle()` | `() => void` | Toggle open/closed |
| `destroy()` | `() => void` | Remove from registry |

### `ModalProvider()`

Portal component that renders all registered modals. Place once, at the root of your app.

### Presets

```ts
import { confirm, alert, prompt } from '@liteforge/modal'

// Confirmation dialog
const confirmed = await confirm({ title: 'Delete?', message: 'This cannot be undone.' })
if (confirmed) deleteItem()

// Alert dialog
await alert({ title: 'Notice', message: 'Saved successfully.' })

// Prompt dialog
const name = await prompt({ title: 'Name', placeholder: 'Enter your name' })
```

## Examples

### Modal with typed data

```tsx
interface DeleteModalData {
  itemId: string
  itemName: string
}

const deleteModal = createModal<DeleteModalData>({
  config: { title: 'Delete Item', size: 'sm' },
  component: (data) => (
    <div>
      <p>Delete "{data.itemName}"?</p>
      <button onclick={() => { deleteItem(data.itemId); deleteModal.close() }}>
        Confirm
      </button>
    </div>
  ),
})

// Open with data:
deleteModal.open({ itemId: '42', itemName: 'My File' })
```

### CSS customization

```ts
const modal = createModal({
  config: {
    styles: {
      bg: '#1a1a2e',
      headerBg: '#16213e',
      borderRadius: '12px',
    },
  },
  component: () => <div>Custom styled modal</div>,
})
```

## Notes

- `ModalProvider` uses a `globalThis` singleton registry so modals created in lazy-loaded pages are visible even when `ModalProvider` is in the main bundle.
- Each `createModal()` call registers the modal in the registry. Call `destroy()` to unregister.
- The vite-plugin alias for `@liteforge/modal` must point to `packages/modal/src/index.ts` in dev — not the `dist/` build.
- Focus trap is built-in: tab/shift-tab cycle within the modal while open.
