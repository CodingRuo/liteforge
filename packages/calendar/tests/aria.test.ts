/**
 * WAI-ARIA tests for @liteforge/calendar
 *
 * Verifies that the calendar emits correct ARIA roles, attributes, and
 * keyboard-interaction hooks for assistive technologies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCalendar } from '../src/calendar.js'
import { signal } from '@liteforge/core'
import type { CalendarEvent } from '../src/types.js'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeEvents(): CalendarEvent[] {
  const base = new Date(2026, 2, 9, 10, 0, 0) // Mon 9 Mar 2026 10:00
  return [
    { id: 'ev1', title: 'Team Meeting', start: base, end: new Date(2026, 2, 9, 11, 0) },
    { id: 'ev2', title: 'Lunch', start: new Date(2026, 2, 9, 12, 0), end: new Date(2026, 2, 9, 13, 0) },
    { id: 'ev3', title: 'All Day Event', start: new Date(2026, 2, 9), end: new Date(2026, 2, 10), allDay: true },
  ]
}

/** Mount root and return the container element */
function mount(cal: ReturnType<typeof createCalendar>): HTMLDivElement {
  const el = cal.Root() as HTMLDivElement
  document.body.appendChild(el)
  return el
}

/** Mount toolbar and return the toolbar element */
function mountToolbar(cal: ReturnType<typeof createCalendar>): HTMLDivElement {
  const el = cal.Toolbar() as HTMLDivElement
  document.body.appendChild(el)
  return el
}

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

// ─── Root / Application landmark ──────────────────────────────────────────

describe('Root landmark', () => {
  it('has role=application', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const root = mount(cal)
    expect(root.getAttribute('role')).toBe('application')
  })

  it('has aria-label with calendar label', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, locale: 'en-US' })
    const root = mount(cal)
    expect(root.getAttribute('aria-label')).toBe('Calendar')
  })

  it('respects translated label', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, locale: 'de' })
    const root = mount(cal)
    expect(root.getAttribute('aria-label')).toBe('Kalender')
  })

  it('contains a polite live region', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const root = mount(cal)
    const live = root.querySelector('[aria-live]')
    expect(live).not.toBeNull()
    expect(live!.getAttribute('aria-live')).toBe('polite')
    expect(live!.getAttribute('aria-atomic')).toBe('true')
  })

  it('live region announces current date on mount (month view)', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
      locale: 'en-US',
    })
    const root = mount(cal)
    const live = root.querySelector('[aria-live]') as HTMLElement
    // Should mention March and 2026
    expect(live.textContent).toMatch(/march/i)
    expect(live.textContent).toMatch(/2026/)
  })

  it('live region updates when navigating', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
      locale: 'en-US',
    })
    const root = mount(cal)
    const live = root.querySelector('[aria-live]') as HTMLElement
    cal.next() // → April 2026
    expect(live.textContent).toMatch(/april/i)
  })
})

// ─── Toolbar ───────────────────────────────────────────────────────────────

