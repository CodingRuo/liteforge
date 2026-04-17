---
title: "Admin"
category: "admin"
tags: ["admin", "defineResource", "defineDashboard", "AdminLayout", "DataTable", "ResourceForm"]
related: ["createTable", "createForm", "defineRouter"]
---

# Admin

> Declarative admin UI builder: resource-based CRUD, dashboard widgets, activity log, and auto-generated routes.

## Installation

```bash
npm install @liteforge/admin
```

## Quick Start

```ts
import { defineResource, buildAdminRoutes, adminPlugin } from '@liteforge/admin'
import { defineApp } from '@liteforge/runtime'
import { defineRouter, createBrowserHistory } from '@liteforge/router'
import { z } from 'zod'

const userResource = defineResource({
  name: 'users',
  label: 'Users',
  endpoint: '/api/users',
  schema: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['admin', 'user']),
  }),
  list: {
    columns: [
      { field: 'name', label: 'Name' },
      { field: 'email', label: 'Email' },
      { field: 'role', label: 'Role' },
    ],
  },
  form: {
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'role', label: 'Role', type: 'select', options: ['admin', 'user'] },
    ],
  },
})

const adminRoutes = buildAdminRoutes([userResource])
const router = defineRouter({ history: createBrowserHistory(), routes: adminRoutes })

await defineApp({ root: App, target: '#app' })
  .use(routerPlugin(router))
  .use(adminPlugin())
```

## API Reference

### `defineResource<T>(options)` → `ResourceDefinition<T>`

Define a CRUD resource.

**Options (`DefineResourceOptions<T>`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | required | Resource name (used in routes and API) |
| `label` | `string` | Capitalized name | Display label |
| `endpoint` | `string` | required | API base URL |
| `schema` | `z.ZodObject` | — | Zod schema for form validation |
| `actions` | `AdminAction[]` | all | Enabled actions: `'index' \| 'show' \| 'create' \| 'edit' \| 'destroy'` |
| `list` | `ListConfig` | — | List view config (columns, filters, pagination) |
| `show` | `ShowConfig` | — | Detail view config |
| `form` | `FormConfig` | — | Create/edit form config |
| `hooks` | `ResourceHooks<T>` | — | Before/after hooks for CRUD operations |
| `rowActions` | `RowAction<T>[]` | — | Per-row action buttons |
| `bulkActions` | `BulkAction<T>[]` | — | Multi-row bulk actions |
| `permissions` | `ResourcePermissions` | — | Permission checks per action |

### `defineDashboard(config)` → `DashboardConfig`

Define a dashboard with widgets.

**`DashboardWidgetConfig`:**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `DashboardWidgetType` | `'stat' \| 'chart' \| 'list' \| 'custom'` |
| `title` | `string` | Widget title |
| `data` | `() => unknown` | Reactive data source |
| `component` | `ComponentFactory` | Custom widget component |

### `buildAdminRoutes(resources, options?)` → `RouteDefinition[]`

Generate router routes for all defined resources.

### Components

| Component | Description |
|-----------|-------------|
| `AdminLayout` | Top-level layout with sidebar nav |
| `DataTable` | Resource list table with actions |
| `DetailView` | Resource detail/show view |
| `ResourceForm` | Create/edit form |
| `ConfirmDialog` | Confirmation dialog for destructive actions |
| `Dashboard` | Dashboard with widgets |
| `ActivityLogView` | Activity log viewer |

### Hooks

```ts
import { useList, useRecord, useResource } from '@liteforge/admin'

// List of records
const { records, isLoading, page, setPage } = useList('users')

// Single record
const { record, isLoading } = useRecord('users', '42')

// Full resource API
const { resource, list, create, update, destroy } = useResource('users')
```

### Activity log

```ts
import { logActivity, activityLog } from '@liteforge/admin'

logActivity({ action: 'update', resourceName: 'users', recordId: '42', label: 'Updated Alice' })
activityLog()  // Signal<ActivityEntry[]>
```

## Examples

### Resource with custom row action

```ts
const productResource = defineResource({
  name: 'products',
  endpoint: '/api/products',
  list: {
    columns: [
      { field: 'name', label: 'Name' },
      { field: 'price', label: 'Price' },
    ],
  },
  rowActions: [
    {
      label: 'Duplicate',
      icon: 'copy',
      action: async (row) => {
        await fetch('/api/products', {
          method: 'POST',
          body: JSON.stringify({ ...row, name: `${row.name} (copy)` }),
        })
      },
    },
  ],
})
```

### Permission-gated actions

```ts
const sensitiveResource = defineResource({
  name: 'audit-logs',
  endpoint: '/api/audit',
  permissions: {
    index: () => hasRole('admin'),
    show: () => hasRole('admin'),
    create: () => false,  // no one can create
    edit: () => false,
    destroy: () => false,
  },
})
```

## Notes

- `buildAdminRoutes` generates nested routes like `/admin/users`, `/admin/users/new`, `/admin/users/:id`, `/admin/users/:id/edit`.
- `AdminLayout` renders a sidebar with links to all registered resources.
- `setAdminTheme('dark' | 'light')` switches the admin panel theme.
- `injectAdminStyles()` / `resetStylesInjection()` control CSS injection (useful for testing).
