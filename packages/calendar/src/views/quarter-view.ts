/**
 * @liteforge/calendar - Quarter View Renderer
 */

import { effect } from '@liteforge/core'
import type {
  CalendarEvent,
  CalendarTranslations,
  ResolvedTimeConfig,
  CalendarClasses,
} from '../types.js'
import {
  getMonthCalendarDays,
  isSameMonth,
  isSameDay,
  isToday,
  formatWeekday,
  isEventOnDay,
} from '../date-utils.js'

// ─── Quarter Bounds ─────────────────────────────────────────

export function getQuarterBounds(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear()
  const quarterIndex = Math.floor(date.getMonth() / 3)
  const startMonth = quarterIndex * 3
  const endMonth = startMonth + 2

  const start = new Date(year, startMonth, 1, 0, 0, 0, 0)
  // Last day of the last month in the quarter
  const end = new Date(year, endMonth + 1, 0, 23, 59, 59, 999)

  return { start, end }
}

// ─── Quarter Label ──────────────────────────────────────────

export function getQuarterLabel(date: Date, locale: string): string {
  const quarterNumber = Math.floor(date.getMonth() / 3) + 1
  const year = date.getFullYear()
  // locale param is accepted for API consistency but label format is fixed: "Q1 2026"
  void locale
  return `Q${quarterNumber} ${year}`
}

// ─── Quarter Navigation ─────────────────────────────────────

export function navigateQuarter(date: Date, direction: 1 | -1): Date {
  const quarterIndex = Math.floor(date.getMonth() / 3)
  let newQuarterIndex = quarterIndex + direction
  let year = date.getFullYear()

  if (newQuarterIndex > 3) {
    newQuarterIndex = 0
    year += 1
  } else if (newQuarterIndex < 0) {
    newQuarterIndex = 3
    year -= 1
  }

  return new Date(year, newQuarterIndex * 3, 1, 0, 0, 0, 0)
}

// ─── Event Dots ─────────────────────────────────────────────

const DEFAULT_DOT_COLOR = '#6366f1'
const MAX_DOTS = 3

export interface EventDotInfo {
  count: number
  colors: string[]
  hasMore: boolean
}

export function getEventDotsForDay<T extends CalendarEvent>(
  events: T[],
  date: Date
): EventDotInfo {
  const dayEvents = events.filter((event) => isEventOnDay(event, date))
  const count = dayEvents.length
  const colors = dayEvents
    .slice(0, MAX_DOTS)
    .map((e) => e.color ?? DEFAULT_DOT_COLOR)
  return {
    count,
    colors,
    hasMore: count > MAX_DOTS,
  }
}

// ─── Quarter View Options ────────────────────────────────────

export interface QuarterViewOptions<T extends CalendarEvent> {
  date: () => Date
  events: () => T[]
  config: ResolvedTimeConfig
  locale: string
  classes: Partial<CalendarClasses>
  translations: CalendarTranslations
  onDateClick?: (date: Date) => void
  onMonthClick?: (date: Date) => void
}

// ─── Weekday Names ───────────────────────────────────────────

function buildWeekdayNames(weekStart: 0 | 1, locale: string): string[] {
  const names: string[] = []
  // Jan 6 2025 is a Monday
  const monday = new Date(2025, 0, 6)
  for (let i = 0; i < 7; i++) {
    const dayIndex = (weekStart + i) % 7
    const tempDate = new Date(monday)
    tempDate.setDate(monday.getDate() + ((dayIndex - 1 + 7) % 7))
    names.push(formatWeekday(tempDate, locale))
  }
  return names
}

// ─── Render Single Mini Month ─────────────────────────────────

function renderMiniMonth<T extends CalendarEvent>(
  monthDate: Date,
  currentDate: Date,
  events: T[],
  config: ResolvedTimeConfig,
  locale: string,
  weekdayNames: string[],
  onDateClick: ((date: Date) => void) | undefined,
  onMonthClick: ((date: Date) => void) | undefined,
  prefix: 'lf-cal-qv'
): HTMLDivElement {
  const monthEl = document.createElement('div')
  monthEl.className = `${prefix}-month`

  // Month header
  const headerEl = document.createElement('div')
  headerEl.className = `${prefix}-month-header`
  headerEl.textContent = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(monthDate)
  if (onMonthClick) {
    headerEl.addEventListener('click', () => {
      onMonthClick(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1))
    })
  }
  monthEl.appendChild(headerEl)

  // Weekday headers
  const weekdaysEl = document.createElement('div')
  weekdaysEl.className = `${prefix}-weekdays`
  for (const name of weekdayNames) {
    const wd = document.createElement('div')
    wd.className = `${prefix}-weekday`
    wd.textContent = name
    weekdaysEl.appendChild(wd)
  }
  monthEl.appendChild(weekdaysEl)

  // Day cells
  const daysEl = document.createElement('div')
  daysEl.className = `${prefix}-days`

  const calDays = getMonthCalendarDays(monthDate, config.weekStart)
  for (const day of calDays) {
    const dayEl = document.createElement('div')
    let cls = `${prefix}-day`

    if (isToday(day)) {
      cls += ` ${prefix}-today`
    }
    if (!isSameMonth(day, monthDate)) {
      cls += ` ${prefix}-outside`
    }
    if (isSameDay(day, currentDate)) {
      cls += ` ${prefix}-selected`
    }

    dayEl.className = cls

    // Day number
    const numEl = document.createElement('div')
    numEl.className = `${prefix}-day-num`
    numEl.textContent = String(day.getDate())
    dayEl.appendChild(numEl)

    // Event dots
    const dotInfo = getEventDotsForDay(events, day)
    if (dotInfo.count > 0) {
      const dotsEl = document.createElement('div')
      dotsEl.className = `${prefix}-dots`
      for (const color of dotInfo.colors) {
        const dot = document.createElement('div')
        dot.className = `${prefix}-dot`
        dot.style.background = color
        dotsEl.appendChild(dot)
      }
      if (dotInfo.hasMore) {
        const more = document.createElement('div')
        more.className = `${prefix}-more`
        more.textContent = '+'
        dotsEl.appendChild(more)
      }
      dayEl.appendChild(dotsEl)
    }

    if (onDateClick) {
      dayEl.addEventListener('click', () => {
        onDateClick(new Date(day))
      })
    }

    daysEl.appendChild(dayEl)
  }

  monthEl.appendChild(daysEl)
  return monthEl
}

// ─── Render Quarter View ─────────────────────────────────────

export function renderQuarterView<T extends CalendarEvent>(
  options: QuarterViewOptions<T>
): HTMLDivElement {
  const {
    date,
    events,
    config,
    locale,
    onDateClick,
    onMonthClick,
  } = options

  const container = document.createElement('div')
  container.className = 'lf-cal-qv'

  const grid = document.createElement('div')
  grid.className = 'lf-cal-qv-grid'
  container.appendChild(grid)

  const weekdayNames = buildWeekdayNames(config.weekStart, locale)

  effect(() => {
    const currentDate = date()
    const allEvents = events()

    grid.innerHTML = ''

    const bounds = getQuarterBounds(currentDate)
    const quarterStartMonth = bounds.start.getMonth()
    const year = bounds.start.getFullYear()

    for (let i = 0; i < 3; i++) {
      const monthDate = new Date(year, quarterStartMonth + i, 1)
      const monthEl = renderMiniMonth(
        monthDate,
        currentDate,
        allEvents,
        config,
        locale,
        weekdayNames,
        onDateClick,
        onMonthClick,
        'lf-cal-qv'
      )
      grid.appendChild(monthEl)
    }
  })

  return container
}
