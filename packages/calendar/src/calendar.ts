/**
 * @liteforge/calendar - createCalendar Implementation
 */

import { signal, computed, effect } from '@liteforge/core'
import { createResponsiveController } from './responsive.js'
import type {
  CalendarOptions,
  CalendarResult,
  CalendarEvent,
  CalendarView,
  ResolvedTimeConfig,
  DateRange,
  SlotSelection,
} from './types.js'
import {
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  getDayRange,
  getWeekRange,
  getMonthRange,
} from './date-utils.js'
import { expandAllRecurring } from './recurring.js'
import { injectCalendarStyles } from './styles.js'
import { resolveTranslations } from './translations.js'
import { renderWeekView } from './views/week-view.js'
import { renderDayView } from './views/day-view.js'
import { renderMonthView } from './views/month-view.js'
import { renderAgendaView } from './views/agenda-view.js'
import { renderToolbar } from './components/toolbar.js'
import { renderMiniCalendar } from './components/mini-calendar.js'

// ─── Resolve Time Config ───────────────────────────────────

function resolveTimeConfig(
  config: CalendarOptions<CalendarEvent>['time'] | undefined,
  hiddenDays: () => number[]
): ResolvedTimeConfig {
  return {
    slotDuration: config?.slotDuration ?? 30,
    dayStart: config?.dayStart ?? 0,
    dayEnd: config?.dayEnd ?? 24,
    weekStart: config?.weekStart ?? 1,
    hiddenDays,
    nowIndicator: config?.nowIndicator ?? true,
  }
}

// ─── Calculate Date Range ──────────────────────────────────

function calculateDateRange(date: Date, view: CalendarView, weekStart: number): DateRange {
  switch (view) {
    case 'day':
    case 'resource-day':
      return getDayRange(date)
    case 'week':
      return getWeekRange(date, weekStart)
    case 'month': {
      // For month view, we need to include partial weeks
      const monthRange = getMonthRange(date)
      // Extend to full calendar weeks
      const calStart = getWeekRange(monthRange.start, weekStart).start
      const calEnd = getWeekRange(monthRange.end, weekStart).end
      return { start: calStart, end: calEnd }
    }
    case 'agenda':
      // Show current month for agenda
      return getMonthRange(date)
    default:
      return getWeekRange(date, weekStart)
  }
}

// ─── createCalendar ────────────────────────────────────────

