/**
 * @liteforge/calendar - Quarter View & Year View Tests
 */

import { describe, it, expect, vi } from 'vitest'
import {
  getQuarterBounds,
  getQuarterLabel,
  navigateQuarter,
  getEventDotsForDay,
} from '../src/views/quarter-view.js'
import {
  getYearBounds,
  navigateYear,
  renderYearView,
} from '../src/views/year-view.js'
import { renderQuarterView } from '../src/views/quarter-view.js'
import type { CalendarEvent } from '../src/types.js'

// ─── Helpers ─────────────────────────────────────────────────

const defaultConfig = {
  slotDuration: 30,
  dayStart: 8,
  dayEnd: 20,
  weekStart: 1 as const,
  hiddenDays: () => [],
  nowIndicator: false,
}

const defaultTranslations = {
  today: 'Today',
  prev: '←',
  next: '→',
  day: 'Day',
  resourceDay: 'Resources',
  week: 'Week',
  month: 'Month',
  agenda: 'Agenda',
  timeline: 'Timeline',
  quarter: 'Quarter',
  year: 'Year',
  hideWeekends: 'Hide',
  showWeekends: 'Show',
  allDay: 'All-day',
  more: (n: number) => `+${n}`,
  noEvents: 'No events',
}

function makeEvent(
  id: string,
  start: Date,
  end: Date,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent {
  return { id, title: `Event ${id}`, start, end, ...extra }
}

// ─── getQuarterBounds ─────────────────────────────────────────

describe('getQuarterBounds', () => {
  it('Q1: Mar 15 → Jan 1 – Mar 31', () => {
    const { start, end } = getQuarterBounds(new Date('2026-03-15'))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(0) // January
    expect(start.getDate()).toBe(1)
    expect(end.getFullYear()).toBe(2026)
    expect(end.getMonth()).toBe(2) // March
    expect(end.getDate()).toBe(31)
  })

  it('Q3: Jul 1 → Jul 1 – Sep 30', () => {
    const { start, end } = getQuarterBounds(new Date('2026-07-01'))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(6) // July
    expect(start.getDate()).toBe(1)
    expect(end.getFullYear()).toBe(2026)
    expect(end.getMonth()).toBe(8) // September
    expect(end.getDate()).toBe(30)
  })

  it('Q4: Dec 31 → Oct 1 – Dec 31', () => {
    const { start, end } = getQuarterBounds(new Date('2026-12-31'))
    expect(start.getMonth()).toBe(9)  // October
    expect(start.getDate()).toBe(1)
    expect(end.getMonth()).toBe(11) // December
    expect(end.getDate()).toBe(31)
  })

  it('Q1: Jan 1 → Jan 1 – Mar 31', () => {
    const { start, end } = getQuarterBounds(new Date('2026-01-01'))
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
    expect(end.getMonth()).toBe(2)
    expect(end.getDate()).toBe(31)
  })
})

// ─── getQuarterLabel ──────────────────────────────────────────

describe('getQuarterLabel', () => {
  it('Q1: Jan 15 → "Q1 2026"', () => {
    expect(getQuarterLabel(new Date('2026-01-15'), 'en-US')).toBe('Q1 2026')
  })

  it('Q2: Apr 1 → "Q2 2026"', () => {
    expect(getQuarterLabel(new Date('2026-04-01'), 'en-US')).toBe('Q2 2026')
  })

  it('Q3: Jul 15 → "Q3 2026"', () => {
    expect(getQuarterLabel(new Date('2026-07-15'), 'en-US')).toBe('Q3 2026')
  })

  it('Q4: Oct 1 → "Q4 2026"', () => {
    expect(getQuarterLabel(new Date('2026-10-01'), 'en-US')).toBe('Q4 2026')
  })
})

// ─── navigateQuarter ──────────────────────────────────────────

describe('navigateQuarter', () => {
  it('Q1 → forward → Q2 (month index 3 = April)', () => {
    const result = navigateQuarter(new Date('2026-03-15'), 1)
    expect(result.getMonth()).toBe(3) // April
    expect(result.getFullYear()).toBe(2026)
    expect(result.getDate()).toBe(1)
  })

  it('Q1 → backward → Q4 of previous year', () => {
    const result = navigateQuarter(new Date('2026-01-01'), -1)
    expect(result.getMonth()).toBe(9) // October
    expect(result.getFullYear()).toBe(2025)
  })

  it('Q4 → forward → Q1 of next year', () => {
    const result = navigateQuarter(new Date('2026-12-01'), 1)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getFullYear()).toBe(2027)
  })

  it('Q2 → backward → Q1', () => {
    const result = navigateQuarter(new Date('2026-05-15'), -1)
    expect(result.getMonth()).toBe(0) // January
    expect(result.getFullYear()).toBe(2026)
  })
})

