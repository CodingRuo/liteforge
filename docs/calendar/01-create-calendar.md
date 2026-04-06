---
title: "createCalendar"
category: "calendar"
tags: ["calendar", "createCalendar", "events", "drag-drop", "resources", "recurring", "views"]
related: ["createTable", "Signals"]
---

# createCalendar

> Signals-based scheduling calendar with day/week/month/agenda views, resources, drag & drop, and recurring events.

## Installation

```bash
npm install @liteforge/calendar
```

## Quick Start

```tsx
import { createCalendar } from '@liteforge/calendar'
import { signal } from '@liteforge/core'

const events = signal<CalendarEvent[]>([
  {
    id: '1',
    title: 'Team Meeting',
    start: new Date('2026-04-07T10:00:00'),
    end: new Date('2026-04-07T11:00:00'),
  },
])

const calendar = createCalendar({
  events: () => events(),
  view: 'week',
  locale: 'en-US',
  editable: true,
  selectable: true,
  onEventDrop: (event, newStart, newEnd) => {
    events.update(es => es.map(e => e.id === event.id ? { ...e, start: newStart, end: newEnd } : e))
  },
  onSlotClick: (start, end, resourceId) => {
    // Create new event
  },
})

// In JSX:
<calendar.Toolbar />
<calendar.Root />
```

## API Reference

### `createCalendar(options)` → `CalendarResult`

**Options (`CalendarOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `events` | `() => CalendarEvent[]` | required | Reactive events array |
| `view` | `CalendarView` | `'week'` | Initial view |
| `resources` | `Resource[]` | — | Resource columns (therapists, rooms, etc.) |
| `editable` | `boolean` | `false` | Allow drag & resize |
| `selectable` | `boolean` | `false` | Allow click-to-create |
| `locale` | `string` | `'en-US'` | BCP 47 locale for formatting |
| `time` | `TimeConfig` | — | Day start/end, slot duration, week start |
| `toolbar` | `ToolbarConfig` | — | Toolbar customization |
| `responsive` | `ResponsiveConfig` | — | Responsive breakpoints |
| `selection` | `SelectionConfig` | — | Slot selection config |
| `unstyled` | `boolean` | `false` | Skip default CSS |
| `classes` | `CalendarClasses` | — | BEM class overrides |
| `onEventDrop` | `(event, newStart, newEnd, resourceId?) => void` | — | Drag drop callback |
| `onEventResize` | `(event, newEnd) => void` | — | Resize callback |
| `onSlotClick` | `(start, end, resourceId?) => void` | — | Slot click callback |
| `onEventClick` | `(event) => void` | — | Event click callback |
| `onEventConflict` | `'warn' \| 'block' \| 'ignore'` | `'ignore'` | Conflict handling |
| `eventTooltip` | `{ fn: (event) => Node }` | — | Custom tooltip renderer |

**`CalendarView`:** `'day' \| 'week' \| 'month' \| 'agenda' \| 'timeline' \| 'quarter' \| 'year'`

**`TimeConfig`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `dayStart` | `number` | `0` | Hour day starts (0–23) |
| `dayEnd` | `number` | `24` | Hour day ends (0–24) |
| `slotDuration` | `number` | `30` | Slot height in minutes |
| `weekStart` | `number` | `0` | First day of week (0=Sun, 1=Mon) |

**Returns (`CalendarResult`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `Root` | `ComponentFactory` | The main calendar component |
| `Toolbar` | `ComponentFactory` | Navigation toolbar |
| `currentDate` | `Signal<Date>` | Currently displayed date |
| `currentView` | `Signal<CalendarView>` | Current view |
| `next()` | `void` | Navigate forward |
| `prev()` | `void` | Navigate backward |
| `today()` | `void` | Jump to today |
| `setView(view)` | `void` | Switch view |
| `setDate(date)` | `void` | Jump to specific date |
| `toggleResource(id)` | `void` | Show/hide a resource column |
| `selectedResources` | `Signal<string[]>` | Active resource IDs |

### `CalendarEvent`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique event ID |
| `title` | `string` | Event title |
| `start` | `Date` | Start date/time |
| `end` | `Date` | End date/time |
| `allDay` | `boolean?` | All-day event |
| `color` | `string?` | Event color |
| `resourceId` | `string?` | Associated resource ID |
| `recurring` | `RecurringRule?` | Recurrence rule |
| `indicators` | `EventIndicator[]?` | Dot indicators |

### `Resource`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Resource ID |
| `name` | `string` | Display name |
| `color` | `string?` | Resource color |
| `workingHours` | `WorkingHours?` | Working hours config |

## Examples

### Multi-resource day view

```ts
const calendar = createCalendar({
  events: () => appointments(),
  view: 'day',
  resources: [
    { id: 'dr-anna', name: 'Dr. Anna', color: '#3b82f6' },
    { id: 'dr-tom', name: 'Dr. Tom', color: '#10b981' },
  ],
  time: { dayStart: 8, dayEnd: 20, slotDuration: 15 },
  editable: true,
  onEventDrop: (event, newStart, newEnd, resourceId) => {
    updateAppointment({ ...event, start: newStart, end: newEnd, resourceId })
  },
})
```

### Recurring event

```ts
const event: CalendarEvent = {
  id: 'weekly-standup',
  title: 'Standup',
  start: new Date('2026-04-07T09:00:00'),
  end: new Date('2026-04-07T09:15:00'),
  recurring: { frequency: 'weekly', interval: 1, byweekday: ['MO', 'TU', 'WE', 'TH', 'FR'] },
}
```

## Notes

- `events` must be a reactive getter `() => myEvents()` — not a static array.
- Drag & drop uses native Pointer Events on a grid container, not individual event elements.
- `onEventDrop` / `onEventResize` are your responsibility to apply to state — the calendar does not mutate your data.
- `iCal` import/export: use `exportToICal()`, `downloadICal()`, `importFromICal()` exported from `@liteforge/calendar`.
- Date utilities (e.g. `addDays`, `startOfWeek`, `formatDate`) are exported from `@liteforge/calendar` for convenience.
