/**
 * @liteforge/calendar - Year View Renderer
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
} from '../date-utils.js'
import { getEventDotsForDay } from './quarter-view.js'

// ─── Year Bounds ────────────────────────────────────────────

export function getYearBounds(date: Date): { start: Date; end: Date } {
  const year = date.getFullYear()
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  }
}

// ─── Year Navigation ─────────────────────────────────────────

export function navigateYear(date: Date, direction: 1 | -1): Date {
  return new Date(date.getFullYear() + direction, date.getMonth(), 1, 0, 0, 0, 0)
}

// ─── Year View Options ────────────────────────────────────────

export interface YearViewOptions<T extends CalendarEvent> {
  date: () => Date
  events: () => T[]
  config: ResolvedTimeConfig
  locale: string
  classes: Partial<CalendarClasses>
  translations: CalendarTranslations
  onDateClick?: (date: Date) => void
  onMonthClick?: (date: Date) => void
}

// ─── Weekday Names (compact: 1 char) ─────────────────────────

function buildCompactWeekdayNames(weekStart: 0 | 1, locale: string): string[] {
  const names: string[] = []
  // Jan 6 2025 is a Monday
  const monday = new Date(2025, 0, 6)
  for (let i = 0; i < 7; i++) {
    const dayIndex = (weekStart + i) % 7
    const tempDate = new Date(monday)
    tempDate.setDate(monday.getDate() + ((dayIndex - 1 + 7) % 7))
    // Use narrow format for year-view (single letter)
    const name = new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(tempDate)
    names.push(name)
  }
  return names
}

// ─── Render Compact Mini Month ────────────────────────────────

function renderCompactMonth<T extends CalendarEvent>(
  monthDate: Date,
  currentDate: Date,
  events: T[],
  config: ResolvedTimeConfig,
  locale: string,
  weekdayNames: string[],
  onDateClick: ((date: Date) => void) | undefined,
  onMonthClick: ((date: Date) => void) | undefined
): HTMLDivElement {
  const monthEl = document.createElement('div')
  monthEl.className = 'lf-cal-yv-month'

  // Month header
  const headerEl = document.createElement('div')
  headerEl.className = 'lf-cal-yv-month-header'
  headerEl.textContent = new Intl.DateTimeFormat(locale, { month: 'long' }).format(monthDate)
  if (onMonthClick) {
    headerEl.addEventListener('click', () => {
      onMonthClick(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1))
    })
  }
  monthEl.appendChild(headerEl)

  // Weekday headers
  const weekdaysEl = document.createElement('div')
  weekdaysEl.className = 'lf-cal-yv-weekdays'
  for (const name of weekdayNames) {
    const wd = document.createElement('div')
    wd.className = 'lf-cal-yv-weekday'
    wd.textContent = name
    weekdaysEl.appendChild(wd)
  }
  monthEl.appendChild(weekdaysEl)

  // Day cells
  const daysEl = document.createElement('div')
  daysEl.className = 'lf-cal-yv-days'

  const calDays = getMonthCalendarDays(monthDate, config.weekStart)
  for (const day of calDays) {
    const dayEl = document.createElement('div')
    let cls = 'lf-cal-yv-day'

    if (isToday(day)) {
      cls += ' lf-cal-yv-today'
    }
    if (!isSameMonth(day, monthDate)) {
      cls += ' lf-cal-yv-outside'
    }
    if (isSameDay(day, currentDate)) {
      cls += ' lf-cal-yv-selected'
    }

    dayEl.className = cls

    // Day number
    const numEl = document.createElement('div')
    numEl.className = 'lf-cal-yv-day-num'
    numEl.textContent = String(day.getDate())
    dayEl.appendChild(numEl)

    // Event dots (compact: max 3, no "+more" text for year view)
    const dotInfo = getEventDotsForDay(events, day)
    if (dotInfo.count > 0) {
      const dotsEl = document.createElement('div')
      dotsEl.className = 'lf-cal-yv-dots'
      for (const color of dotInfo.colors) {
        const dot = document.createElement('div')
        dot.className = 'lf-cal-yv-dot'
        dot.style.background = color
        dotsEl.appendChild(dot)
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

// ─── Render Year View ─────────────────────────────────────────

export function renderYearView<T extends CalendarEvent>(
  options: YearViewOptions<T>
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
  container.className = 'lf-cal-yv'

  const grid = document.createElement('div')
  grid.className = 'lf-cal-yv-grid'
  container.appendChild(grid)

  // Use narrow weekday names for compact year view
  const weekdayNames = buildCompactWeekdayNames(config.weekStart, locale)

  effect(() => {
    const currentDate = date()
    const allEvents = events()

    grid.innerHTML = ''

    const year = currentDate.getFullYear()

    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1)
      const monthEl = renderCompactMonth(
        monthDate,
        currentDate,
        allEvents,
        config,
        locale,
        weekdayNames,
        onDateClick,
        onMonthClick
      )
      grid.appendChild(monthEl)
    }
  })

  return container
}
