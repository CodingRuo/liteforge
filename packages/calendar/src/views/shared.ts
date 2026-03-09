/**
 * @liteforge/calendar - Shared View Utilities
 */

import { effect, onCleanup } from '@liteforge/core'
import type {
  CalendarEvent,
  EventIndicator,
  ResolvedTimeConfig,
  OverlapLayout,
  CalendarClasses,
} from '../types.js'
import {
  getTimeSlots,
  formatTime,
  getSlotPosition,
  getEventHeight,
  isEventOnDay,
  isAllDayEvent,
} from '../date-utils.js'

// ─── Overlap Calculation ───────────────────────────────────

export function calculateOverlaps<T extends CalendarEvent>(
  events: T[]
): OverlapLayout<T>[] {
  if (events.length === 0) return []

  // Sort by start time, then by duration (longer first)
  const sorted = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime()
    if (startDiff !== 0) return startDiff
    // Longer events first
    const aDur = a.end.getTime() - a.start.getTime()
    const bDur = b.end.getTime() - b.start.getTime()
    return bDur - aDur
  })

  const layouts: OverlapLayout<T>[] = []
  const columns: { end: Date; column: number }[] = []

  for (const event of sorted) {
    // Find the first available column
    let column = 0
    let placed = false

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      if (col && col.end <= event.start) {
        // This column is free
        columns[i] = { end: event.end, column: i }
        column = i
        placed = true
        break
      }
    }

    if (!placed) {
      // Need a new column
      column = columns.length
      columns.push({ end: event.end, column })
    }

    layouts.push({
      event,
      column,
      totalColumns: 0, // Will calculate after
    })
  }

  // Calculate total columns for each group
  // Group events that overlap with each other
  for (const layout of layouts) {
    const overlapping = layouts.filter(
      (other) =>
        layout.event.start < other.event.end &&
        layout.event.end > other.event.start
    )
    const maxColumn = overlapping.length > 0
      ? Math.max(...overlapping.map((l) => l.column))
      : 0
    layout.totalColumns = maxColumn + 1
  }

  return layouts
}

// ─── Event Filtering ───────────────────────────────────────

export function getEventsForDay<T extends CalendarEvent>(
  events: T[],
  day: Date,
  resourceId?: string
): T[] {
  return events.filter((event) => {
    if (!isEventOnDay(event, day)) return false
    if (resourceId !== undefined && event.resourceId !== resourceId) return false
    return true
  })
}

/**
 * Get only timed (non-all-day) events for a specific day.
 */
export function getTimedEventsForDay<T extends CalendarEvent>(
  events: T[],
  day: Date,
  resourceId?: string
): T[] {
  return getEventsForDay(events, day, resourceId).filter(
    (event) => !isAllDayEvent(event)
  )
}

/**
 * Get only all-day events for a specific day.
 */
export function getAllDayEventsForDay<T extends CalendarEvent>(
  events: T[],
  day: Date,
  resourceId?: string
): T[] {
  return getEventsForDay(events, day, resourceId).filter((event) =>
    isAllDayEvent(event)
  )
}

export function getEventsForResource<T extends CalendarEvent>(
  events: T[],
  resourceId: string
): T[] {
  return events.filter((event) => event.resourceId === resourceId)
}

// ─── Time Slot Rendering ───────────────────────────────────

export function renderTimeColumn(
  date: Date,
  config: ResolvedTimeConfig,
  locale: string
): HTMLDivElement {
  const column = document.createElement('div')
  column.className = 'lf-cal-time-column'

  const slots = getTimeSlots(date, config.dayStart, config.dayEnd, config.slotDuration)

  for (const slot of slots) {
    const label = document.createElement('div')
    label.className = 'lf-cal-time-label'

    // Only show label on the hour
    if (slot.getMinutes() === 0) {
      label.textContent = formatTime(slot, locale)
    }

    column.appendChild(label)
  }

  return column
}

export function renderTimeSlots(
  date: Date,
  config: ResolvedTimeConfig,
): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'relative'

  const slots = getTimeSlots(date, config.dayStart, config.dayEnd, config.slotDuration)

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (!slot) continue

    const slotEl = document.createElement('div')

    let slotClass = 'lf-cal-time-slot'
    if (slot.getMinutes() === 0) {
      slotClass += ' lf-cal-time-slot--hour'
    }

    slotEl.className = slotClass
    container.appendChild(slotEl)
  }

  return container
}

// ─── Indicator Rendering ───────────────────────────────────

function renderIndicatorItem<T extends CalendarEvent>(
  indicator: EventIndicator,
  eventTooltip: EventTooltipConfig<T> | undefined,
): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'lf-cal-event-indicator'

  if (indicator.icon instanceof Node) {
    el.appendChild(indicator.icon)
  } else {
    el.innerHTML = indicator.icon
  }

  if (indicator.color) {
    el.style.color = indicator.color
    el.style.borderColor = indicator.color
  }

  if (indicator.tooltip && eventTooltip) {
    const cleanup = eventTooltip.fn(el, {
      content: indicator.tooltip,
      delay: 200,
      position: 'top',
    })
    try { onCleanup(cleanup) } catch { /* no-op outside effect context */ }
  }

  return el
}