// ─── getEventDotsForDay ────────────────────────────────────────

describe('getEventDotsForDay', () => {
  it('day with 0 events → { count: 0, colors: [], hasMore: false }', () => {
    const result = getEventDotsForDay([], new Date('2026-03-15'))
    expect(result).toEqual({ count: 0, colors: [], hasMore: false })
  })

  it('day with 2 events → count=2, colors has 2, hasMore=false', () => {
    const date = new Date('2026-03-15')
    const events = [
      makeEvent('1', new Date('2026-03-15T09:00'), new Date('2026-03-15T10:00'), { color: '#f00' }),
      makeEvent('2', new Date('2026-03-15T11:00'), new Date('2026-03-15T12:00'), { color: '#0f0' }),
    ]
    const result = getEventDotsForDay(events, date)
    expect(result.count).toBe(2)
    expect(result.colors).toHaveLength(2)
    expect(result.colors[0]).toBe('#f00')
    expect(result.colors[1]).toBe('#0f0')
    expect(result.hasMore).toBe(false)
  })

  it('day with 5 events → count=5, colors has 3, hasMore=true', () => {
    const date = new Date('2026-03-15')
    const events = [1, 2, 3, 4, 5].map((i) =>
      makeEvent(
        String(i),
        new Date('2026-03-15T09:00'),
        new Date('2026-03-15T10:00'),
        { color: `#color${i}` }
      )
    )
    const result = getEventDotsForDay(events, date)
    expect(result.count).toBe(5)
    expect(result.colors).toHaveLength(3)
    expect(result.hasMore).toBe(true)
  })

  it('default color used when event has no color', () => {
    const date = new Date('2026-03-15')
    const events = [makeEvent('1', new Date('2026-03-15T09:00'), new Date('2026-03-15T10:00'))]
    const result = getEventDotsForDay(events, date)
    expect(result.colors[0]).toBe('#6366f1')
  })

  it('no crash on leap year Feb 29', () => {
    const date = new Date('2024-02-29')
    const events = [
      makeEvent('1', new Date('2024-02-29T09:00'), new Date('2024-02-29T10:00')),
    ]
    const result = getEventDotsForDay(events, date)
    expect(result.count).toBe(1)
  })

  it('all-day events show as dots', () => {
    const date = new Date('2026-03-15')
    const events = [
      makeEvent('1', new Date('2026-03-15'), new Date('2026-03-16'), { allDay: true }),
    ]
    const result = getEventDotsForDay(events, date)
    expect(result.count).toBe(1)
  })

  it('no events → { count: 0, colors: [], hasMore: false }', () => {
    const date = new Date('2026-03-15')
    const result = getEventDotsForDay<CalendarEvent>([], date)
    expect(result).toEqual({ count: 0, colors: [], hasMore: false })
  })
})

// ─── getYearBounds ────────────────────────────────────────────

describe('getYearBounds', () => {
  it('2026-06-15 → Jan 1 – Dec 31 2026', () => {
    const { start, end } = getYearBounds(new Date('2026-06-15'))
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(0)
    expect(start.getDate()).toBe(1)
    expect(end.getFullYear()).toBe(2026)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(31)
  })
})

// ─── navigateYear ─────────────────────────────────────────────

describe('navigateYear', () => {
  it('2026 → backward → 2025', () => {
    const result = navigateYear(new Date('2026-01-01'), -1)
    expect(result.getFullYear()).toBe(2025)
  })

  it('2026 → forward → 2027', () => {
    const result = navigateYear(new Date('2026-12-31'), 1)
    expect(result.getFullYear()).toBe(2027)
  })
})