describe('Toolbar ARIA', () => {
  it('has role=toolbar', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const toolbar = mountToolbar(cal)
    expect(toolbar.getAttribute('role')).toBe('toolbar')
  })

  it('toolbar has aria-label', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const toolbar = mountToolbar(cal)
    expect(toolbar.getAttribute('aria-label')).toBeTruthy()
  })

  it('nav group has role=group', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const toolbar = mountToolbar(cal)
    const nav = toolbar.querySelector('.lf-cal-toolbar-nav')
    expect(nav?.getAttribute('role')).toBe('group')
  })

  it('prev button has aria-label', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const toolbar = mountToolbar(cal)
    // First button in nav = prev
    const nav = toolbar.querySelector('.lf-cal-toolbar-nav')
    const prevBtn = nav?.querySelector('button')
    expect(prevBtn?.getAttribute('aria-label')).toBeTruthy()
  })

  it('next button has aria-label', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const toolbar = mountToolbar(cal)
    const nav = toolbar.querySelector('.lf-cal-toolbar-nav')
    const buttons = nav?.querySelectorAll('button')
    const nextBtn = buttons?.[2] // prev, today, next
    expect(nextBtn?.getAttribute('aria-label')).toBeTruthy()
  })

  it('view buttons group has role=group', () => {
    const cal = createCalendar({ events: () => [], unstyled: true })
    const toolbar = mountToolbar(cal)
    const views = toolbar.querySelector('.lf-cal-toolbar-views')
    expect(views?.getAttribute('role')).toBe('group')
  })

  it('view buttons have aria-pressed', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, view: 'week' })
    const toolbar = mountToolbar(cal)
    const viewBtns = toolbar.querySelectorAll<HTMLButtonElement>('.lf-cal-toolbar-views button')
    expect(viewBtns.length).toBeGreaterThan(0)
    for (const btn of viewBtns) {
      expect(btn.getAttribute('aria-pressed')).toMatch(/^(true|false)$/)
    }
  })

  it('active view button has aria-pressed=true', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, view: 'week' })
    const toolbar = mountToolbar(cal)
    const weekBtn = toolbar.querySelector<HTMLButtonElement>('[data-view="week"]')
    expect(weekBtn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('inactive view buttons have aria-pressed=false', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, view: 'week' })
    const toolbar = mountToolbar(cal)
    const monthBtn = toolbar.querySelector<HTMLButtonElement>('[data-view="month"]')
    expect(monthBtn?.getAttribute('aria-pressed')).toBe('false')
  })

  it('aria-pressed updates when view changes', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, view: 'week' })
    const toolbar = mountToolbar(cal)
    const weekBtn = toolbar.querySelector<HTMLButtonElement>('[data-view="week"]')
    const monthBtn = toolbar.querySelector<HTMLButtonElement>('[data-view="month"]')
    expect(weekBtn?.getAttribute('aria-pressed')).toBe('true')
    expect(monthBtn?.getAttribute('aria-pressed')).toBe('false')
    cal.setView('month')
    expect(weekBtn?.getAttribute('aria-pressed')).toBe('false')
    expect(monthBtn?.getAttribute('aria-pressed')).toBe('true')
  })

  it('weekend toggle button has aria-pressed', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      toolbar: { showWeekendToggle: true },
    })
    const toolbar = mountToolbar(cal)
    const weekendBtn = toolbar.querySelector<HTMLButtonElement>('.lf-cal-toolbar-weekend-toggle')
    expect(weekendBtn?.getAttribute('aria-pressed')).toMatch(/^(true|false)$/)
  })

  it('weekend toggle aria-pressed reflects state', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      toolbar: { showWeekendToggle: true },
    })
    const toolbar = mountToolbar(cal)
    const weekendBtn = toolbar.querySelector<HTMLButtonElement>('.lf-cal-toolbar-weekend-toggle')
    // Initially weekends visible → hideWeekends button → not hidden → aria-pressed="false"
    const initialPressed = weekendBtn?.getAttribute('aria-pressed')
    cal.toggleWeekends()
    const afterPressed = weekendBtn?.getAttribute('aria-pressed')
    expect(initialPressed).not.toBe(afterPressed)
  })

  it('resource inline buttons have aria-pressed', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      resources: [
        { id: 'r1', name: 'Alice' },
        { id: 'r2', name: 'Bob' },
      ],
    })
    const toolbar = mountToolbar(cal)
    const resourceBtns = toolbar.querySelectorAll<HTMLButtonElement>('.lf-cal-toolbar-resource')
    expect(resourceBtns.length).toBe(2)
    for (const btn of resourceBtns) {
      expect(btn.getAttribute('aria-pressed')).toMatch(/^(true|false)$/)
    }
  })

  it('resource buttons group has role=group', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      resources: [{ id: 'r1', name: 'Alice' }],
    })
    const toolbar = mountToolbar(cal)
    const resGroup = toolbar.querySelector('.lf-cal-toolbar-resources')
    expect(resGroup?.getAttribute('role')).toBe('group')
  })
})

// ─── Toolbar: Dropdown modes ────────────────────────────────────────────────