export function renderIndicators<T extends CalendarEvent>(
  event: T,
  container: HTMLElement,
  eventTooltip?: EventTooltipConfig<T>,
): void {
  if (!event.indicators || event.indicators.length === 0) return

  const wrapper = document.createElement('div')
  wrapper.className = 'lf-cal-event-indicators'

  for (const indicator of event.indicators) {
    wrapper.appendChild(renderIndicatorItem(indicator, eventTooltip))
  }

  container.appendChild(wrapper)
}

// ─── Event Rendering ───────────────────────────────────────

function buildDefaultTooltipContent<T extends CalendarEvent>(event: T): Node {
  const el = document.createElement('div')
  el.style.cssText = 'display:flex;flex-direction:column;gap:2px;min-width:120px'

  const title = document.createElement('strong')
  title.textContent = event.title
  el.appendChild(title)

  const time = document.createElement('span')
  time.style.opacity = '0.8'
  time.textContent = `${formatTime(event.start)} – ${formatTime(event.end)}`
  el.appendChild(time)

  return el
}

export type EventTooltipConfig<T extends CalendarEvent> = {
  fn: (el: HTMLElement, input: string | { content: string | Node; delay?: number; position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'; triggerOnFocus?: boolean }) => () => void
  render?: (event: T) => string | Node
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
}

export function renderEvent<T extends CalendarEvent>(
  event: T,
  config: ResolvedTimeConfig,
  layout: OverlapLayout<T>,
  customContent?: (event: T) => Node,
  onClick?: (event: T) => void,
  editable?: boolean,
  onDragStart?: (event: T, element: HTMLElement) => void,
  onResizeStart?: (event: T, element: HTMLElement) => void,
  selectedEventId?: () => string | null,
  eventTooltip?: EventTooltipConfig<T>
): HTMLDivElement {
  const eventEl = document.createElement('div')
  eventEl.className = 'lf-cal-event'
  eventEl.dataset.eventId = event.id

  // ARIA attributes for accessibility
  eventEl.setAttribute('role', 'button')
  eventEl.setAttribute('tabindex', '0')
  const ariaLabel = event.allDay
    ? event.title
    : `${event.title}, ${formatTime(event.start)} – ${formatTime(event.end)}`
  eventEl.setAttribute('aria-label', ariaLabel)
  if (!eventTooltip) eventEl.title = event.title // Native tooltip (suppressed when eventTooltip is active)

  // Position — slot height scales with slotDuration (30min = 40px baseline)
  const slotHeight = Math.round((config.slotDuration / 30) * 40)
  const top = getSlotPosition(event.start, config.dayStart, config.slotDuration, slotHeight)
  const height = getEventHeight(event.start, event.end, config.slotDuration, slotHeight)

  eventEl.style.top = `${top}px`
  eventEl.style.height = `${Math.max(height, 20)}px`

  // Overlap positioning — side-by-side columns
  const width = 100 / layout.totalColumns
  const left = layout.column * width
  eventEl.style.left = `calc(${left}% + 2px)`
  eventEl.style.width = `calc(${width}% - 4px)`

  // Color
  if (event.color) {
    eventEl.style.background = event.color
  }

  // Content
  if (customContent) {
    eventEl.appendChild(customContent(event))
  } else {
    const titleEl = document.createElement('div')
    titleEl.className = 'lf-cal-event-title'
    titleEl.textContent = event.title

    const timeEl = document.createElement('div')
    timeEl.className = 'lf-cal-event-time'
    timeEl.textContent = `${formatTime(event.start)} - ${formatTime(event.end)}`

    eventEl.appendChild(titleEl)
    eventEl.appendChild(timeEl)
  }

  // Click handler
  if (onClick) {
    eventEl.addEventListener('click', (e) => {
      e.stopPropagation()
      eventEl.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }))
      onClick(event)
    })
    // Keyboard activation (Enter / Space)
    eventEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onClick(event)
      }
    })
  }

  // Drag & resize
  const isEditable = event.editable !== false && editable
  if (isEditable) {
    eventEl.dataset.editable = 'true'

    // Create resize handle if onResizeStart is provided
    if (onResizeStart) {
      const resizeHandle = document.createElement('div')
      resizeHandle.className = 'lf-cal-event-resize-handle'
      eventEl.appendChild(resizeHandle)
    }

    // Call setup functions IMMEDIATELY - they will add their own pointerdown handlers
    // This is called during element creation, before user interaction
    if (onDragStart) {
      onDragStart(event, eventEl)
    }
    if (onResizeStart) {
      onResizeStart(event, eventEl)
    }
  }

  // Selected state
  if (selectedEventId) {
    effect(() => {
      const isSelected = selectedEventId() === event.id
      eventEl.classList.toggle('lf-cal-event--selected', isSelected)
      eventEl.setAttribute('aria-selected', String(isSelected))
    })
  }

  // Indicators (bottom-right corner)
  renderIndicators(event, eventEl, eventTooltip)

  // Tooltip on hover
  if (eventTooltip) {
    const content = eventTooltip.render
      ? eventTooltip.render(event)
      : buildDefaultTooltipContent(event)
    const cleanup = eventTooltip.fn(eventEl, {
      content,
      delay: eventTooltip.delay ?? 300,
      position: eventTooltip.position ?? 'top',
      triggerOnFocus: false,
    })
    onCleanup(cleanup)
  }

  return eventEl
}

