/**
 * @liteforge/calendar - Timeline View Tests
 *
 * Tests covering:
 * - calculateTimelinePosition
 * - getNowIndicatorPosition
 * - filterResourcesByViewport
 * - createHorizontalScrollHandler
 * - HorizontalVisibleRange signal updates
 * - renderTimelineView (DOM structure, events, drag/resize)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateTimelinePosition,
  getNowIndicatorPosition,
  filterResourcesByViewport,
  createHorizontalScrollHandler,
} from '../src/virtualization.js'
import { renderTimelineView } from '../src/views/timeline-view.js'
import type { CalendarEvent, Resource } from '../src/types.js'
import type { HorizontalVisibleRange } from '../src/virtualization.js'

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeDate(h: number, m = 0): Date {
  const d = new Date(2025, 2, 10) // 2025-03-10
  d.setHours(h, m, 0, 0)
  return d
}

function makeEvent(
  id: string,
  startH: number,
  endH: number,
  resourceId?: string,
): CalendarEvent {
  return {
    id,
    title: `Event ${id}`,
    start: makeDate(startH),
    end: makeDate(endH),
    ...(resourceId !== undefined ? { resourceId } : {}),
  }
}

const defaultConfig = {
  slotDuration: 30,
  dayStart: 0,
  dayEnd: 24,
  weekStart: 1 as const,
  hiddenDays: () => [],
  nowIndicator: true,
}

const defaultTranslations = {
  today: 'Today', prev: '←', next: '→',
  day: 'Day', resourceDay: 'Resources', week: 'Week', month: 'Month',
  agenda: 'Agenda', timeline: 'Timeline',
  hideWeekends: 'Hide', showWeekends: 'Show',
  allDay: 'All-day', more: (n: number) => `+${n}`, noEvents: 'No events',
}

// ─── calculateTimelinePosition ────────────────────────────────────────────

describe('calculateTimelinePosition', () => {
  // dayStart=0, cellDuration=60, cellWidth=100 → pxPerMinute = 100/60 ≈ 1.6667

  it('event at hour 0 starts at left=0', () => {
    const { left } = calculateTimelinePosition(makeDate(0), makeDate(1), 0, 60, 100)
    expect(left).toBe(0)
  })

  it('event at hour 8 starts at 800px (60min cells, 100px wide)', () => {
    const { left } = calculateTimelinePosition(makeDate(8), makeDate(9), 0, 60, 100)
    expect(left).toBeCloseTo(800, 0)
  })

  it('1-hour event is 100px wide', () => {
    const { width } = calculateTimelinePosition(makeDate(8), makeDate(9), 0, 60, 100)
    expect(width).toBeCloseTo(100, 0)
  })

  it('30-minute event is 50px wide', () => {
    const { width } = calculateTimelinePosition(makeDate(8), makeDate(8, 30), 0, 60, 100)
    expect(width).toBeCloseTo(50, 0)
  })

  it('zero-duration event gets minimum width of 2px', () => {
    const { width } = calculateTimelinePosition(makeDate(8), makeDate(8), 0, 60, 100)
    expect(width).toBe(2)
  })

  it('works with non-zero dayStart', () => {
    // dayStart=8 → hour 8 is at left=0
    const { left } = calculateTimelinePosition(makeDate(8), makeDate(9), 8, 60, 100)
    expect(left).toBeCloseTo(0, 0)
  })

  it('works with 30-minute cell duration', () => {
    // cellDuration=30, cellWidth=60 → pxPerMinute = 60/30 = 2
    const { left, width } = calculateTimelinePosition(makeDate(8), makeDate(9), 8, 30, 60)
    expect(left).toBeCloseTo(0, 0)
    expect(width).toBeCloseTo(120, 0) // 60 min × 2 px/min
  })

  it('event at 8:30 with dayStart=8 gives correct left offset', () => {
    const { left } = calculateTimelinePosition(makeDate(8, 30), makeDate(9), 8, 60, 100)
    expect(left).toBeCloseTo(50, 0) // 30 min × 100/60
  })
})

// ─── getNowIndicatorPosition ──────────────────────────────────────────────

describe('getNowIndicatorPosition', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns null when current time is before dayStart', () => {
    vi.setSystemTime(makeDate(7, 30))
    const pos = getNowIndicatorPosition(8, 20, 60, 100)
    expect(pos).toBeNull()
  })

  it('returns null when current time is after dayEnd', () => {
    vi.setSystemTime(makeDate(21))
    const pos = getNowIndicatorPosition(8, 20, 60, 100)
    expect(pos).toBeNull()
  })

  it('returns 0 when current time equals dayStart', () => {
    vi.setSystemTime(makeDate(8))
    const pos = getNowIndicatorPosition(8, 20, 60, 100)
    expect(pos).toBeCloseTo(0, 0)
  })

  it('returns correct px for midday when dayStart=8', () => {
    vi.setSystemTime(makeDate(12))
    // 12:00 = 720 mins, dayStart = 480 mins, offset = 240 mins
    // pxPerMinute = 100/60; left = 240 * (100/60) ≈ 400
    const pos = getNowIndicatorPosition(8, 20, 60, 100)
    expect(pos).toBeCloseTo(400, 0)
  })

  it('works with 30-minute cell duration', () => {
    vi.setSystemTime(makeDate(9))
    // pxPerMinute = 60/30 = 2; offset = 60 min; left = 120
    const pos = getNowIndicatorPosition(8, 20, 30, 60)
    expect(pos).toBeCloseTo(120, 0)
  })

  it('returns a number within expected range for current hour', () => {
    vi.setSystemTime(makeDate(10))
    const pos = getNowIndicatorPosition(8, 20, 60, 100)
    expect(pos).not.toBeNull()
    expect(pos as number).toBeGreaterThan(0)
  })
})

// ─── filterResourcesByViewport ────────────────────────────────────────────

describe('filterResourcesByViewport', () => {
  const resources: Resource[] = Array.from({ length: 20 }, (_, i) => ({
    id: `r${i}`,
    name: `Resource ${i}`,
  }))

  it('returns empty array for empty resources', () => {
    const result = filterResourcesByViewport([], 48, 0, 200)
    expect(result).toHaveLength(0)
  })

  it('returns first N rows for scrollTop=0', () => {
    // rowHeight=48, containerHeight=240 → visibleRows ≈ 5; overscan=2 → 0..6
    const result = filterResourcesByViewport(resources, 48, 0, 240, 2)
    expect(result.length).toBeGreaterThanOrEqual(5)
    expect(result[0]?.id).toBe('r0')
  })

  it('returns resources including overscan on both sides when scrolled', () => {
    // Scroll to row 5 (scrollTop = 5*48 = 240)
    // visible rows: 5..9 (240px container shows 5 rows)
    // with overscan=2: rows 3..11
    const result = filterResourcesByViewport(resources, 48, 240, 240, 2)
    const ids = result.map(r => r.id)
    expect(ids).toContain('r3')  // overscan above
    expect(ids).toContain('r5')  // first visible
    expect(ids).toContain('r9')  // last visible
    expect(ids).toContain('r11') // overscan below
  })

  it('clamps to array bounds (no out-of-range items)', () => {
    // All 20 resources fit in viewport
    const result = filterResourcesByViewport(resources, 48, 0, 2000, 2)
    expect(result.length).toBe(20)
  })

  it('with scrollTop near end, clamps upper bound', () => {
    // Scroll to near the end: row 18 (scrollTop = 864)
    const result = filterResourcesByViewport(resources, 48, 864, 200, 2)
    const ids = result.map(r => r.id)
    expect(ids).toContain('r19')
    expect(ids.some(id => parseInt(id.slice(1)) > 19)).toBe(false)
  })

  it('default overscan is 2', () => {
    const resultDefault = filterResourcesByViewport(resources, 48, 0, 48)
    const resultExplicit = filterResourcesByViewport(resources, 48, 0, 48, 2)
    expect(resultDefault.length).toBe(resultExplicit.length)
  })

  it('preserves resource object identity (no copies)', () => {
    const result = filterResourcesByViewport(resources, 48, 0, 96)
    for (const r of result) {
      expect(resources).toContain(r)
    }
  })
})

// ─── createHorizontalScrollHandler ────────────────────────────────────────

describe('createHorizontalScrollHandler', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('initial visible range covers the full day', () => {
    const { visibleRange } = createHorizontalScrollHandler(0, 24, 60, 100)
    const range = visibleRange()
    expect(range.startMinutes).toBe(0)
    expect(range.endMinutes).toBe(24 * 60)
  })

  it('initial visible range with dayStart=8', () => {
    const { visibleRange } = createHorizontalScrollHandler(8, 20, 60, 100)
    const range = visibleRange()
    expect(range.startMinutes).toBe(480)    // 8*60
    expect(range.endMinutes).toBeLessThanOrEqual(1200) // 20*60
  })

  it('onScroll updates visible range after debounce', () => {
    const { visibleRange, onScroll } = createHorizontalScrollHandler(0, 24, 60, 100)
    // Scroll 500px → startMins = floor(500 / (100/60)) = floor(300) = 300 min = 5h
    onScroll(500, 600)
    vi.runAllTimers()

    const range = visibleRange()
    expect(range.startMinutes).toBeGreaterThanOrEqual(290)
    expect(range.startMinutes).toBeLessThanOrEqual(310)
  })

  it('does not update before debounce fires', () => {
    const { visibleRange, onScroll } = createHorizontalScrollHandler(0, 24, 60, 100)
    const before = visibleRange().startMinutes

    onScroll(500, 600)
    // Timer NOT yet run
    expect(visibleRange().startMinutes).toBe(before)
  })

  it('dispose cancels pending timer', () => {
    const { visibleRange, onScroll, dispose } = createHorizontalScrollHandler(0, 24, 60, 100)
    const before = visibleRange().startMinutes

    onScroll(500, 600)
    dispose()
    vi.runAllTimers()

    expect(visibleRange().startMinutes).toBe(before) // still initial
  })

  it('clamps startMinutes to dayStart*60', () => {
    const { visibleRange, onScroll } = createHorizontalScrollHandler(8, 20, 60, 100)
    onScroll(-100, 600) // negative scroll
    vi.runAllTimers()

    expect(visibleRange().startMinutes).toBe(480) // 8*60 min
  })

  it('clamps endMinutes to dayEnd*60', () => {
    const { visibleRange, onScroll } = createHorizontalScrollHandler(8, 20, 60, 100)
    onScroll(99999, 600) // very far scroll
    vi.runAllTimers()

    expect(visibleRange().endMinutes).toBeLessThanOrEqual(1200) // 20*60
  })

  it('overscan is included in visible range signal', () => {
    const { visibleRange } = createHorizontalScrollHandler(0, 24, 60, 100, 90)
    expect(visibleRange().overscanMinutes).toBe(90)
  })

  it('rapid scrolls: only the last position wins (debounce collapses calls)', () => {
    const { visibleRange, onScroll } = createHorizontalScrollHandler(0, 24, 60, 100)
    onScroll(100, 600)
    onScroll(200, 600)
    onScroll(300, 600) // last call
    vi.runAllTimers()

    const range = visibleRange()
    // Should reflect scroll 300 not 100 or 200
    const expectedStart = Math.floor(300 / (100 / 60))
    expect(range.startMinutes).toBeCloseTo(expectedStart, 0)
  })

  it('returns typed HorizontalVisibleRange', () => {
    const { visibleRange } = createHorizontalScrollHandler(8, 20, 60, 100)
    const range: HorizontalVisibleRange = visibleRange()
    expect(typeof range.startMinutes).toBe('number')
    expect(typeof range.endMinutes).toBe('number')
    expect(typeof range.overscanMinutes).toBe('number')
  })
})

// ─── renderTimelineView ────────────────────────────────────────────────────

describe('renderTimelineView (DOM)', () => {
  it('renders a root element with timeline class', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    expect(el).toBeInstanceOf(HTMLDivElement)
    expect(el.className).toContain('lf-cal-timeline')
  })

  it('renders time header and body', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const header = el.querySelector('.lf-cal-tl-header')
    const body   = el.querySelector('.lf-cal-tl-body')
    expect(header).not.toBeNull()
    expect(body).not.toBeNull()
  })

  it('renders correct number of time cells (1 per hour for 8-18)', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      timelineOptions: { cellDuration: 60, cellWidth: 100 },
    })
    const cells = el.querySelectorAll('.lf-cal-tl-time-cell')
    expect(cells.length).toBe(10) // 18 - 8 = 10 hours
  })

  it('renders one time label cell per hour regardless of cell duration', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      timelineOptions: { cellDuration: 30, cellWidth: 60 },
    })
    const cells = el.querySelectorAll('.lf-cal-tl-time-cell')
    // Header always shows one label per hour (not per slot) for readability
    expect(cells.length).toBe(10) // 18 - 8 = 10 hours
  })

  it('renders resource label for each resource', () => {
    const resources: Resource[] = [
      { id: 'r1', name: 'Alice', color: '#3b82f6' },
      { id: 'r2', name: 'Bob' },
    ]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const labels = el.querySelectorAll('.lf-cal-tl-resource-label')
    expect(labels.length).toBe(2)
  })

  it('renders resource names in labels', () => {
    const resources: Resource[] = [
      { id: 'r1', name: 'Alice' },
      { id: 'r2', name: 'Bob' },
    ]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const names = Array.from(el.querySelectorAll('.lf-cal-tl-resource-name'))
      .map(n => n.textContent)
    expect(names).toContain('Alice')
    expect(names).toContain('Bob')
  })

  it('renders resource role when provided', () => {
    const resources: Resource[] = [
      { id: 'r1', name: 'Alice', role: 'Doctor' },
    ]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const role = el.querySelector('.lf-cal-tl-resource-role')
    expect(role?.textContent).toBe('Doctor')
  })

  it('renders event bars for matching day + resource', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [
      makeEvent('e1', 9, 10, 'r1'),
      makeEvent('e2', 11, 12, 'r1'),
    ]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const bars = el.querySelectorAll('.lf-cal-tl-event')
    expect(bars.length).toBe(2)
  })

  it('does not render events for a different day', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const tomorrow = new Date(2025, 2, 11) // day after makeDate
    tomorrow.setHours(9, 0, 0, 0)
    const endTomorrow = new Date(tomorrow)
    endTomorrow.setHours(10, 0, 0, 0)

    const events: CalendarEvent[] = [
      { id: 'e1', title: 'Tomorrow event', start: tomorrow, end: endTomorrow, resourceId: 'r1' },
    ]

    const el = renderTimelineView({
      date: () => makeDate(0), // 2025-03-10
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const bars = el.querySelectorAll('.lf-cal-tl-event')
    expect(bars.length).toBe(0)
  })

  it('does not render events for a different resource', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r2')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const bars = el.querySelectorAll('.lf-cal-tl-event')
    expect(bars.length).toBe(0)
  })

  it('event bar has correct title text', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const title = el.querySelector('.lf-cal-tl-event-title')
    expect(title?.textContent).toBe('Event e1')
  })

  it('event bar left/width match calculateTimelinePosition', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      timelineOptions: { cellDuration: 60, cellWidth: 100 },
    })
    const bar = el.querySelector('.lf-cal-tl-event') as HTMLDivElement | null
    expect(bar).not.toBeNull()
    // 9:00 from dayStart=8 → offset 60 min → 60 * (100/60) = 100px
    expect(bar!.style.left).toBe('100px')
    // 1h event → 100px wide
    expect(bar!.style.width).toBe('100px')
  })

  it('renders resource rows with data-resource-id', () => {
    const resources: Resource[] = [
      { id: 'r1', name: 'Alice' },
      { id: 'r2', name: 'Bob' },
    ]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const rows = el.querySelectorAll('.lf-cal-tl-row')
    const rowIds = Array.from(rows).map(r => (r as HTMLElement).dataset.resourceId)
    expect(rowIds).toContain('r1')
    expect(rowIds).toContain('r2')
  })

  it('renders resize handle when editable', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      editable: true,
      onEventResize: () => {},
    })
    const resizeHandle = el.querySelector('.lf-cal-tl-event-resize')
    expect(resizeHandle).not.toBeNull()
  })

  it('does not render resize handle when not editable', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      editable: false,
    })
    const resizeHandle = el.querySelector('.lf-cal-tl-event-resize')
    expect(resizeHandle).toBeNull()
  })

  it('calls onEventClick when event bar is clicked', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const onEventClick = vi.fn()
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      onEventClick,
    })
    const bar = el.querySelector('.lf-cal-tl-event') as HTMLElement
    bar.click()
    expect(onEventClick).toHaveBeenCalledWith(events[0])
  })

  it('uses custom eventContent renderer when provided', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      eventContent: (event) => {
        const span = document.createElement('span')
        span.className = 'custom-content'
        span.textContent = `custom:${event.id}`
        return span
      },
    })
    const custom = el.querySelector('.custom-content')
    expect(custom?.textContent).toBe('custom:e1')
  })

  it('applies custom class via classes override', () => {
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => [],
      resources: [],
      config: defaultConfig,
      locale: 'en-US',
      classes: { root: 'my-timeline-root' },
      translations: defaultTranslations,
    })
    expect(el.className).toBe('my-timeline-root')
  })

  it('event bar has aria-label attribute', () => {
    const resources: Resource[] = [{ id: 'r1', name: 'Alice' }]
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10, 'r1')]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources,
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const bar = el.querySelector('.lf-cal-tl-event')
    expect(bar?.getAttribute('aria-label')).toBeTruthy()
    expect(bar?.getAttribute('role')).toBe('button')
  })

  it('renders single row (no label) when no resources provided', () => {
    const events: CalendarEvent[] = [makeEvent('e1', 9, 10)]
    const el = renderTimelineView({
      date: () => makeDate(0),
      events: () => events,
      resources: [],
      config: { ...defaultConfig, dayStart: 8, dayEnd: 18 },
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const rows = el.querySelectorAll('.lf-cal-tl-row')
    const bars = el.querySelectorAll('.lf-cal-tl-event')
    expect(rows.length).toBe(1)
    expect(bars.length).toBe(1)
  })
})
