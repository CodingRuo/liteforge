---
title: "createTable"
category: "table"
tags: ["table", "createTable", "sort", "filter", "pagination", "selection", "columns"]
related: ["createQuery", "createForm"]
---

# createTable

> Reactive data grid with sorting, filtering, pagination, and row selection.

## Installation

```bash
npm install @liteforge/table
```

## Quick Start

```tsx
import { createTable } from '@liteforge/table'

const table = createTable<User>({
  data: () => users(),
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true, filterable: true },
    {
      key: '_actions',
      header: '',
      cell: (_, row) => <button onclick={() => edit(row)}>Edit</button>,
    },
  ],
  pagination: { pageSize: 20 },
  selection: { enabled: true, mode: 'multi' },
})

// In JSX:
<table.Root />
```

## API Reference

### `createTable<T>(options)` → `TableResult<T>`

**Options (`TableOptions<T>`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `() => T[]` | required | Reactive data source |
| `columns` | `ColumnDef<T>[]` | required | Column definitions |
| `pagination` | `PaginationOptions` | — | Enable and configure pagination |
| `search` | `SearchOptions<T>` | — | Enable global search |
| `selection` | `SelectionOptions` | — | Enable row selection |
| `unstyled` | `boolean` | `false` | Skip default CSS injection |
| `styles` | `TableStyles` | — | CSS variable overrides per instance |
| `classes` | `TableClasses` | — | BEM class overrides |

**`ColumnDef<T>`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `string` | required | Data key or `'_virtual'` prefix |
| `header` | `string` | required | Header text |
| `width` | `number \| string` | — | Column width |
| `sortable` | `boolean` | `false` | Enable column sort |
| `filterable` | `boolean` | `false` | Enable column filter |
| `visible` | `boolean` | `true` | Initial visibility |
| `cell` | `(value, row: T) => Node \| Element` | — | Custom cell renderer |
| `headerCell` | `() => Node \| Element` | — | Custom header renderer |

**`PaginationOptions`:**

| Field | Type | Description |
|-------|------|-------------|
| `pageSize` | `number` | Rows per page |
| `pageSizes` | `number[]` | Options for page size selector |

**`SelectionOptions`:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Enable selection |
| `mode` | `'single' \| 'multi'` | Single or multi-select |

**Returns (`TableResult<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `Root` | `ComponentFactory` | The full table component |
| `rows` | `Signal<T[]>` | Current visible (paginated) rows |
| `allFilteredRows` | `Signal<T[]>` | All rows after filter/sort (before pagination) |
| `totalRows` | `Signal<number>` | Total filtered row count |
| `sort` | `Signal<SortState \| null>` | Current sort state |
| `setSort(key, dir?)` | Method | Set sort state |
| `page` | `Signal<number>` | Current page (1-based) |
| `pageSize` | `Signal<number>` | Current page size |
| `setPage(n)` | Method | Go to page |
| `search` | `Signal<string>` | Current search query |
| `setSearch(q)` | Method | Set search query |
| `filters` | `Signal<Record<string, unknown>>` | Column filter values |
| `setFilter(key, value)` | Method | Set a column filter |
| `selected` | `Signal<Set<T>>` | Selected rows |
| `selectAll()` | Method | Select all filtered rows |
| `clearSelection()` | Method | Clear selection |
| `visibleColumns` | `Signal<ColumnDef<T>[]>` | Currently visible columns |
| `toggleColumn(key)` | Method | Show/hide a column |

## Examples

### Search and pagination

```tsx
<input
  value={() => table.search()}
  oninput={(e) => table.setSearch(e.target.value)}
  placeholder="Search..."
/>

<table.Root />

<div>
  Page {() => table.page()} of {() => Math.ceil(table.totalRows() / table.pageSize())}
  <button onclick={() => table.setPage(table.page() - 1)}>Prev</button>
  <button onclick={() => table.setPage(table.page() + 1)}>Next</button>
</div>
```

### Row selection

```tsx
const table = createTable<User>({
  data: () => users(),
  columns: [...],
  selection: { enabled: true, mode: 'multi' },
})

<button onclick={() => deleteSelected(table.selected())}>
  Delete {() => table.selected().size} selected
</button>
<table.Root />
```

## Notes

- `data` must be a reactive getter `() => myData()` — not a static array.
- Custom `cell` renderers return a DOM `Node` or `Element` — use JSX or `document.createElement`.
- `_`-prefixed column keys (like `_actions`) are virtual columns with no data binding.
- `unstyled: true` skips the automatic CSS injection — bring your own styles using BEM classes `.lf-table-*`.