// ─── All-Day Event Rendering ───────────────────────────────

export function renderAllDayEvent<T extends CalendarEvent>(
  event: T,
  onClick?: (event: T) => void
): HTMLDivElement {
  const eventEl = document.createElement('div')
  eventEl.className = 'lf-cal-event lf-cal-event--allday'
  eventEl.dataset.eventId = event.id

  // ARIA
  eventEl.setAttribute('role', 'button')
  eventEl.setAttribute('tabindex', '0')
  eventEl.setAttribute('aria-label', event.title)

  // Color
  if (event.color) {
    eventEl.style.background = event.color
  }

  // Title only for all-day events
  const titleEl = document.createElement('div')
  titleEl.className = 'lf-cal-event-title'
  titleEl.textContent = event.title
  eventEl.appendChild(titleEl)

  // Click handler
  if (onClick) {
    eventEl.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick(event)
    })
    // Keyboard activation
    eventEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onClick(event)
      }
    })
  }

  return eventEl
}

export interface AllDayRowOptions<T extends CalendarEvent> {
  days: Date[]
  events: T[]
  classes: Partial<CalendarClasses>
  onEventClick: ((event: T) => void) | undefined
  hasTimeColumnSpacer: boolean | undefined
  allDayLabel?: string
  /** Maximum visible all-day events per cell before a "+N more" chip is shown (default: unlimited) */
  maxVisible?: number
}

export function renderAllDayRow<T extends CalendarEvent>(
  options: AllDayRowOptions<T>
): HTMLDivElement {
  const { days, events, classes, onEventClick, hasTimeColumnSpacer = true, allDayLabel = 'All-day', maxVisible } = options

  const row = document.createElement('div')
  row.className = getClass('header', classes, 'lf-cal-allday-row')
  row.setAttribute('role', 'row')
  row.setAttribute('aria-label', allDayLabel)

  // Time column spacer (to align with time column below)
  if (hasTimeColumnSpacer) {
    const spacer = document.createElement('div')
    spacer.className = 'lf-cal-allday-label'
    spacer.textContent = allDayLabel
    spacer.setAttribute('aria-hidden', 'true')
    row.appendChild(spacer)
  }

  // Container for day cells
  const cellsContainer = document.createElement('div')
  cellsContainer.className = 'lf-cal-allday-cells'

  for (const day of days) {
    const cell = document.createElement('div')
    cell.className = 'lf-cal-allday-cell'

    // Get all-day events for this day
    const dayAllDayEvents = events.filter((event) => isAllDayEvent(event) && isEventOnDay(event, day))

    const visibleEvents = maxVisible !== undefined
      ? dayAllDayEvents.slice(0, maxVisible)
      : dayAllDayEvents

    for (const event of visibleEvents) {
      const eventEl = renderAllDayEvent(event, onEventClick)
      cell.appendChild(eventEl)
    }

    const overflow = maxVisible !== undefined ? dayAllDayEvents.length - maxVisible : 0
    if (overflow > 0) {
      const moreChip = document.createElement('div')
      moreChip.className = 'lf-cal-allday-more'
      moreChip.textContent = `+${overflow}`
      cell.appendChild(moreChip)
    }

    cellsContainer.appendChild(cell)
  }

  row.appendChild(cellsContainer)
  return row
}

// ─── Now Indicator ─────────────────────────────────────────

export function createNowIndicator(
  config: ResolvedTimeConfig
): HTMLDivElement | null {
  if (!config.nowIndicator) return null

  const indicator = document.createElement('div')
  indicator.className = 'lf-cal-now-indicator'

  const updatePosition = () => {
    const now = new Date()
    const slotHeight = Math.round((config.slotDuration / 30) * 40)
    const top = getSlotPosition(now, config.dayStart, config.slotDuration, slotHeight)
    indicator.style.top = `${top}px`

    // Hide if outside day range
    const hour = now.getHours()
    if (hour < config.dayStart || hour >= config.dayEnd) {
      indicator.style.display = 'none'
    } else {
      indicator.style.display = 'block'
    }
  }

  updatePosition()

  // Update every minute
  const intervalId = setInterval(updatePosition, 60000)

  // Store cleanup function
  ;(indicator as HTMLDivElement & { cleanup?: () => void }).cleanup = () => {
    clearInterval(intervalId)
  }

  return indicator
}

// ─── CSS Class Helpers ─────────────────────────────────────

export function getClass(
  name: keyof CalendarClasses,
  classes: Partial<CalendarClasses> | undefined,
  defaultClass: string
): string {
  return classes?.[name] ?? defaultClass
}