describe('Toolbar dropdown ARIA', () => {
  it('view dropdown toggle has aria-haspopup=listbox', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      toolbar: { viewDisplay: 'dropdown' },
    })
    const toolbar = mountToolbar(cal)
    const toggle = toolbar.querySelector<HTMLButtonElement>('.lf-cal-toolbar-view-dropdown-toggle')
    expect(toggle?.getAttribute('aria-haspopup')).toBe('listbox')
  })

  it('view dropdown toggle starts with aria-expanded=false', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      toolbar: { viewDisplay: 'dropdown' },
    })
    const toolbar = mountToolbar(cal)
    const toggle = toolbar.querySelector<HTMLButtonElement>('.lf-cal-toolbar-view-dropdown-toggle')
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
  })

  it('view dropdown toggle aria-expanded toggles on click', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      toolbar: { viewDisplay: 'dropdown' },
    })
    const toolbar = mountToolbar(cal)
    const toggle = toolbar.querySelector<HTMLButtonElement>('.lf-cal-toolbar-view-dropdown-toggle')
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
    toggle?.click()
    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    toggle?.click()
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')
  })

  it('view dropdown menu has role=listbox', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      toolbar: { viewDisplay: 'dropdown' },
    })
    mountToolbar(cal)
    const menu = document.querySelector('#lf-cal-view-drop-menu')
    expect(menu?.getAttribute('role')).toBe('listbox')
  })

  it('view dropdown items have role=option and aria-selected', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      toolbar: { viewDisplay: 'dropdown' },
    })
    mountToolbar(cal)
    const menu = document.querySelector('#lf-cal-view-drop-menu')!
    const options = menu.querySelectorAll<HTMLElement>('[role="option"]')
    expect(options.length).toBeGreaterThan(0)
    for (const opt of options) {
      expect(opt.getAttribute('aria-selected')).toMatch(/^(true|false)$/)
    }
    // week option should be selected
    const weekOpt = menu.querySelector<HTMLElement>('[data-view="week"]')
    expect(weekOpt?.getAttribute('aria-selected')).toBe('true')
  })

  it('resource dropdown toggle has aria-haspopup=listbox', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      resources: [{ id: 'r1', name: 'Alice' }, { id: 'r2', name: 'Bob' }],
      toolbar: { resourceDisplay: 'dropdown' },
    })
    const toolbar = mountToolbar(cal)
    const toggle = toolbar.querySelector<HTMLButtonElement>('.lf-cal-toolbar-res-dropdown-toggle')
    expect(toggle?.getAttribute('aria-haspopup')).toBe('listbox')
  })

  it('resource dropdown menu has role=listbox with aria-multiselectable', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      resources: [{ id: 'r1', name: 'Alice' }],
      toolbar: { resourceDisplay: 'dropdown' },
    })
    mountToolbar(cal)
    const menu = document.querySelector('#lf-cal-res-drop-menu')
    expect(menu?.getAttribute('role')).toBe('listbox')
    expect(menu?.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('resource dropdown items have role=option and aria-selected', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      resources: [{ id: 'r1', name: 'Alice' }, { id: 'r2', name: 'Bob' }],
      toolbar: { resourceDisplay: 'dropdown' },
    })
    mountToolbar(cal)
    const menu = document.querySelector('#lf-cal-res-drop-menu')!
    const options = menu.querySelectorAll<HTMLElement>('[role="option"]')
    expect(options.length).toBe(2)
    for (const opt of options) {
      expect(opt.getAttribute('aria-selected')).toMatch(/^(true|false)$/)
    }
  })
})

// ─── Events: role, tabindex, keyboard ─────────────────────────────────────

describe('Event ARIA', () => {
  it('timed events have role=button and tabindex=0', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
    })
    const root = mount(cal)
    const events = root.querySelectorAll<HTMLElement>('.lf-cal-event:not(.lf-cal-event--allday)')
    expect(events.length).toBeGreaterThan(0)
    for (const ev of events) {
      expect(ev.getAttribute('role')).toBe('button')
      expect(ev.getAttribute('tabindex')).toBe('0')
    }
  })

  it('timed events have descriptive aria-label including title and time', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
    })
    const root = mount(cal)
    const meetingEl = root.querySelector<HTMLElement>('[data-event-id="ev1"]')
    expect(meetingEl?.getAttribute('aria-label')).toMatch(/Team Meeting/i)
    expect(meetingEl?.getAttribute('aria-label')).toMatch(/10/)
  })

  it('keyboard Enter triggers click on timed event', () => {
    const onClick = vi.fn()
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
      onEventClick: onClick,
    })
    const root = mount(cal)
    const eventEl = root.querySelector<HTMLElement>('[data-event-id="ev1"]')!
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'ev1' }))
  })

  it('keyboard Space triggers click on timed event', () => {
    const onClick = vi.fn()
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
      onEventClick: onClick,
    })
    const root = mount(cal)
    const eventEl = root.querySelector<HTMLElement>('[data-event-id="ev1"]')!
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'ev1' }))
  })

  it('all-day events have role=button and aria-label', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
    })
    const root = mount(cal)
    const allDayEl = root.querySelector<HTMLElement>('[data-event-id="ev3"]')
    expect(allDayEl?.getAttribute('role')).toBe('button')
    expect(allDayEl?.getAttribute('tabindex')).toBe('0')
    expect(allDayEl?.getAttribute('aria-label')).toMatch(/All Day Event/i)
  })

  it('selected event gets aria-selected=true', () => {
    const onEventClick = vi.fn()
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
      onEventClick,
    })
    const root = mount(cal)
    const eventEl = root.querySelector<HTMLElement>('[data-event-id="ev1"]')!
    // Initially not selected (null or 'false')
    const initialAriaSelected = eventEl.getAttribute('aria-selected')
    expect(initialAriaSelected === null || initialAriaSelected === 'false').toBe(true)
    // After click → selected
    eventEl.click()
    expect(eventEl.getAttribute('aria-selected')).toBe('true')
  })

  it('deselecting (clicking another event) sets aria-selected=false', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
      onEventClick: () => {},
    })
    const root = mount(cal)
    const ev1 = root.querySelector<HTMLElement>('[data-event-id="ev1"]')!
    const ev2 = root.querySelector<HTMLElement>('[data-event-id="ev2"]')!
    ev1.click()
    expect(ev1.getAttribute('aria-selected')).toBe('true')
    ev2.click()
    expect(ev1.getAttribute('aria-selected')).toBe('false')
    expect(ev2.getAttribute('aria-selected')).toBe('true')
  })
})

