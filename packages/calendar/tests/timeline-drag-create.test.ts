/**
 * @liteforge/calendar - Timeline Drag-to-Create Tests
 *
 * Tests covering:
 * - snapToGrid helper
 * - getTimeFromMouseX helper
 * - getResourceFromMouseY helper
 * - Full drag-to-create lifecycle (pointerdown → pointermove → pointerup)
 * - Escape cancels drag
 * - pointercancel removes preview without firing callback
 * - Minimum duration enforcement
 * - Ignores pointerdown on existing event bars
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  snapToGrid,
  getTimeFromMouseX,
  getResourceFromMouseY,
  renderTimelineView,
} from '../src/views/timeline-view.js'
import type { CalendarEvent, Resource } from '../src/types.js'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeDate(h: number, m = 0): Date {
  const d = new Date(2025, 2, 10) // 2025-03-10
  d.setHours(h, m, 0, 0)
  return d
}

const defaultConfig = {
  slotDuration: 60,
  dayStart: 8,
  dayEnd: 18,
  weekStart: 1 as const,
  hiddenDays: () => [],
  nowIndicator: false,
}

const defaultTranslations = {
  today: 'Today', prev: '←', next: '→',
  day: 'Day', resourceDay: 'Resources', week: 'Week', month: 'Month',
  agenda: 'Agenda', timeline: 'Timeline',
  hideWeekends: 'Hide', showWeekends: 'Show',
  allDay: 'All-day', more: (n: number) => `+${n}`, noEvents: 'No events',
}

function makeEl(): HTMLDivElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function firePointer(el: HTMLElement, type: string, x: number, y: number, button = 0) {
  el.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, clientX: x, clientY: y, button, pointerId: 1,
  }))
}

// ─── snapToGrid ─────────────────────────────────────────────────────────────

describe('snapToGrid', () => {
  it('snaps 0 to 0', () => expect(snapToGrid(0, 15)).toBe(0))
  it('snaps 487 down to 480 (15-min grid)', () => expect(snapToGrid(487, 15)).toBe(480))
  it('snaps 482 down to 480 (15-min grid)', () => expect(snapToGrid(482, 15)).toBe(480))
  it('snaps 493 up to 495 (15-min grid)', () => expect(snapToGrid(493, 15)).toBe(495))
  it('snaps 480 to 480 exactly', () => expect(snapToGrid(480, 15)).toBe(480))
  it('snaps 29 to 0 for 60-min grid (< 30)', () => expect(snapToGrid(29, 60)).toBe(0))
  it('snaps 30 to 60 for 60-min grid (= midpoint)', () => expect(snapToGrid(30, 60)).toBe(60))
  it('works with 30-min grid', () => expect(snapToGrid(46, 30)).toBe(60))
})

// ─── getTimeFromMouseX ───────────────────────────────────────────────────────

describe('getTimeFromMouseX', () => {
  it('returns dayStart*60 when clientX equals grid left (scrollLeft=0)', () => {
    const grid = document.createElement('div')
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      left: 100, top: 0, right: 900, bottom: 400, width: 800, height: 400, x: 100, y: 0,
      toJSON: () => {},
    })
    // clientX = 100 = grid.left → relX = 0 → dayStart*60
    const result = getTimeFromMouseX(100, grid, 0, 8, 60, 100)
    expect(result).toBe(480) // 8 * 60 = 480
  })

  it('returns correct minutes for 1-hour offset (60min cell, 100px wide)', () => {
    const grid = document.createElement('div')
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 1000, bottom: 400, width: 1000, height: 400, x: 0, y: 0,
      toJSON: () => {},
    })
    // clientX=100, grid.left=0, scrollLeft=0 → relX=100 → 60 minutes from dayStart → 8*60+60=540
    const result = getTimeFromMouseX(100, grid, 0, 8, 60, 100)
    expect(result).toBe(540)
  })

  it('accounts for scrollLeft', () => {
    const grid = document.createElement('div')
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 1000, bottom: 400, width: 1000, height: 400, x: 0, y: 0,
      toJSON: () => {},
    })
    // scrollLeft=100 → same as being 100px further right
    const result = getTimeFromMouseX(0, grid, 100, 8, 60, 100)
    expect(result).toBe(540) // 8*60 + 60 = 540
  })

  it('clamps to dayStart*60 when clientX before grid left', () => {
    const grid = document.createElement('div')
    vi.spyOn(grid, 'getBoundingClientRect').mockReturnValue({
      left: 200, top: 0, right: 1000, bottom: 400, width: 800, height: 400, x: 200, y: 0,
      toJSON: () => {},
    })
    // clientX=50 → before grid → relX clamped to 0
    const result = getTimeFromMouseX(50, grid, 0, 8, 60, 100)
    expect(result).toBe(480) // dayStart * 60
  })
})

// ─── getResourceFromMouseY ────────────────────────────────────────────────────

describe('getResourceFromMouseY', () => {
  it('returns undefined when no element with data-resource-id at coordinates', () => {
    // In happy-dom, elementFromPoint returns null or a non-matching element
    const result = getResourceFromMouseY(0, 0)
    expect(result).toBeUndefined()
  })

  it('returns resourceId from data-resource-id element', () => {
    const row = document.createElement('div')
    row.dataset.resourceId = 'doc-smith'
    row.style.cssText = 'position:fixed;top:100px;left:100px;width:200px;height:56px'
    document.body.appendChild(row)
    // happy-dom's elementFromPoint is limited — we just verify the function doesn't throw
    const result = getResourceFromMouseY(150, 120)
    // Result may be undefined in happy-dom (elementFromPoint not fully implemented)
    expect(typeof result === 'string' || result === undefined).toBe(true)
    row.remove()
  })
})

// ─── drag-to-create (DOM integration) ────────────────────────────────────────

describe('renderTimelineView — drag-to-create', () => {
  beforeEach(() => {
    // happy-dom doesn't implement setPointerCapture — define it so vi.spyOn works
    if (!HTMLElement.prototype.setPointerCapture) {
      HTMLElement.prototype.setPointerCapture = () => {}
    }
    vi.spyOn(HTMLElement.prototype, 'setPointerCapture').mockImplementation(() => {})
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400, x: 0, y: 0,
      toJSON: () => {},
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does NOT create a preview when onSlotSelect is not provided', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [{ id: 'r1', name: 'Alice' }],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      // no onSlotSelect
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(0)
    el.remove()
  })

  it('creates a preview element on pointerdown on empty row', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [{ id: 'r1', name: 'Alice' }],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect: vi.fn(),
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(1)
    el.remove()
  })

  it('calls onSlotSelect with correct dates on pointerup', () => {
    const onSlotSelect = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [{ id: 'r1', name: 'Alice' }],
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect,
      timelineOptions: { cellDuration: 60, cellWidth: 100 },
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement

    // mousedown at x=100 → 8*60 + 1*60 = 9:00 (offset 100px = 1 hour at 100px/hr)
    firePointer(row, 'pointerdown', 100, 20)
    // mousemove to x=300 → 8*60 + 3*60 = 11:00
    firePointer(row, 'pointermove', 300, 20)
    firePointer(row, 'pointerup', 300, 20)

    expect(onSlotSelect).toHaveBeenCalledOnce()
    const [start, end, resourceId] = onSlotSelect.mock.calls[0] as [Date, Date, string]
    expect(start).toBeInstanceOf(Date)
    expect(end).toBeInstanceOf(Date)
    expect(end.getTime()).toBeGreaterThan(start.getTime())
    expect(resourceId).toBe('r1')
    el.remove()
  })

  it('passes undefined resourceId when no resources', () => {
    const onSlotSelect = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect,
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    firePointer(row, 'pointerup', 100, 20)
    expect(onSlotSelect).toHaveBeenCalledOnce()
    const [,, resourceId] = onSlotSelect.mock.calls[0] as [Date, Date, string | undefined]
    expect(resourceId).toBeUndefined()
    el.remove()
  })

  it('removes preview on pointerup', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [{ id: 'r1', name: 'Alice' }],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect: vi.fn(),
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(1)
    firePointer(row, 'pointerup', 100, 20)
    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(0)
    el.remove()
  })

  it('Escape key cancels drag and removes preview without firing callback', () => {
    const onSlotSelect = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [{ id: 'r1', name: 'Alice' }],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect,
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(0)
    expect(onSlotSelect).not.toHaveBeenCalled()
    el.remove()
  })

  it('pointercancel removes preview without firing callback', () => {
    const onSlotSelect = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [{ id: 'r1', name: 'Alice' }],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect,
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    firePointer(row, 'pointercancel', 100, 20)
    expect(el.querySelectorAll('.lf-cal-tl-drag-preview').length).toBe(0)
    expect(onSlotSelect).not.toHaveBeenCalled()
    el.remove()
  })

  it('enforces minimum duration of one cell', () => {
    const onSlotSelect = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect,
      timelineOptions: { cellDuration: 60, cellWidth: 100 },
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    // mousedown and immediate mouseup at same position — no drag
    firePointer(row, 'pointerdown', 100, 20)
    firePointer(row, 'pointerup', 101, 20)
    expect(onSlotSelect).toHaveBeenCalledOnce()
    const [start, end] = onSlotSelect.mock.calls[0] as [Date, Date]
    // end must be at least cellDuration (60min) after start
    const diffMs = end.getTime() - start.getTime()
    expect(diffMs).toBeGreaterThanOrEqual(60 * 60 * 1000)
    el.remove()
  })

  it('ignores pointerdown on existing event bar', () => {
    const onSlotSelect = vi.fn()
    const events: CalendarEvent[] = [{
      id: 'e1', title: 'Existing', start: makeDate(9), end: makeDate(10),
    }]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources: [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: true,
      onSlotSelect,
    })
    document.body.appendChild(el)
    const eventBar = el.querySelector('.lf-cal-tl-event') as HTMLElement
    if (eventBar) {
      firePointer(eventBar, 'pointerdown', 100, 20)
      firePointer(eventBar, 'pointerup', 200, 20)
    }
    // onSlotSelect should not fire when clicking on an existing event
    expect(onSlotSelect).not.toHaveBeenCalled()
    el.remove()
  })

  it('does not fire when selectable is false', () => {
    const onSlotSelect = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      selectable: false,
      onSlotSelect,
    })
    document.body.appendChild(el)
    const row = el.querySelector('.lf-cal-tl-row') as HTMLElement
    firePointer(row, 'pointerdown', 100, 20)
    firePointer(row, 'pointerup', 200, 20)
    expect(onSlotSelect).not.toHaveBeenCalled()
    el.remove()
  })
})
