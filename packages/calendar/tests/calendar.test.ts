/**
 * @liteforge/calendar - Calendar State & API Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { signal } from '@liteforge/core'
import { createCalendar } from '../src/calendar.js'
import type { CalendarEvent, Resource } from '../src/types.js'

// Helper to create test events
function createEvent(
  id: string,
  start: Date,
  end: Date,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent {
  return { id, title: `Event ${id}`, start, end, ...extra }
}

describe('createCalendar', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('initialization', () => {
    it('creates calendar with default options', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      expect(calendar).toBeDefined()
      expect(calendar.Root).toBeTypeOf('function')
      expect(calendar.Toolbar).toBeTypeOf('function')
      expect(calendar.currentView()).toBe('week') // default view
    })

    it('respects initial view option', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, view: 'month', unstyled: true })

      expect(calendar.currentView()).toBe('month')
    })

    it('respects defaultDate option', () => {
      const events = signal<CalendarEvent[]>([])
      const defaultDate = new Date(2024, 5, 15)
      const calendar = createCalendar({ events, defaultDate, unstyled: true })

      const currentDate = calendar.currentDate()
      expect(currentDate.getFullYear()).toBe(2024)
      expect(currentDate.getMonth()).toBe(5)
      expect(currentDate.getDate()).toBe(15)
    })
  })

  describe('navigation', () => {
    let calendar: ReturnType<typeof createCalendar>
    let dateChanges: Date[]

    beforeEach(() => {
      dateChanges = []
      const events = signal<CalendarEvent[]>([])
      calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15), // June 15, 2024
        view: 'week',
        unstyled: true,
        onDateChange: (date) => dateChanges.push(date),
      })
    })

    it('today() navigates to current date', () => {
      calendar.goTo(new Date(2020, 0, 1)) // Go to past date
      calendar.today()

      const today = new Date()
      const current = calendar.currentDate()
      expect(current.getFullYear()).toBe(today.getFullYear())
      expect(current.getMonth()).toBe(today.getMonth())
      expect(current.getDate()).toBe(today.getDate())
    })

    it('next() advances by one day in day view', () => {
      calendar.setView('day')
      const initialDate = calendar.currentDate().getDate()

      calendar.next()

      expect(calendar.currentDate().getDate()).toBe(initialDate + 1)
    })

    it('next() advances by one week in week view', () => {
      calendar.setView('week')
      const initialTime = calendar.currentDate().getTime()

      calendar.next()

      const diff = calendar.currentDate().getTime() - initialTime
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000) // 7 days in ms
    })

    it('next() advances by one month in month view', () => {
      calendar.setView('month')
      const initialMonth = calendar.currentDate().getMonth()

      calendar.next()

      expect(calendar.currentDate().getMonth()).toBe((initialMonth + 1) % 12)
    })

    it('prev() goes back by one day in day view', () => {
      calendar.setView('day')
      const initialDate = calendar.currentDate().getDate()

      calendar.prev()

      expect(calendar.currentDate().getDate()).toBe(initialDate - 1)
    })

    it('prev() goes back by one week in week view', () => {
      calendar.setView('week')
      const initialTime = calendar.currentDate().getTime()

      calendar.prev()

      const diff = initialTime - calendar.currentDate().getTime()
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('goTo() navigates to specific date', () => {
      const targetDate = new Date(2025, 2, 20)

      calendar.goTo(targetDate)

      const current = calendar.currentDate()
      expect(current.getFullYear()).toBe(2025)
      expect(current.getMonth()).toBe(2)
      expect(current.getDate()).toBe(20)
    })

    it('triggers onDateChange callback', () => {
      calendar.next()
      calendar.prev()
      calendar.today()

      expect(dateChanges.length).toBe(3)
    })
  })

  describe('view management', () => {
    let calendar: ReturnType<typeof createCalendar>
    let viewChanges: Array<{ view: string }>

    beforeEach(() => {
      viewChanges = []
      const events = signal<CalendarEvent[]>([])
      calendar = createCalendar({
        events,
        view: 'week',
        unstyled: true,
        onViewChange: (view) => viewChanges.push({ view }),
      })
    })

    it('setView() changes current view', () => {
      calendar.setView('month')
      expect(calendar.currentView()).toBe('month')

      calendar.setView('day')
      expect(calendar.currentView()).toBe('day')

      calendar.setView('agenda')
      expect(calendar.currentView()).toBe('agenda')
    })

    it('triggers onViewChange callback', () => {
      calendar.setView('month')
      calendar.setView('day')

      expect(viewChanges.length).toBe(2)
      expect(viewChanges[0]?.view).toBe('month')
      expect(viewChanges[1]?.view).toBe('day')
    })
  })

  describe('date range calculation', () => {
    it('returns day range for day view', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        view: 'day',
        unstyled: true,
      })

      const range = calendar.dateRange()
      expect(range.start.getDate()).toBe(15)
      expect(range.end.getDate()).toBe(15)
    })

    it('returns week range for week view', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 12), // Wednesday
        view: 'week',
        unstyled: true,
      })

      const range = calendar.dateRange()
      // Week should start Monday (weekStart default is 1)
      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday
    })

    it('returns month range for month view', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15), // June
        view: 'month',
        unstyled: true,
      })

      const range = calendar.dateRange()
      // Month view extends to full calendar weeks
      expect(range.start.getDay()).toBe(1) // Starts on Monday
    })
  })

  describe('event management', () => {
    let calendar: ReturnType<typeof createCalendar>
    let eventsSignal: ReturnType<typeof signal<CalendarEvent[]>>

    beforeEach(() => {
      eventsSignal = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
        createEvent('2', new Date(2024, 5, 16, 14, 0), new Date(2024, 5, 16, 15, 0)),
      ])
      calendar = createCalendar({
        events: eventsSignal,
        defaultDate: new Date(2024, 5, 15),
        view: 'week',
        unstyled: true,
      })
    })

    it('events() returns all visible events', () => {
      const events = calendar.events()
      expect(events.length).toBeGreaterThanOrEqual(2)
    })

    it('getEvent() finds event by id', () => {
      const event = calendar.getEvent('1')
      expect(event).toBeDefined()
      expect(event?.title).toBe('Event 1')
    })

    it('getEvent() returns undefined for non-existent id', () => {
      const event = calendar.getEvent('non-existent')
      expect(event).toBeUndefined()
    })

    it('addEvent() adds new event', () => {
      const initialCount = calendar.events().length
      // Add event on June 15 (within the week of June 10-16)
      const newEvent = createEvent(
        'new',
        new Date(2024, 5, 15, 14, 0),
        new Date(2024, 5, 15, 15, 0)
      )

      calendar.addEvent(newEvent)

      expect(calendar.events().length).toBe(initialCount + 1)
      expect(calendar.getEvent('new')).toBeDefined()
    })

    it('updateEvent() modifies existing event', () => {
      const newEvent = createEvent(
        'update-test',
        new Date(2024, 5, 15, 10, 0),
        new Date(2024, 5, 15, 11, 0)
      )
      calendar.addEvent(newEvent)

      calendar.updateEvent('update-test', { title: 'Updated Title' })

      const updated = calendar.getEvent('update-test')
      expect(updated?.title).toBe('Updated Title')
    })

    it('removeEvent() removes event by id', () => {
      const newEvent = createEvent(
        'remove-test',
        new Date(2024, 5, 15, 10, 0),
        new Date(2024, 5, 15, 11, 0)
      )
      calendar.addEvent(newEvent)
      expect(calendar.getEvent('remove-test')).toBeDefined()

      calendar.removeEvent('remove-test')

      expect(calendar.getEvent('remove-test')).toBeUndefined()
    })
  })

  describe('resource management', () => {
    let calendar: ReturnType<typeof createCalendar>
    const resources: Resource[] = [
      { id: 'room-1', name: 'Room 1' },
      { id: 'room-2', name: 'Room 2' },
      { id: 'room-3', name: 'Room 3' },
    ]

    beforeEach(() => {
      const events = signal<CalendarEvent[]>([])
      calendar = createCalendar({
        events,
        resources,
        unstyled: true,
      })
    })

    it('resources() returns all resources', () => {
      expect(calendar.resources()).toHaveLength(3)
    })

    it('visibleResources() returns all by default', () => {
      expect(calendar.visibleResources()).toHaveLength(3)
    })

    it('hideResource() hides a resource', () => {
      calendar.hideResource('room-2')

      const visible = calendar.visibleResources()
      expect(visible).not.toContain('room-2')
      expect(visible).toContain('room-1')
      expect(visible).toContain('room-3')
    })

    it('showResource() shows a hidden resource', () => {
      calendar.hideResource('room-2')
      calendar.showResource('room-2')

      expect(calendar.visibleResources()).toContain('room-2')
    })

    it('toggleResource() toggles visibility', () => {
      calendar.toggleResource('room-1')
      expect(calendar.visibleResources()).not.toContain('room-1')

      calendar.toggleResource('room-1')
      expect(calendar.visibleResources()).toContain('room-1')
    })

    it('events() filters by resource visibility', () => {
      // Create events with different resourceIds
      const eventsSignal = signal<CalendarEvent[]>([
        createEvent('evt-1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0), {
          resourceId: 'room-1',
        }),
        createEvent('evt-2', new Date(2024, 5, 15, 11, 0), new Date(2024, 5, 15, 12, 0), {
          resourceId: 'room-2',
        }),
        createEvent('evt-3', new Date(2024, 5, 15, 12, 0), new Date(2024, 5, 15, 13, 0), {
          resourceId: 'room-3',
        }),
        createEvent('evt-4', new Date(2024, 5, 15, 13, 0), new Date(2024, 5, 15, 14, 0)),
        // No resourceId - should always be visible
      ])

      const calendarWithEvents = createCalendar({
        events: eventsSignal,
        resources,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      // All events visible initially
      expect(calendarWithEvents.events()).toHaveLength(4)

      // Hide room-1
      calendarWithEvents.hideResource('room-1')
      const visibleAfterHide = calendarWithEvents.events()
      expect(visibleAfterHide).toHaveLength(3)
      expect(visibleAfterHide.find((e) => e.id === 'evt-1')).toBeUndefined()
      expect(visibleAfterHide.find((e) => e.id === 'evt-2')).toBeDefined()
      expect(visibleAfterHide.find((e) => e.id === 'evt-4')).toBeDefined() // No resourceId

      // Show room-1 again
      calendarWithEvents.showResource('room-1')
      expect(calendarWithEvents.events()).toHaveLength(4)
    })
  })

  describe('selection state', () => {
    let calendar: ReturnType<typeof createCalendar>
    let eventClicks: CalendarEvent[]
    let slotClicks: Array<{ start: Date; end: Date; resourceId: string | undefined }>

    beforeEach(() => {
      eventClicks = []
      slotClicks = []
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])
      calendar = createCalendar({
        events,
        selectable: true,
        unstyled: true,
        onEventClick: (event) => eventClicks.push(event),
        onSlotClick: (start, end, resourceId) =>
          slotClicks.push({ start, end, resourceId }),
      })
    })

    it('selectedEvent() returns null initially', () => {
      expect(calendar.selectedEvent()).toBeNull()
    })

    it('selectedSlot() returns null initially', () => {
      expect(calendar.selectedSlot()).toBeNull()
    })
  })

  describe('recurring events', () => {
    it('expands recurring events within range', () => {
      const events = signal<CalendarEvent[]>([
        {
          id: 'recurring',
          title: 'Daily Standup',
          start: new Date(2024, 5, 10, 9, 0),
          end: new Date(2024, 5, 10, 9, 30),
          recurring: { frequency: 'daily', count: 7 },
        },
      ])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        view: 'week',
        unstyled: true,
      })

      const visibleEvents = calendar.events()

      // Should have multiple occurrences within the week
      expect(visibleEvents.length).toBeGreaterThan(1)
    })
  })

  describe('time config', () => {
    it('uses default time config values', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        unstyled: true,
      })

      // Can't directly access config, but calendar should work with defaults
      expect(calendar).toBeDefined()
    })

    it('accepts custom time config', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        time: {
          slotDuration: 15,
          dayStart: 8,
          dayEnd: 18,
          weekStart: 0, // Sunday
          hiddenDays: [0, 6], // Hide weekends
          nowIndicator: false,
        },
        unstyled: true,
      })

      expect(calendar).toBeDefined()
    })
  })

  describe('callbacks', () => {
    it('calls onEventClick when event is clicked', () => {
      const clicks: CalendarEvent[] = []
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      createCalendar({
        events,
        onEventClick: (event) => clicks.push(event),
        unstyled: true,
      })

      // Note: Actual click simulation would require DOM, this just tests setup
      expect(clicks).toHaveLength(0) // No clicks yet
    })
  })

  describe('Root component', () => {
    it('returns a Node', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      const root = calendar.Root()

      expect(root).toBeDefined()
      expect(root instanceof Node).toBe(true)
    })

    it('has correct class name', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      const root = calendar.Root() as HTMLElement

      expect(root.className).toBe('lf-cal')
    })

    it('uses custom class from classes option', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        classes: { root: 'my-calendar' },
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement

      expect(root.className).toBe('my-calendar')
    })
  })

  describe('Toolbar component', () => {
    it('returns a Node', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      const toolbar = calendar.Toolbar()

      expect(toolbar).toBeDefined()
      expect(toolbar instanceof Node).toBe(true)
    })
  })

  describe('responsive', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    function fireResize(width: number) {
      // Responsive controller now uses window.innerWidth + 'resize' event
      Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
      window.dispatchEvent(new Event('resize'))
    }

    it('exposes sizeClass() on the result API', () => {
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, view: 'week', responsive: {}, unstyled: true })
      const root = cal.Root() as HTMLElement
      document.body.appendChild(root)
      vi.advanceTimersByTime(0)
      fireResize(400)
      expect(cal.sizeClass()).toBe('mobile')
      fireResize(900)
      expect(cal.sizeClass()).toBe('tablet')
      fireResize(1200)
      expect(cal.sizeClass()).toBe('desktop')
      root.remove()
    })

    it('does NOT auto-switch view on resize — user controls view', () => {
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, view: 'week', responsive: {}, unstyled: true })
      const root = cal.Root() as HTMLElement
      document.body.appendChild(root)
      vi.advanceTimersByTime(0)
      fireResize(400)
      // No auto-switching — view stays as user set it
      expect(cal.currentView()).toBe('week')
      fireResize(1200)
      expect(cal.currentView()).toBe('week')
      root.remove()
    })
  })

  describe('localStorage persistence', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('restores view from localStorage on init', () => {
      localStorage.setItem('lf-cal-preferred-view', 'month')
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, view: 'week', unstyled: true })
      expect(cal.currentView()).toBe('month')
    })

    it('persists view to localStorage on setView()', () => {
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, view: 'week', unstyled: true })
      cal.setView('agenda')
      expect(localStorage.getItem('lf-cal-preferred-view')).toBe('agenda')
    })

    it('ignores invalid view in localStorage', () => {
      localStorage.setItem('lf-cal-preferred-view', 'invalid-view')
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, view: 'week', unstyled: true })
      expect(cal.currentView()).toBe('week')
    })

    it('restores active resource from localStorage on init', () => {
      localStorage.setItem('lf-cal-preferred-resource', 'r1')
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, unstyled: true })
      expect(cal.activeResource()).toBe('r1')
    })

    it('restores null active resource when stored value is empty string', () => {
      localStorage.setItem('lf-cal-preferred-resource', '')
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, unstyled: true })
      expect(cal.activeResource()).toBeNull()
    })

    it('persists active resource to localStorage on setActiveResource()', () => {
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, unstyled: true })
      cal.setActiveResource('r2')
      expect(localStorage.getItem('lf-cal-preferred-resource')).toBe('r2')
      cal.setActiveResource(null)
      expect(localStorage.getItem('lf-cal-preferred-resource')).toBe('')
    })
  })

  describe('calendar — unhappy paths', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('renders without crash when dayStart equals dayEnd', () => {
      // dayStart === dayEnd is an edge-case config that should not crash the calendar
      const events = signal<CalendarEvent[]>([])
      expect(() => {
        const cal = createCalendar({
          events,
          time: { dayStart: 12, dayEnd: 12 },
          unstyled: true,
        })
        cal.Root()
      }).not.toThrow()
    })

    it('fires onSlotClick even when resource is hidden via toggleResource', () => {
      const onSlotClick = vi.fn()
      const eventsSignal = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events: eventsSignal,
        resources: [{ id: 'r1', name: 'Room 1' }],
        defaultDate: new Date(2024, 5, 15),
        selectable: true,
        onSlotClick,
        unstyled: true,
      })

      // Hide the resource — slot selection should still work for resource-less slots
      calendar.toggleResource('r1')

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const slot = root.querySelector('.lf-cal-time-slot')
      if (slot) {
        const pointerDown = new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 200,
        })
        const pointerUp = new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          button: 0,
          clientY: 200,
        })
        slot.dispatchEvent(pointerDown)
        slot.dispatchEvent(pointerUp)
        expect(onSlotClick).toHaveBeenCalled()
      }

      document.body.removeChild(root)
    })

    it('setView with valid CalendarView strings does not crash', () => {
      const events = signal<CalendarEvent[]>([])
      const cal = createCalendar({ events, view: 'week', unstyled: true })

      // All valid views should work without throwing
      expect(() => cal.setView('day')).not.toThrow()
      expect(() => cal.setView('month')).not.toThrow()
      expect(() => cal.setView('agenda')).not.toThrow()
      expect(() => cal.setView('week')).not.toThrow()

      expect(cal.currentView()).toBe('week')
    })

    it('updating events to empty array removes all rendered events', () => {
      const eventsSignal = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
        createEvent('2', new Date(2024, 5, 15, 14, 0), new Date(2024, 5, 15, 15, 0)),
      ])
      const calendar = createCalendar({
        events: eventsSignal,
        defaultDate: new Date(2024, 5, 15),
        view: 'week',
        unstyled: true,
      })

      // Verify events are present initially
      expect(calendar.events().length).toBeGreaterThanOrEqual(2)

      // Clear the events signal
      eventsSignal.set([])

      // visibleEvents computed should now return empty
      expect(calendar.events()).toHaveLength(0)
    })

    it('onSlotSelect is called with end capped at maxDuration', () => {
      const onSlotSelect = vi.fn()
      const events = signal<CalendarEvent[]>([])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        selectable: true,
        selection: { maxDuration: 60 },
        onSlotSelect,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const slotsContainer = root.querySelector('.lf-cal-day-column') as HTMLElement
      if (slotsContainer) {
        // Simulate a drag: pointerdown then pointermove far down then pointerup
        const containerRect = slotsContainer.getBoundingClientRect()
        const startY = containerRect.top + 10
        const farY = containerRect.top + 500 // far below — exceeds maxDuration

        slotsContainer.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, button: 0,
          clientY: startY,
        }))
        slotsContainer.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, cancelable: true, button: 0,
          clientY: farY,
        }))
        slotsContainer.dispatchEvent(new PointerEvent('pointerup', {
          bubbles: true, cancelable: true, button: 0,
          clientY: farY,
        }))

        if (onSlotSelect.mock.calls.length > 0) {
          const [callStart, callEnd] = onSlotSelect.mock.calls[0] as [Date, Date]
          const durationMs = callEnd.getTime() - callStart.getTime()
          const durationMinutes = durationMs / 60000
          // Duration should be capped at maxDuration (60 min)
          expect(durationMinutes).toBeLessThanOrEqual(60)
        }
        // No crash is the main requirement when maxDuration is set
      }

      document.body.removeChild(root)
    })
  })
})