// ─── Month view grid ───────────────────────────────────────────────────────

describe('Month view ARIA', () => {
  it('month grid has role=grid', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
    })
    const root = mount(cal)
    const grid = root.querySelector('.lf-cal-month-grid')
    expect(grid?.getAttribute('role')).toBe('grid')
  })

  it('month header cells have role=columnheader', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
    })
    const root = mount(cal)
    const headers = root.querySelectorAll('.lf-cal-month-header-cell')
    expect(headers.length).toBe(7)
    for (const h of headers) {
      expect(h.getAttribute('role')).toBe('columnheader')
    }
  })

  it('month day cells have role=gridcell', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
    })
    const root = mount(cal)
    const cells = root.querySelectorAll('.lf-cal-month-cell')
    expect(cells.length).toBeGreaterThan(0)
    for (const cell of cells) {
      expect(cell.getAttribute('role')).toBe('gridcell')
    }
  })

  it('gridcell aria-label contains the date', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
      locale: 'en-US',
    })
    const root = mount(cal)
    // Find the cell for March 9
    const cells = Array.from(root.querySelectorAll<HTMLElement>('.lf-cal-month-cell'))
    const march9 = cells.find(c => {
      const label = c.getAttribute('aria-label') ?? ''
      return label.includes('9') && label.toLowerCase().includes('march')
    })
    expect(march9).toBeDefined()
  })

  it('gridcell with events mentions event count in aria-label', () => {
    const events: CalendarEvent[] = [
      { id: 'e1', title: 'A', start: new Date(2026, 2, 9, 9, 0), end: new Date(2026, 2, 9, 10, 0) },
      { id: 'e2', title: 'B', start: new Date(2026, 2, 9, 11, 0), end: new Date(2026, 2, 9, 12, 0) },
    ]
    const cal = createCalendar({
      events: () => events,
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
      locale: 'en-US',
    })
    const root = mount(cal)
    const cells = Array.from(root.querySelectorAll<HTMLElement>('.lf-cal-month-cell'))
    const march9 = cells.find(c => {
      const label = c.getAttribute('aria-label') ?? ''
      return label.includes('9') && label.toLowerCase().includes('march')
    })
    expect(march9?.getAttribute('aria-label')).toMatch(/2 event/i)
  })

  it('month events have role=button and aria-label', () => {
    const events: CalendarEvent[] = [
      { id: 'e1', title: 'Board Review', start: new Date(2026, 2, 9, 14, 0), end: new Date(2026, 2, 9, 15, 0) },
    ]
    const cal = createCalendar({
      events: () => events,
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
      onEventClick: () => {},
    })
    const root = mount(cal)
    const eventEl = root.querySelector<HTMLElement>('.lf-cal-month-event')
    expect(eventEl?.getAttribute('role')).toBe('button')
    expect(eventEl?.getAttribute('tabindex')).toBe('0')
    expect(eventEl?.getAttribute('aria-label')).toMatch(/Board Review/i)
  })

  it('month event keyboard activation triggers click', () => {
    const onClick = vi.fn()
    const events: CalendarEvent[] = [
      { id: 'e1', title: 'Standup', start: new Date(2026, 2, 9, 9, 0), end: new Date(2026, 2, 9, 10, 0) },
    ]
    const cal = createCalendar({
      events: () => events,
      unstyled: true,
      view: 'month',
      defaultDate: new Date(2026, 2, 1),
      onEventClick: onClick,
    })
    const root = mount(cal)
    const eventEl = root.querySelector<HTMLElement>('.lf-cal-month-event')!
    eventEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'e1' }))
  })
})