export function createCalendar<T extends CalendarEvent>(
  options: CalendarOptions<T>
): CalendarResult<T> {
  const {
    events: eventsSource,
    view: initialView = 'week',
    defaultDate = new Date(),
    time,
    resources: resourcesInput = [],
    editable = false,
    selectable = false,
    selection: selectionConfig,
    onEventClick,
    onEventDrop,
    onEventResize,
    onSlotClick,
    onSlotSelect,
    onViewChange,
    onDateChange,
    eventContent,
    slotContent,
    dayHeaderContent,
    unstyled = false,
    classes,
    locale = 'en-US',
    translations: translationsInput,
    toolbar: toolbarConfig,
    responsive: responsiveOptions,
  } = options

  const t = resolveTranslations(locale, translationsInput)

  // Inject styles
  if (!unstyled) {
    injectCalendarStyles()
  }

  // ─── localStorage Helpers ────────────────────────────────

  const VALID_VIEWS: CalendarView[] = ['day', 'week', 'month', 'agenda', 'resource-day']

  function readStoredView(): CalendarView | null {
    try {
      const v = localStorage.getItem('lf-cal-preferred-view')
      if (v && (VALID_VIEWS as string[]).includes(v)) return v as CalendarView
    } catch { /* no-op */ }
    return null
  }

  function readStoredResource(): string | null {
    try {
      const v = localStorage.getItem('lf-cal-preferred-resource')
      if (v === '') return null
      if (v !== null) return v
    } catch { /* no-op */ }
    return null
  }

  // ─── State ───────────────────────────────────────────────

  const currentDateSignal = signal(startOfDay(defaultDate))
  const currentViewSignal = signal<CalendarView>(readStoredView() ?? initialView)

  // Weekend visibility (hidden days signal)
  const hiddenDaysSignal = signal<number[]>(time?.hiddenDays ?? [])

  // Resolve config with reactive hiddenDays
  const config = resolveTimeConfig(time, () => hiddenDaysSignal())

  // Resource visibility
  const resourceVisibility = signal<Record<string, boolean>>(
    Object.fromEntries(resourcesInput.map((r) => [r.id, true]))
  )

  // Selection state
  const selectedEventSignal = signal<T | null>(null)
  const selectedSlotSignal = signal<SlotSelection | null>(null)

  // Local events (for addEvent/updateEvent/removeEvent)
  const localEvents = signal<T[]>([])

  // ─── Computed ────────────────────────────────────────────

  const dateRangeComputed = computed(() => {
    return calculateDateRange(
      currentDateSignal(),
      currentViewSignal(),
      config.weekStart
    )
  })

  const resourcesComputed = computed(() => resourcesInput)

  const visibleResourcesComputed = computed(() => {
    const visibility = resourceVisibility()
    return resourcesInput.filter((r) => visibility[r.id] !== false).map((r) => r.id)
  })

  // Combine source events + local events, expand recurring, filter to range and visible resources
  const visibleEvents = computed(() => {
    const range = dateRangeComputed()
    const sourceEvts = eventsSource()
    const localEvts = localEvents()
    const allEvents = [...sourceEvts, ...localEvts]

    // Expand recurring events
    const expanded = expandAllRecurring(allEvents, range.start, range.end)

    // Filter by visible resources - use visibleResourcesComputed to ensure reactivity
    const visibleRes = visibleResourcesComputed()
    const filtered = expanded.filter((event) => {
      // If event has no resourceId, always show it
      if (!event.resourceId) return true
      // Show event only if its resource is visible
      return visibleRes.includes(event.resourceId)
    })

    return filtered
  })

  // ─── Navigation ──────────────────────────────────────────

  const today = () => {
    currentDateSignal.set(startOfDay(new Date()))
    onDateChange?.(currentDateSignal())
  }

  const next = () => {
    const current = currentDateSignal()
    const view = currentViewSignal()

    let newDate: Date
    switch (view) {
      case 'day':
      case 'resource-day':
        newDate = addDays(current, 1)
        break
      case 'week':
        newDate = addWeeks(current, 1)
        break
      case 'month':
      case 'agenda':
        newDate = addMonths(current, 1)
        break
      default:
        newDate = addWeeks(current, 1)
    }

    currentDateSignal.set(newDate)
    onDateChange?.(newDate)
  }

  const prev = () => {
    const current = currentDateSignal()
    const view = currentViewSignal()

    let newDate: Date
    switch (view) {
      case 'day':
      case 'resource-day':
        newDate = addDays(current, -1)
        break
      case 'week':
        newDate = addWeeks(current, -1)
        break
      case 'month':
      case 'agenda':
        newDate = addMonths(current, -1)
        break
      default:
        newDate = addWeeks(current, -1)
    }

    currentDateSignal.set(newDate)
    onDateChange?.(newDate)
  }

  const goTo = (date: Date) => {
    currentDateSignal.set(startOfDay(date))
    onDateChange?.(currentDateSignal())
  }

  const setView = (view: CalendarView) => {
    currentViewSignal.set(view)
    try { localStorage.setItem('lf-cal-preferred-view', view) } catch { /* no-op */ }
    onViewChange?.(view, dateRangeComputed())
  }

  // ─── Responsive Controller ────────────────────────────────

  const responsiveCtrl = createResponsiveController(responsiveOptions ?? {})
  const sizeClass = responsiveCtrl.sizeClass

  // ─── Mobile Resource Filter ───────────────────────────────

  const activeResourceSignal = signal<string | null>(readStoredResource())

  const setActiveResource = (id: string | null) => {
    activeResourceSignal.set(id)
    try { localStorage.setItem('lf-cal-preferred-resource', id ?? '') } catch { /* no-op */ }
  }

  // ─── Event Management ────────────────────────────────────

  const getEvent = (id: string): T | undefined => {
    return visibleEvents().find((e: T) => e.id === id)
  }

  const addEvent = (event: T) => {
    localEvents.update((evts: T[]) => [...evts, event])
  }

  const updateEvent = (id: string, changes: Partial<T>) => {
    localEvents.update((evts: T[]) =>
      evts.map((e: T) => (e.id === id ? { ...e, ...changes } : e))
    )
  }

  const removeEvent = (id: string) => {
    localEvents.update((evts: T[]) => evts.filter((e: T) => e.id !== id))
  }

  // ─── Weekend Toggle ───────────────────────────────────────

  const WEEKEND_DAYS = [0, 6] // Sun, Sat

  const weekendsVisible = () => {
    const hidden = hiddenDaysSignal()
    return !WEEKEND_DAYS.every((d) => hidden.includes(d))
  }

  const toggleWeekends = () => {
    hiddenDaysSignal.update((hidden) => {
      if (WEEKEND_DAYS.every((d) => hidden.includes(d))) {
        // Currently hidden → show weekends
        return hidden.filter((d) => !WEEKEND_DAYS.includes(d))
      } else {
        // Currently visible → hide weekends
        return [...hidden.filter((d) => !WEEKEND_DAYS.includes(d)), ...WEEKEND_DAYS]
      }
    })
  }

  // ─── Resource Management ─────────────────────────────────

  const showResource = (id: string) => {
    resourceVisibility.update((v: Record<string, boolean>) => ({ ...v, [id]: true }))
  }

  const hideResource = (id: string) => {
    resourceVisibility.update((v: Record<string, boolean>) => ({ ...v, [id]: false }))
  }

  const toggleResource = (id: string) => {
    resourceVisibility.update((v: Record<string, boolean>) => ({ ...v, [id]: !v[id] }))
  }

  // ─── Event Handlers for Views ────────────────────────────

  const handleEventClick = (event: T) => {
    selectedEventSignal.set(event)
    onEventClick?.(event)
  }

  const handleSlotClick = (start: Date, end: Date, resourceId?: string) => {
    selectedSlotSignal.set({ start, end, resourceId })
    onSlotClick?.(start, end, resourceId)
  }

  const handleSlotSelect = (start: Date, end: Date, resourceId?: string) => {
    selectedSlotSignal.set({ start, end, resourceId })
    onSlotSelect?.(start, end, resourceId)
  }

  const handleEventDrop = (event: T, newStart: Date, newEnd: Date, newResourceId?: string) => {
    onEventDrop?.(event, newStart, newEnd, newResourceId)
  }

  const handleEventResize = (event: T, newEnd: Date) => {
    onEventResize?.(event, newEnd)
  }

  // ─── Root Component ──────────────────────────────────────

  const Root = (): Node => {
    const container = document.createElement('div')
    container.className = classes?.root ?? 'lf-cal'

    // Set data-size attribute reactively
    effect(() => { container.dataset.size = sizeClass() })

    // Attach ResizeObserver after element is in DOM
    // Note: cleanup is not captured (same acceptable pattern as toolbar click-away listeners)
    setTimeout(() => {
      if (container.isConnected || container.parentNode) {
        responsiveCtrl.observe(container)
      } else {
        // Wait for insertion
        const mo = new MutationObserver(() => {
          if (container.isConnected || container.parentNode) {
            mo.disconnect()
            responsiveCtrl.observe(container)
          }
        })
        mo.observe(document.body, { childList: true, subtree: true })
      }
    }, 0)

    let currentViewEl: HTMLDivElement | null = null

    // Reactively render the appropriate view
    effect(() => {
      const view = currentViewSignal()

      // Remove old view
      if (currentViewEl) {
        currentViewEl.remove()
      }

      // Render new view
      switch (view) {
        case 'day':
          currentViewEl = renderDayView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            // No resources → single column with overlap layout
            resources: () => [],
            visibleResources: () => [],
            config,
            locale,
            translations: t,
            classes: classes ?? {},
            eventContent,
            slotContent,
            dayHeaderContent,
            selectedEvent: () => selectedEventSignal(),
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            onSlotSelect: selectable ? handleSlotSelect : undefined,
            onEventDrop: editable ? handleEventDrop : undefined,
            onEventResize: editable ? handleEventResize : undefined,
            editable,
            selectable,
            selectionConfig,
            maxAllDayVisible: () => sizeClass() === 'mobile' ? 2 : undefined,
            sizeClass,
            activeResource: () => activeResourceSignal(),
            allResources: resourcesInput,
          })
          break

        case 'resource-day':
          currentViewEl = renderDayView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            // With resources → one column per resource (or merged on mobile)
            resources: resourcesComputed,
            visibleResources: visibleResourcesComputed,
            config,
            locale,
            translations: t,
            classes: classes ?? {},
            eventContent,
            slotContent,
            dayHeaderContent,
            selectedEvent: () => selectedEventSignal(),
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            onSlotSelect: selectable ? handleSlotSelect : undefined,
            onEventDrop: editable ? handleEventDrop : undefined,
            onEventResize: editable ? handleEventResize : undefined,
            editable,
            selectable,
            selectionConfig,
            maxAllDayVisible: () => sizeClass() === 'mobile' ? 2 : undefined,
            sizeClass,
            activeResource: () => activeResourceSignal(),
            allResources: resourcesInput,
          })
          break

        case 'week':
          currentViewEl = renderWeekView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            config,
            locale,
            translations: t,
            classes: classes ?? {},
            eventContent,
            slotContent,
            dayHeaderContent,
            selectedEvent: () => selectedEventSignal(),
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            onSlotSelect: selectable ? handleSlotSelect : undefined,
            onEventDrop: editable ? handleEventDrop : undefined,
            onEventResize: editable ? handleEventResize : undefined,
            editable,
            selectable,
            selectionConfig,
            maxAllDayVisible: () => sizeClass() === 'mobile' ? 2 : undefined,
          })
          break

        case 'month':
          currentViewEl = renderMonthView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            config,
            locale,
            translations: t,
            classes: classes ?? {},
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            onDateNavigate: (date: Date) => {
              goTo(date)
              setView('day')
            },
            selectable,
          })
          break

        case 'agenda':
          currentViewEl = renderAgendaView({
            dateRange: dateRangeComputed,
            events: () => visibleEvents(),
            resources: resourcesComputed,
            config,
            locale,
            translations: t,
            classes: classes ?? {},
            onEventClick: handleEventClick,
          })
          break
      }

      if (currentViewEl) {
        container.appendChild(currentViewEl)
      }
    })

    return container
  }

  // ─── Toolbar Component ───────────────────────────────────

  const Toolbar = (): Node => {
    return renderToolbar({
      currentDate: () => currentDateSignal(),
      currentView: () => currentViewSignal(),
      locale,
      weekStart: config.weekStart,
      classes: classes ?? {},
      translations: t,
      onPrev: prev,
      onNext: next,
      onToday: today,
      onViewChange: setView,
      resources: resourcesInput,
      visibleResources: () => visibleResourcesComputed(),
      onToggleResource: toggleResource,
      weekendsVisible,
      onToggleWeekends: toggleWeekends,
      toolbarConfig,
      sizeClass,
    })
  }

  // ─── Mobile Resource Bar ─────────────────────────────────

  const MobileResourceBar = (): Node => {
    const bar = document.createElement('div')
    bar.className = 'lf-cal-mobile-res-bar'

    // Reactive: update tabs on resource/active changes
    effect(() => {
      const active = activeResourceSignal()
      const visible = visibleResourcesComputed()
      const rList = resourcesInput.filter((r) => visible.includes(r.id))

      bar.innerHTML = ''

      if (rList.length === 0) return

      const isDE = t.allDay !== 'All-day'
      const allLabel = isDE ? 'Alle' : 'All'
      const allTab = document.createElement('button')
      allTab.type = 'button'
      allTab.className = `lf-cal-mobile-res-tab${active === null ? ' lf-cal-mobile-res-tab--active' : ''}`
      allTab.textContent = allLabel
      allTab.addEventListener('click', () => setActiveResource(null))
      bar.appendChild(allTab)

      for (const resource of rList) {
        const tab = document.createElement('button')
        tab.type = 'button'
        tab.className = `lf-cal-mobile-res-tab${active === resource.id ? ' lf-cal-mobile-res-tab--active' : ''}`
        tab.textContent = resource.name.split(' ').pop() ?? resource.name
        if (active === resource.id && resource.color) {
          tab.style.borderBottomColor = resource.color
          tab.style.color = resource.color
        }
        tab.addEventListener('click', () => setActiveResource(resource.id))
        bar.appendChild(tab)
      }
    })

    return bar
  }

  // ─── MiniCalendar Component ──────────────────────────────

  const MiniCalendar = (): Node => {
    return renderMiniCalendar({
      currentDate: () => currentDateSignal(),
      currentView: () => currentViewSignal(),
      locale,
      goTo,
      setView,
    })
  }

  // ─── Return API ──────────────────────────────────────────

  return {
    Root,
    Toolbar,
    MiniCalendar,
    MobileResourceBar,

    // Responsive
    sizeClass,

    // Navigation
    currentDate: () => currentDateSignal(),
    currentView: () => currentViewSignal(),
    dateRange: () => dateRangeComputed(),
    today,
    next,
    prev,
    goTo,
    setView,

    // Events
    events: () => visibleEvents(),
    getEvent,
    addEvent,
    updateEvent,
    removeEvent,

    // Resources
    resources: () => resourcesComputed(),
    visibleResources: () => visibleResourcesComputed(),
    showResource,
    hideResource,
    toggleResource,

    // Mobile resource filter
    activeResource: () => activeResourceSignal(),
    setActiveResource,

    // Weekend toggle
    weekendsVisible,
    toggleWeekends,

    // Selection
    selectedEvent: () => selectedEventSignal(),
    selectedSlot: () => selectedSlotSignal(),
  }
}
