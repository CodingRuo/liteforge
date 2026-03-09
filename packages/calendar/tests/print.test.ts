/**
 * @liteforge/calendar — Print API Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import { createCalendar } from '../src/calendar.js'
import type { CalendarEvent } from '../src/types.js'

// ── Setup ──────────────────────────────────────────────────────────────────

// Track afterprint listeners so tests can fire the event
let afterprintListeners: Array<EventListener> = []

beforeEach(() => {
  localStorage.clear()
  afterprintListeners = []

  // Mock window.print
  vi.spyOn(window, 'print').mockImplementation(() => { /* no-op */ })

  // Capture afterprint listeners so tests can trigger them
  vi.spyOn(window, 'addEventListener').mockImplementation(
    (type: string, listener: EventListenerOrEventListenerObject, ..._rest: unknown[]) => {
      if (type === 'afterprint' && typeof listener === 'function') {
        afterprintListeners.push(listener as EventListener)
      }
      // still call the real impl for non-afterprint events
    }
  )
  vi.spyOn(window, 'removeEventListener').mockImplementation(() => { /* no-op */ })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function fireAfterPrint(): void {
  const e = new Event('afterprint')
  for (const listener of afterprintListeners) {
    listener(e)
  }
}

function makeCalendar(view: CalendarEvent['id'] extends string ? string : never = 'week') {
  const events = signal<CalendarEvent[]>([])
  const calendar = createCalendar({
    events,
    view: 'week',
    defaultDate: new Date(2026, 2, 10), // Monday 2026-03-10
    unstyled: true,
  })
  const root = calendar.Root() as HTMLElement
  document.body.appendChild(root)
  return { calendar, root }
}

// ── Happy paths ────────────────────────────────────────────────────────────

describe('calendar.print() — happy paths', () => {
  it('adds lf-cal-printing class to the root container', () => {
    const { calendar, root } = makeCalendar()

    calendar.print()

    expect(root.classList.contains('lf-cal-printing')).toBe(true)

    document.body.removeChild(root)
  })

  it('calls window.print()', () => {
    const { calendar, root } = makeCalendar()

    calendar.print()

    expect(window.print).toHaveBeenCalledTimes(1)

    document.body.removeChild(root)
  })

  it('removes lf-cal-printing class after afterprint event', () => {
    const { calendar, root } = makeCalendar()

    calendar.print()
    expect(root.classList.contains('lf-cal-printing')).toBe(true)

    fireAfterPrint()

    expect(root.classList.contains('lf-cal-printing')).toBe(false)

    document.body.removeChild(root)
  })

  it('sets .lf-cal-print-title text to provided title', () => {
    const { calendar, root } = makeCalendar()

    calendar.print({ title: 'Wochenplan KW10' })

    const titleEl = root.querySelector('.lf-cal-print-title')
    expect(titleEl).toBeTruthy()
    expect(titleEl?.textContent).toBe('Wochenplan KW10')

    document.body.removeChild(root)
  })

  it('generates a default title from the current date range when no title given', () => {
    const { calendar, root } = makeCalendar()

    calendar.print()

    const titleEl = root.querySelector('.lf-cal-print-title')
    expect(titleEl).toBeTruthy()
    // Title must be non-empty (locale-formatted date range)
    expect((titleEl?.textContent ?? '').length).toBeGreaterThan(0)

    document.body.removeChild(root)
  })

  it('switches to the requested view before printing and restores afterward', () => {
    const { calendar, root } = makeCalendar()
    expect(calendar.currentView()).toBe('week')

    calendar.print({ view: 'month' })

    // During print — view is month
    expect(calendar.currentView()).toBe('month')

    fireAfterPrint()

    // After print — view restored to week
    expect(calendar.currentView()).toBe('week')

    document.body.removeChild(root)
  })

  it('does not switch view when print({ view }) matches current view', () => {
    const { calendar, root } = makeCalendar()
    const setViewSpy = vi.spyOn(calendar, 'setView')

    calendar.print({ view: 'week' })

    // setView should not be called when view matches current
    expect(setViewSpy).not.toHaveBeenCalled()

    fireAfterPrint()
    document.body.removeChild(root)
  })

  it('injects .lf-cal-print-title element into container if not already present', () => {
    const { calendar, root } = makeCalendar()

    expect(root.querySelector('.lf-cal-print-title')).toBeNull()

    calendar.print({ title: 'Test Title' })

    expect(root.querySelector('.lf-cal-print-title')).toBeTruthy()

    document.body.removeChild(root)
  })

  it('reuses existing .lf-cal-print-title element on second print', () => {
    const { calendar, root } = makeCalendar()

    calendar.print({ title: 'First' })
    fireAfterPrint()

    calendar.print({ title: 'Second' })

    const titleEls = root.querySelectorAll('.lf-cal-print-title')
    expect(titleEls.length).toBe(1)
    expect(titleEls[0]?.textContent).toBe('Second')

    fireAfterPrint()
    document.body.removeChild(root)
  })
})

// ── Unhappy paths ──────────────────────────────────────────────────────────

describe('calendar.print() — unhappy paths', () => {
  it('is a no-op when called before Root() is mounted', () => {
    const events = signal<CalendarEvent[]>([])
    const calendar = createCalendar({ events, unstyled: true })

    // Root() has NOT been called — rootContainer is null
    expect(() => calendar.print()).not.toThrow()
    expect(window.print).not.toHaveBeenCalled()
  })

  it('second rapid call is ignored (debounce/guard)', () => {
    const { calendar, root } = makeCalendar()

    calendar.print({ title: 'First' })
    calendar.print({ title: 'Second' }) // should be ignored

    expect(window.print).toHaveBeenCalledTimes(1)

    // Title should be from first call
    const titleEl = root.querySelector('.lf-cal-print-title')
    expect(titleEl?.textContent).toBe('First')

    fireAfterPrint()
    // After afterprint, the guard is reset — a third call should work
    calendar.print({ title: 'Third' })
    expect(window.print).toHaveBeenCalledTimes(2)

    fireAfterPrint()
    document.body.removeChild(root)
  })

  it('removes lf-cal-printing class even when window.print throws', () => {
    vi.mocked(window.print).mockImplementationOnce(() => {
      throw new Error('print failed')
    })

    const { calendar, root } = makeCalendar()

    expect(() => calendar.print()).not.toThrow()
    // Class must be cleaned up in the catch branch
    expect(root.classList.contains('lf-cal-printing')).toBe(false)

    document.body.removeChild(root)
  })

  it('window.print throwing resets printPending so next call works', () => {
    vi.mocked(window.print).mockImplementationOnce(() => {
      throw new Error('print failed')
    })

    const { calendar, root } = makeCalendar()

    calendar.print()                 // throws internally — caught
    calendar.print({ title: 'OK' }) // should work

    expect(window.print).toHaveBeenCalledTimes(2)

    fireAfterPrint()
    document.body.removeChild(root)
  })
})
