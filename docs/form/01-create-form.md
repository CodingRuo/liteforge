---
title: "createForm"
category: "form"
tags: ["form", "createForm", "validation", "zod", "field", "array", "submit"]
related: ["createQuery", "Signals"]
---

# createForm

> Signals-based form management with Zod validation, nested fields, and array fields.

## Installation

```bash
npm install @liteforge/form zod
```

## Quick Start

```ts
import { createForm } from '@liteforge/form'
import { z } from 'zod'

const form = createForm({
  schema: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  initial: { name: '', email: '' },
  onSubmit: async (values) => {
    await api.createUser(values)
  },
  validateOn: 'blur',
  revalidateOn: 'change',
})

// Use in JSX
<input
  value={() => form.field('name').value()}
  oninput={(e) => form.field('name').set(e.target.value)}
  onblur={() => form.field('name').touch()}
/>
{() => form.field('name').error() && <span>{form.field('name').error()}</span>}

<button onclick={() => form.submit()}>Submit</button>
```

## API Reference

### `createForm<TSchema>(options)` → `FormResult<TSchema>`

**Options (`FormOptions<TSchema>`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `z.ZodObject` | required | Zod validation schema |
| `initial` | `z.input<TSchema>` | required | Initial field values |
| `onSubmit` | `(values: z.output<TSchema>) => Promise<void>` | required | Submit handler |
| `validateOn` | `'blur' \| 'change' \| 'submit'` | `'blur'` | When to first validate |
| `revalidateOn` | `'blur' \| 'change' \| 'submit'` | `'change'` | When to revalidate after first error |

**Returns (`FormResult<TSchema>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `field(path)` | `(path: string) => FieldResult` | Access a field by dot-notation path |
| `array(path)` | `(path: string) => ArrayFieldResult` | Access an array field |
| `values` | `Signal<FormValues>` | All current values |
| `errors` | `Signal<Record<string, string \| undefined>>` | All current errors |
| `isValid` | `Signal<boolean>` | True when no errors |
| `isDirty` | `Signal<boolean>` | True when values differ from initial |
| `isSubmitting` | `Signal<boolean>` | True while `onSubmit` is running |
| `submitCount` | `Signal<number>` | Number of submit attempts |
| `submit()` | `() => Promise<void>` | Validate and call `onSubmit` |
| `reset()` | `() => void` | Reset to initial values |
| `setValues(partial)` | `(vals: Partial<FormValues>) => void` | Merge values without full reset |
| `validate()` | `() => boolean` | Validate all fields, returns isValid |
| `clearErrors()` | `() => void` | Clear all errors |

### `FieldResult`

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `value` | `() => unknown` | Current field value |
| `error` | `() => string \| undefined` | Current error message |
| `touched` | `() => boolean` | True after blur |
| `dirty` | `() => boolean` | True when value differs from initial |
| `set(value)` | `(value: unknown) => void` | Set field value |
| `reset()` | `() => void` | Reset field to initial |
| `validate()` | `() => void` | Validate this field immediately |
| `touch()` | `() => void` | Mark as touched and maybe validate |

### `ArrayFieldResult`

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `fields` | `Signal<ArrayItemField[]>` | Array of item field accessors |
| `length` | `Signal<number>` | Number of items |
| `error` | `() => string \| undefined` | Array-level error |
| `append(value)` | `(v: unknown) => void` | Add to end |
| `prepend(value)` | `(v: unknown) => void` | Add to start |
| `insert(index, value)` | `(i: number, v: unknown) => void` | Insert at index |
| `remove(index)` | `(i: number) => void` | Remove by index |
| `move(from, to)` | `(f: number, t: number) => void` | Move item |
| `swap(a, b)` | `(a: number, b: number) => void` | Swap two items |
| `replace(values)` | `(v: unknown[]) => void` | Replace entire array |

## Examples

### Nested fields (dot-notation)

```ts
const form = createForm({
  schema: z.object({
    address: z.object({
      street: z.string(),
      city: z.string(),
    }),
  }),
  initial: { address: { street: '', city: '' } },
  onSubmit: async (v) => console.log(v),
})

form.field('address.street').set('123 Main St')
form.field('address.city').value()
```

### Array fields

```tsx
const tagsField = form.array('tags')

<For each={tagsField.fields}>
  {(item) => (
    <div>
      <input
        value={() => item.field('name').value()}
        oninput={(e) => item.field('name').set(e.target.value)}
      />
      <button onclick={() => tagsField.remove(item.index())}>Remove</button>
    </div>
  )}
</For>

<button onclick={() => tagsField.append({ name: '' })}>Add tag</button>
```

## Notes

- `value` on a field is a `() => unknown` getter — use `value={() => form.field('name').value()}` in JSX attributes.
- `touch()` marks a field touched AND validates it if `validateOn` is `'blur'`.
- `submit()` first calls `validate()` on all fields. If invalid, it returns early without calling `onSubmit`.
- Errors use dot-notation keys matching field paths.