// ─── renderQuarterView DOM tests ──────────────────────────────

describe('renderQuarterView DOM', () => {
  it('renders 3 month blocks (.lf-cal-qv-month)', () => {
    const el = renderQuarterView({
      date: () => new Date('2026-03-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const months = el.querySelectorAll('.lf-cal-qv-month')
    expect(months).toHaveLength(3)
  })

  it('today cell gets .lf-cal-qv-today class', () => {
    // Use today's date so the "today" cell is present
    const today = new Date()
    const el = renderQuarterView({
      date: () => today,
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const todayCells = el.querySelectorAll('.lf-cal-qv-today')
    expect(todayCells.length).toBeGreaterThanOrEqual(1)
  })

  it('click on day calls onDateClick with correct date', () => {
    const onDateClick = vi.fn()
    const el = renderQuarterView({
      date: () => new Date('2026-01-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      onDateClick,
    })
    const firstDay = el.querySelector('.lf-cal-qv-day') as HTMLElement
    firstDay.click()
    expect(onDateClick).toHaveBeenCalledTimes(1)
    expect(onDateClick.mock.calls[0]![0]).toBeInstanceOf(Date)
  })

  it('click on month header calls onMonthClick with first day of that month', () => {
    const onMonthClick = vi.fn()
    const el = renderQuarterView({
      date: () => new Date('2026-01-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      onMonthClick,
    })
    const firstHeader = el.querySelector('.lf-cal-qv-month-header') as HTMLElement
    firstHeader.click()
    expect(onMonthClick).toHaveBeenCalledTimes(1)
    const arg = onMonthClick.mock.calls[0]![0] as Date
    expect(arg).toBeInstanceOf(Date)
    // Should be first day of a month
    expect(arg.getDate()).toBe(1)
  })

  it('renders without dots when no events', () => {
    const el = renderQuarterView({
      date: () => new Date('2026-03-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const dots = el.querySelectorAll('.lf-cal-qv-dot')
    expect(dots).toHaveLength(0)
  })

  it('renders event dots for days with events', () => {
    const events = [
      makeEvent('1', new Date('2026-01-15T09:00'), new Date('2026-01-15T10:00'), { color: '#f00' }),
    ]
    const el = renderQuarterView({
      date: () => new Date('2026-01-15'),
      events: () => events,
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const dots = el.querySelectorAll('.lf-cal-qv-dot')
    expect(dots.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── renderYearView DOM tests ─────────────────────────────────

describe('renderYearView DOM', () => {
  it('renders 12 month blocks (.lf-cal-yv-month)', () => {
    const el = renderYearView({
      date: () => new Date('2026-06-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const months = el.querySelectorAll('.lf-cal-yv-month')
    expect(months).toHaveLength(12)
  })

  it('today cell gets .lf-cal-yv-today class', () => {
    const today = new Date()
    const el = renderYearView({
      date: () => today,
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
    })
    const todayCells = el.querySelectorAll('.lf-cal-yv-today')
    expect(todayCells.length).toBeGreaterThanOrEqual(1)
  })

  it('click on day calls onDateClick with correct date', () => {
    const onDateClick = vi.fn()
    const el = renderYearView({
      date: () => new Date('2026-06-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      onDateClick,
    })
    const firstDay = el.querySelector('.lf-cal-yv-day') as HTMLElement
    firstDay.click()
    expect(onDateClick).toHaveBeenCalledTimes(1)
    expect(onDateClick.mock.calls[0]![0]).toBeInstanceOf(Date)
  })

  it('click on month header calls onMonthClick with first day of that month', () => {
    const onMonthClick = vi.fn()
    const el = renderYearView({
      date: () => new Date('2026-06-15'),
      events: () => [],
      config: defaultConfig,
      locale: 'en-US',
      classes: {},
      translations: defaultTranslations,
      onMonthClick,
    })
    const firstHeader = el.querySelector('.lf-cal-yv-month-header') as HTMLElement
    firstHeader.click()
    expect(onMonthClick).toHaveBeenCalledTimes(1)
    const arg = onMonthClick.mock.calls[0]![0] as Date
    expect(arg).toBeInstanceOf(Date)
    expect(arg.getDate()).toBe(1)
  })
})
