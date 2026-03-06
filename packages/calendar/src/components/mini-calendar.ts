/**
 * @liteforge/calendar - MiniCalendar Component
 *
 * Compact month calendar (~210px wide).
 * - KW | MO | DI | MI | DO | FR | SA | SO columns (ISO 8601, Mon-start)
 * - Click day  → goTo(day) on main calendar
 * - Click KW   → goTo(weekStart) + setView('week')
 * - Tracks currentDate/currentView signals bidirectionally
 */

import { signal, effect } from '@liteforge/core'
import type { CalendarView } from '../types.js'
import {
  startOfDay,
  getWeekNumber,
  addMonths,
} from '../date-utils.js'

interface MiniCalendarOptions {
  currentDate: () => Date
  currentView: () => CalendarView
  locale: string
  goTo: (date: Date) => void
  setView: (view: CalendarView) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monday of the ISO week containing `date` */
function isoMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - day + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

/** True if two dates fall on the same calendar day */
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** True if `date` is within the ISO week that contains `anchorDay` */
function sameISOWeek(date: Date, anchorDay: Date): boolean {
  const weekStart = isoMonday(anchorDay)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  return date >= weekStart && date <= weekEnd
}

/** Build the 6-row × 7-col grid of dates for a month view */
function buildMonthGrid(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1)
  // Start grid on the Monday of the week that contains the 1st
  const gridStart = isoMonday(firstOfMonth)

  const rows: Date[][] = []
  const cursor = new Date(gridStart)

  for (let row = 0; row < 6; row++) {
    const week: Date[] = []
    for (let col = 0; col < 7; col++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    rows.push(week)
    // Stop early if the next row is entirely in a future month and we've
    // already covered the entire current month
    if (cursor.getMonth() !== month && cursor.getMonth() !== (month + 1) % 12) {
      const remaining = rows[rows.length - 1]!
      if (remaining.every(d => d.getMonth() !== month)) break
    }
  }

  return rows
}

// ─── Short day labels (Mon-first) ─────────────────────────────────────────────

function getDayLabels(locale: string): string[] {
  // Use Intl to get locale-aware short weekday names, starting Monday
  const labels: string[] = []
  // Use a known Monday (2024-01-01 is a Monday)
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, 1 + i)
    labels.push(d.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2))
  }
  return labels
}

// ─── DOM builder helpers ──────────────────────────────────────────────────────

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function renderMiniCalendar(options: MiniCalendarOptions): HTMLElement {
  const { currentDate, currentView, locale, goTo, setView } = options

  // Internal display month — tracks currentDate but can be navigated independently
  const displayMonth = signal<{ year: number; month: number }>({
    year: currentDate().getFullYear(),
    month: currentDate().getMonth(),
  })

  // Sync displayMonth when main calendar navigates to a different month
  effect(() => {
    const d = currentDate()
    displayMonth.set({ year: d.getFullYear(), month: d.getMonth() })
  })

  // ── Container ──────────────────────────────────────────────────────────────
  const root = el('div', 'lf-mini-cal')

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = el('div', 'lf-mini-cal__header')

  const prevBtn = el('button', 'lf-mini-cal__nav') as HTMLButtonElement
  prevBtn.type = 'button'
  prevBtn.textContent = '‹'
  prevBtn.addEventListener('click', () => {
    const { year, month } = displayMonth()
    const d = addMonths(new Date(year, month, 1), -1)
    displayMonth.set({ year: d.getFullYear(), month: d.getMonth() })
  })

  const titleEl = el('span', 'lf-mini-cal__title')

  const nextBtn = el('button', 'lf-mini-cal__nav') as HTMLButtonElement
  nextBtn.type = 'button'
  nextBtn.textContent = '›'
  nextBtn.addEventListener('click', () => {
    const { year, month } = displayMonth()
    const d = addMonths(new Date(year, month, 1), 1)
    displayMonth.set({ year: d.getFullYear(), month: d.getMonth() })
  })

  header.appendChild(prevBtn)
  header.appendChild(titleEl)
  header.appendChild(nextBtn)
  root.appendChild(header)

  // ── Day-of-week header row ─────────────────────────────────────────────────
  const dayLabels = getDayLabels(locale)
  const headRow = el('div', 'lf-mini-cal__row lf-mini-cal__row--head')

  // KW label
  const kwHead = el('span', 'lf-mini-cal__kw lf-mini-cal__kw--head')
  kwHead.textContent = 'KW'
  headRow.appendChild(kwHead)

  for (const label of dayLabels) {
    const cell = el('span', 'lf-mini-cal__day-head')
    cell.textContent = label
    headRow.appendChild(cell)
  }
  root.appendChild(headRow)

  // ── Grid container (rebuilt reactively) ────────────────────────────────────
  const grid = el('div', 'lf-mini-cal__grid')
  root.appendChild(grid)

  // ── Reactive render ────────────────────────────────────────────────────────
  effect(() => {
    const { year, month } = displayMonth()
    const today = startOfDay(new Date())
    const selected = startOfDay(currentDate())
    const view = currentView()

    // Update title
    const monthName = new Date(year, month, 1).toLocaleDateString(locale, {
      month: 'long', year: 'numeric',
    })
    titleEl.textContent = monthName

    // Rebuild grid
    grid.innerHTML = ''
    const rows = buildMonthGrid(year, month)

    for (const week of rows) {
      const rowEl = el('div', 'lf-mini-cal__row')

      // KW number — click navigates main calendar to that week
      const monday = isoMonday(week[0]!)
      const kw = getWeekNumber(monday)
      const kwCell = el('button', 'lf-mini-cal__kw') as HTMLButtonElement
      kwCell.type = 'button'
      kwCell.textContent = String(kw)

      // Highlight: current week in week/resource-day view
      const isCurrentWeek = week.some(d => sameISOWeek(d, selected)) &&
        (view === 'week' || view === 'resource-day' || view === 'day')
      if (isCurrentWeek) kwCell.classList.add('lf-mini-cal__kw--active')

      kwCell.addEventListener('click', () => {
        goTo(monday)
        setView('week')
      })
      rowEl.appendChild(kwCell)

      for (const day of week) {
        const dayBtn = el('button', 'lf-mini-cal__day') as HTMLButtonElement
        dayBtn.type = 'button'
        dayBtn.textContent = String(day.getDate())

        // Outside current month
        if (day.getMonth() !== month) {
          dayBtn.classList.add('lf-mini-cal__day--outside')
        }
        // Today
        if (sameDay(day, today)) {
          dayBtn.classList.add('lf-mini-cal__day--today')
        }
        // Selected day
        if (sameDay(day, selected) && (view === 'day' || view === 'resource-day')) {
          dayBtn.classList.add('lf-mini-cal__day--selected')
        }
        // Selected week (week view)
        if (view === 'week' && sameISOWeek(day, selected)) {
          dayBtn.classList.add('lf-mini-cal__day--in-week')
        }

        dayBtn.addEventListener('click', () => {
          goTo(startOfDay(day))
          // If currently in week view, stay in week; otherwise go to day/resource-day
          if (view !== 'week') setView('day')
        })

        rowEl.appendChild(dayBtn)
      }

      grid.appendChild(rowEl)
    }
  })

  return root
}