// ─── Agenda view ───────────────────────────────────────────────────────────

describe('Agenda view ARIA', () => {
  it('agenda container has role=list', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'agenda',
      defaultDate: new Date(2026, 2, 1),
    })
    const root = mount(cal)
    const agenda = root.querySelector('.lf-cal-agenda')
    expect(agenda).not.toBeNull()
    expect(agenda?.getAttribute('role')).toBe('list')
  })

  it('agenda day groups have role=listitem', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'agenda',
      defaultDate: new Date(2026, 2, 1),
    })
    const root = mount(cal)
    const groups = root.querySelectorAll('.lf-cal-agenda-day')
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      expect(g.getAttribute('role')).toBe('listitem')
    }
  })

  it('clickable agenda items have role=button, tabindex, and aria-label', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'agenda',
      defaultDate: new Date(2026, 2, 1),
      onEventClick: () => {},
    })
    const root = mount(cal)
    const items = root.querySelectorAll<HTMLElement>('.lf-cal-agenda-item[role="button"]')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) {
      expect(item.getAttribute('tabindex')).toBe('0')
      const label = item.getAttribute('aria-label') ?? ''
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('agenda item aria-label contains event title and time', () => {
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'agenda',
      defaultDate: new Date(2026, 2, 1),
      onEventClick: () => {},
    })
    const root = mount(cal)
    const meetingItem = Array.from(root.querySelectorAll<HTMLElement>('.lf-cal-agenda-item[role="button"]'))
      .find(el => el.getAttribute('aria-label')?.includes('Team Meeting'))
    expect(meetingItem).toBeDefined()
    expect(meetingItem?.getAttribute('aria-label')).toMatch(/10/)
  })

  it('agenda item keyboard Enter triggers click', () => {
    const onClick = vi.fn()
    const cal = createCalendar({
      events: () => makeEvents(),
      unstyled: true,
      view: 'agenda',
      defaultDate: new Date(2026, 2, 1),
      onEventClick: onClick,
    })
    const root = mount(cal)
    const meetingItem = Array.from(root.querySelectorAll<HTMLElement>('.lf-cal-agenda-item[role="button"]'))
      .find(el => el.getAttribute('aria-label')?.includes('Team Meeting'))!
    meetingItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'ev1' }))
  })
})

// ─── Week view structural ARIA ─────────────────────────────────────────────

describe('Week view ARIA', () => {
  it('header row has role=row', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
    })
    const root = mount(cal)
    const header = root.querySelector('.lf-cal-header')
    expect(header?.getAttribute('role')).toBe('row')
  })

  it('header cells have role=columnheader and aria-label with full date', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
      locale: 'en-US',
    })
    const root = mount(cal)
    const headerCells = root.querySelectorAll<HTMLElement>('.lf-cal-header-cell')
    expect(headerCells.length).toBeGreaterThan(0)
    for (const cell of headerCells) {
      expect(cell.getAttribute('role')).toBe('columnheader')
      const label = cell.getAttribute('aria-label') ?? ''
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('day columns have role=gridcell and aria-label', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
    })
    const root = mount(cal)
    const columns = root.querySelectorAll<HTMLElement>('.lf-cal-day-column')
    expect(columns.length).toBeGreaterThan(0)
    for (const col of columns) {
      expect(col.getAttribute('role')).toBe('gridcell')
      expect(col.getAttribute('aria-label')).toBeTruthy()
    }
  })

  it('grid row has role=row', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      view: 'week',
      defaultDate: new Date(2026, 2, 9),
    })
    const root = mount(cal)
    const grid = root.querySelector('.lf-cal-grid')
    expect(grid?.getAttribute('role')).toBe('row')
  })
})

// ─── Translations: accessibility labels ───────────────────────────────────

describe('ARIA translations', () => {
  it('German calendar label', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, locale: 'de' })
    const root = mount(cal)
    expect(root.getAttribute('aria-label')).toBe('Kalender')
  })

  it('French view selector label in toolbar', () => {
    const cal = createCalendar({ events: () => [], unstyled: true, locale: 'fr' })
    const toolbar = mountToolbar(cal)
    const views = toolbar.querySelector('.lf-cal-toolbar-views')
    expect(views?.getAttribute('aria-label')).toMatch(/vue/i)
  })

  it('custom translation override is applied', () => {
    const cal = createCalendar({
      events: () => [],
      unstyled: true,
      translations: { calendar: 'Mein Kalender' },
    })
    const root = mount(cal)
    expect(root.getAttribute('aria-label')).toBe('Mein Kalender')
  })
})
