/**
 * @liteforge/calendar - Timeline View Renderer
 *
 * Horizontal time axis with resources as rows.
 * Supports: sticky resource label column, sticky time header,
 * horizontal scroll, event bars (absolutely positioned),
 * drag-to-move (horizontal = time, vertical = resource),
 * resize (right edge), now indicator, and virtualization.
 *
 * Rendering strategy (no flicker):
 *   - Structure effect  → runs only when date() changes → rebuilds rows / labels
 *   - Events effect     → runs when events() changes → patches event bars per row
 *   Two separate effects so that a Simulation tick (events only) never
 *   rebuilds the DOM skeleton.
 */

import { effect } from '@liteforge/core'
import type {
  CalendarEvent,
  CalendarTranslations,
  Resource,
  ResolvedTimeConfig,
  CalendarClasses,
  TimelineOptions,
  SelectionConfig,
} from '../types.js'
import {
  calculateTimelinePosition,
  getNowIndicatorPosition,
  createHorizontalScrollHandler,
  getEventKey,
  type VirtualizationConfig,
} from '../virtualization.js'
import {
  formatTime,
  addMinutes,
  diffInMinutes,
  startOfDay,
  isToday,
} from '../date-utils.js'
import { getClass, renderIndicators, type EventTooltipConfig } from './shared.js'

// ─── Resolved options (with defaults) ─────────────────────────────────────

interface ResolvedTimelineOptions {
  cellDuration: number
  cellWidth: number
  resourceColumnWidth: number
  rowHeight: number
  nowIndicator: boolean
}

function resolveTimelineOptions(
  opts: TimelineOptions | undefined,
  config: ResolvedTimeConfig,
): ResolvedTimelineOptions {
  return {
    // Inherit global slotDuration when not explicitly set in timelineOptions
    cellDuration:        opts?.cellDuration        ?? config.slotDuration,
    // Auto-scale cellWidth so one hour is always ~100px regardless of granularity:
    // 15min → 25px/cell (4×25=100px/hr), 30min → 50px/cell, 60min → 100px/cell
    cellWidth:           opts?.cellWidth           ?? Math.round(100 / (60 / (opts?.cellDuration ?? config.slotDuration))),
    resourceColumnWidth: opts?.resourceColumnWidth ?? 140,
    rowHeight:           opts?.rowHeight           ?? 56,
    nowIndicator:        opts?.nowIndicator        ?? config.nowIndicator,
  }
}

// ─── Exported helper functions ────────────────────────────────────────────

/**
 * Convert a mouse clientX to minutes-since-midnight, relative to the grid element.
 * The returned value is NOT snapped — caller decides whether to snap.
 */
export function getTimeFromMouseX(
  clientX: number,
  gridEl: HTMLElement,
  scrollLeft: number,
  dayStart: number,
  cellDuration: number,
  cellWidth: number,
): number {
  const gridLeft = gridEl.getBoundingClientRect().left
  const relX = Math.max(0, clientX - gridLeft + scrollLeft)
  const pxPerMinute = cellWidth / cellDuration
  const minutesFromDayStart = relX / pxPerMinute
  // Clamp to [dayStart*60, large value] — caller clamps to dayEnd
  return dayStart * 60 + minutesFromDayStart
}

/**
 * Return the resourceId of the timeline row at the given viewport coordinates,
 * or undefined when no row is found (no-resource mode or outside rows).
 */
export function getResourceFromMouseY(clientX: number, clientY: number): string | undefined {
  const el = document.elementFromPoint(clientX, clientY)?.closest('[data-resource-id]')
  if (el instanceof HTMLElement) return el.dataset.resourceId
  return undefined
}

/**
 * Snap raw minutes to the nearest cellDuration grid boundary.
 */
export function snapToGrid(minutes: number, cellDuration: number): number {
  return Math.round(minutes / cellDuration) * cellDuration
}

// ─── Options interface ────────────────────────────────────────────────────

interface TimelineViewOptions<T extends CalendarEvent> {
  date: () => Date
  events: () => T[]
  resources: Resource[]
  config: ResolvedTimeConfig
  locale: string
  classes: Partial<CalendarClasses>
  translations: CalendarTranslations
  timelineOptions?: TimelineOptions
  eventContent?: (event: T) => Node
  selectedEvent?: () => T | null
  onEventClick?: (event: T) => void
  onEventDrop?: (event: T, newStart: Date, newEnd: Date, newResourceId?: string) => void
  onEventResize?: (event: T, newEnd: Date) => void
  onSlotClick?: (start: Date, end: Date, resourceId?: string) => void
  onSlotSelect?: (start: Date, end: Date, resourceId?: string) => void
  selection?: SelectionConfig
  editable?: boolean
  selectable?: boolean
  virtualizationCfg?: VirtualizationConfig
  eventTooltip?: EventTooltipConfig<T>
}

// ─── Drag & drop state ────────────────────────────────────────────────────

interface DragState<T extends CalendarEvent> {
  event: T
  el: HTMLElement
  originalStart: Date
  originalEnd: Date
  offsetX: number
  currentResourceId: string | undefined
  phantom: HTMLElement | null
}

interface ResizeState<T extends CalendarEvent> {
  event: T
  el: HTMLElement
  phantom: HTMLElement | null
}

interface CreateDragState {
  startMinutes: number
  currentEndMinutes: number
  resourceId: string | undefined
  row: HTMLElement
  preview: HTMLDivElement
  badge: HTMLElement | null
}

// ─── Snap badge (reused from slot-selection pattern) ──────────────────────

const TL_SNAP_COLORS = [
  { minutes: 15,       bg: '#22c55e', color: '#fff' },
  { minutes: 30,       bg: '#3b82f6', color: '#fff' },
  { minutes: 45,       bg: '#f59e0b', color: '#fff' },
  { minutes: 60,       bg: '#ef4444', color: '#fff' },
  { minutes: Infinity, bg: '#7c3aed', color: '#fff' },
]

function createTlSnapBadge(): HTMLElement {
  const badge = document.createElement('div')
  badge.className = 'lf-cal-snap-badge'
  badge.style.display = 'none'
  document.body.appendChild(badge)
  return badge
}

function updateTlSnapBadge(badge: HTMLElement, durationMinutes: number, x: number, y: number): void {
  const step = TL_SNAP_COLORS.find(s => durationMinutes <= s.minutes) ?? TL_SNAP_COLORS[TL_SNAP_COLORS.length - 1]!
  badge.textContent = `${durationMinutes} min`
  badge.style.background = step.bg
  badge.style.color = step.color
  badge.style.left = `${x + 14}px`
  badge.style.top = `${y - 24}px`
  badge.style.display = 'block'
}

// ─── Main renderer ────────────────────────────────────────────────────────

export function renderTimelineView<T extends CalendarEvent>(
  options: TimelineViewOptions<T>
): HTMLDivElement {
  const {
    date,
    events,
    resources,
    config,
    locale,
    classes,
    timelineOptions: timelineOpts,
    eventContent,
    selectedEvent,
    onEventClick,
    onEventDrop,
    onEventResize,
    onSlotClick,
    onSlotSelect,
    selection,
    editable,
    selectable,
    virtualizationCfg,
    eventTooltip,
  } = options

  const tl = resolveTimelineOptions(timelineOpts, config)
  const totalCells = Math.ceil(((config.dayEnd - config.dayStart) * 60) / tl.cellDuration)
  const totalWidth  = totalCells * tl.cellWidth

  // ─── Root container ──────────────────────────────────────────────────────

  const container = document.createElement('div')
  container.className = getClass('root', classes, 'lf-cal-timeline')

  // ─── Header (sticky, time labels) ────────────────────────────────────────

  const headerRow = document.createElement('div')
  headerRow.className = 'lf-cal-tl-header'

  const headerSpacer = document.createElement('div')
  headerSpacer.className = 'lf-cal-tl-resource-spacer'
  headerSpacer.style.width = `${tl.resourceColumnWidth}px`
  headerSpacer.style.minWidth = `${tl.resourceColumnWidth}px`
  headerRow.appendChild(headerSpacer)

  // Clip window for time labels — overflow:hidden, inner slides via transform
  const timeLabelsClip = document.createElement('div')
  timeLabelsClip.className = 'lf-cal-tl-time-labels-clip'

  const timeLabelsInner = document.createElement('div')
  timeLabelsInner.className = 'lf-cal-tl-time-labels-inner'
  timeLabelsInner.style.width = `${totalWidth}px`
  timeLabelsInner.style.display = 'flex'
  timeLabelsClip.appendChild(timeLabelsInner)
  headerRow.appendChild(timeLabelsClip)

  container.appendChild(headerRow)

  // ─── Body ─────────────────────────────────────────────────────────────────

  const bodyOuter = document.createElement('div')
  bodyOuter.className = 'lf-cal-tl-body'

  // Sticky resource labels column
  const resourceLabels = document.createElement('div')
  resourceLabels.className = 'lf-cal-tl-resource-labels'
  resourceLabels.style.width = `${tl.resourceColumnWidth}px`
  resourceLabels.style.minWidth = `${tl.resourceColumnWidth}px`
  bodyOuter.appendChild(resourceLabels)

  // Scrollable grid area
  const scrollArea = document.createElement('div')
  scrollArea.className = 'lf-cal-tl-scroll-area'
  bodyOuter.appendChild(scrollArea)

  const grid = document.createElement('div')
  grid.className = 'lf-cal-tl-grid'
  grid.style.width = `${totalWidth}px`
  grid.style.position = 'relative'
  scrollArea.appendChild(grid)

  container.appendChild(bodyOuter)

  // ─── Header scroll sync via transform (not scrollLeft) ───────────────────
  // timeLabelsClip has overflow:hidden; we slide timeLabelsInner with translateX

  scrollArea.addEventListener('scroll', () => {
    timeLabelsInner.style.transform = `translateX(-${scrollArea.scrollLeft}px)`
  }, { passive: true })

  // ─── Horizontal scroll virtualization ────────────────────────────────────

  let hScrollDispose: (() => void) | null = null

  setTimeout(() => {
    const handler = createHorizontalScrollHandler(
      config.dayStart,
      config.dayEnd,
      tl.cellDuration,
      tl.cellWidth,
      virtualizationCfg?.overscanMinutes ?? 120,
    )
    hScrollDispose = handler.dispose

    const onScroll = () => handler.onScroll(scrollArea.scrollLeft, scrollArea.clientWidth)
    scrollArea.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }, 0)

  // ─── Now indicator ────────────────────────────────────────────────────────

  let nowLine: HTMLDivElement | null = null
  let nowLineInterval: ReturnType<typeof setInterval> | null = null

  function updateNowLine(): void {
    if (!nowLine) return
    const left = getNowIndicatorPosition(config.dayStart, config.dayEnd, tl.cellDuration, tl.cellWidth)
    if (left === null) {
      nowLine.style.display = 'none'
    } else {
      nowLine.style.display = 'block'
      nowLine.style.left = `${left}px`
    }
  }

  // ─── Drag & drop state ────────────────────────────────────────────────────

  let dragState: DragState<T> | null = null
  let resizeState: ResizeState<T> | null = null
  let createDragState: CreateDragState | null = null

  const pxToMinutes = (px: number) => (px / tl.cellWidth) * tl.cellDuration
  const snapMins = (m: number) => Math.round(m / tl.cellDuration) * tl.cellDuration

  // ─── Event bar renderer ───────────────────────────────────────────────────

  function renderEventBar(event: T, day: Date, rowResourceId: string | undefined): HTMLDivElement {
    const bar = document.createElement('div')
    bar.className = 'lf-cal-tl-event'
    bar.dataset.eventId = event.id
    bar.setAttribute('role', 'button')
    bar.setAttribute('tabindex', '0')
    bar.setAttribute('aria-label', `${event.title}, ${formatTime(event.start, locale)} – ${formatTime(event.end, locale)}`)
    bar.title = event.title

    const { left, width } = calculateTimelinePosition(event.start, event.end, config.dayStart, tl.cellDuration, tl.cellWidth)
    bar.style.left   = `${left}px`
    bar.style.width  = `${width}px`
    bar.style.height = `${tl.rowHeight - 10}px`
    bar.style.top    = '5px'

    if (event.color) bar.style.background = event.color

    if (eventContent) {
      bar.appendChild(eventContent(event))
    } else {
      const titleEl = document.createElement('span')
      titleEl.className = 'lf-cal-tl-event-title'
      titleEl.textContent = event.title
      bar.appendChild(titleEl)

      const timeEl = document.createElement('span')
      timeEl.className = 'lf-cal-tl-event-time'
      timeEl.textContent = formatTime(event.start, locale)
      bar.appendChild(timeEl)
    }

    if (onEventClick) {
      bar.addEventListener('click', (e) => { e.stopPropagation(); onEventClick(event) })
    }

    if (selectedEvent) {
      effect(() => {
        bar.classList.toggle('lf-cal-tl-event--selected', selectedEvent()?.id === event.id)
      })
    }

    const isEditable = event.editable !== false && editable

    if (isEditable && onEventDrop) {
      bar.addEventListener('pointerdown', (e: PointerEvent) => {
        if ((e.target as HTMLElement).classList.contains('lf-cal-tl-event-resize')) return
        e.preventDefault(); e.stopPropagation()
        const phantom = bar.cloneNode(true) as HTMLElement
        phantom.className = 'lf-cal-tl-event lf-cal-tl-event--phantom'
        phantom.style.pointerEvents = 'none'
        bar.parentElement?.appendChild(phantom)
        dragState = {
          event, el: bar,
          originalStart: new Date(event.start),
          originalEnd: new Date(event.end),
          offsetX: e.clientX - bar.getBoundingClientRect().left,
          currentResourceId: rowResourceId,
          phantom,
        }
        bar.classList.add('lf-cal-tl-event--dragging')
        bar.removeAttribute('data-conflict')
        bar.setPointerCapture(e.pointerId)
      })

      bar.addEventListener('pointermove', (e: PointerEvent) => {
        if (!dragState || dragState.event.id !== event.id) return
        e.preventDefault()
        const relX = e.clientX - grid.getBoundingClientRect().left + scrollArea.scrollLeft - dragState.offsetX
        const dur = diffInMinutes(dragState.originalStart, dragState.originalEnd)
        const newStartMins = Math.max(config.dayStart * 60,
          Math.min(snapMins(config.dayStart * 60 + pxToMinutes(relX)), config.dayEnd * 60 - dur))
        const ns = new Date(startOfDay(day)); ns.setHours(0, newStartMins, 0, 0)
        const ne = addMinutes(ns, dur)
        const { left: nl, width: nw } = calculateTimelinePosition(ns, ne, config.dayStart, tl.cellDuration, tl.cellWidth)
        bar.style.left = `${nl}px`; bar.style.width = `${nw}px`
        const below = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lf-cal-tl-row') as HTMLElement | null
        if (below) dragState.currentResourceId = below.dataset.resourceId
      })

      bar.addEventListener('pointerup', (e: PointerEvent) => {
        if (!dragState || dragState.event.id !== event.id) return
        e.preventDefault()
        const relX = e.clientX - grid.getBoundingClientRect().left + scrollArea.scrollLeft - dragState.offsetX
        const dur = diffInMinutes(dragState.originalStart, dragState.originalEnd)
        const newStartMins = Math.max(config.dayStart * 60,
          Math.min(snapMins(config.dayStart * 60 + pxToMinutes(relX)), config.dayEnd * 60 - dur))
        const ns = new Date(startOfDay(day)); ns.setHours(0, newStartMins, 0, 0)
        const ne = addMinutes(ns, dur)
        dragState.phantom?.remove()
        bar.classList.remove('lf-cal-tl-event--dragging')
        const rid = dragState.currentResourceId
        dragState = null
        onEventDrop(event, ns, ne, rid)
      })
    }

    if (isEditable && onEventResize) {
      const handle = document.createElement('div')
      handle.className = 'lf-cal-tl-event-resize'
      bar.appendChild(handle)

      handle.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault(); e.stopPropagation()
        const phantom = bar.cloneNode(true) as HTMLElement
        phantom.className = 'lf-cal-tl-event lf-cal-tl-event--phantom'
        phantom.style.pointerEvents = 'none'
        bar.parentElement?.appendChild(phantom)
        resizeState = { event, el: bar, phantom }
        bar.classList.add('lf-cal-tl-event--resizing')
        bar.removeAttribute('data-conflict')
        handle.setPointerCapture(e.pointerId)
      })

      handle.addEventListener('pointermove', (e: PointerEvent) => {
        if (!resizeState || resizeState.event.id !== event.id) return
        e.preventDefault()
        const newW = Math.max(e.clientX - resizeState.el.getBoundingClientRect().left, tl.cellWidth / 4)
        const newDur = Math.max(tl.cellDuration, snapMins(pxToMinutes(newW)))
        const { width } = calculateTimelinePosition(event.start, addMinutes(event.start, newDur), config.dayStart, tl.cellDuration, tl.cellWidth)
        bar.style.width = `${width}px`
      })

      handle.addEventListener('pointerup', (e: PointerEvent) => {
        if (!resizeState || resizeState.event.id !== event.id) return
        e.preventDefault()
        const newW = Math.max(e.clientX - resizeState.el.getBoundingClientRect().left, tl.cellWidth / 4)
        const newDur = Math.max(tl.cellDuration, snapMins(pxToMinutes(newW)))
        resizeState.phantom?.remove()
        bar.classList.remove('lf-cal-tl-event--resizing')
        resizeState = null
        onEventResize(event, addMinutes(event.start, newDur))
      })
    }

    renderIndicators(event, bar, eventTooltip)

    return bar
  }

  // ─── Build static skeleton (rows without events) ─────────────────────────
  // Called once per date change. Builds resourceLabels column and empty grid rows.

  const rowMap = new Map<string, HTMLDivElement>() // resourceId → row div

  function buildSkeleton(day: Date): void {
    // Cancel any in-progress drag-to-create before rebuilding DOM
    if (createDragState) {
      createDragState.preview.remove()
      createDragState = null
    }
    resourceLabels.innerHTML = ''
    grid.innerHTML = ''
    rowMap.clear()

    if (nowLineInterval !== null) { clearInterval(nowLineInterval); nowLineInterval = null }
    nowLine = null

    const displayResources = resources.length > 0 ? resources : [undefined as Resource | undefined]

    for (const resource of displayResources) {
      // Label
      const label = document.createElement('div')
      label.className = 'lf-cal-tl-resource-label'
      label.style.height = `${tl.rowHeight}px`
      if (resource?.color) label.style.borderLeft = `3px solid ${resource.color}`

      const nameEl = document.createElement('span')
      nameEl.className = 'lf-cal-tl-resource-name'
      nameEl.textContent = resource?.name ?? ''
      label.appendChild(nameEl)

      if (resource?.role) {
        const roleEl = document.createElement('span')
        roleEl.className = 'lf-cal-tl-resource-role'
        roleEl.textContent = resource.role
        label.appendChild(roleEl)
      }
      resourceLabels.appendChild(label)

      // Grid row (background cells only — events are patched separately)
      const row = document.createElement('div')
      row.className = 'lf-cal-tl-row'
      row.style.height = `${tl.rowHeight}px`
      row.style.position = 'relative'
      row.style.width = `${totalWidth}px`
      if (resource) row.dataset.resourceId = resource.id

      for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div')
        cell.className = 'lf-cal-tl-row-cell'
        cell.style.left  = `${i * tl.cellWidth}px`
        cell.style.width = `${tl.cellWidth}px`

        if (selectable && onSlotClick) {
          cell.addEventListener('click', () => {
            const cs = new Date(startOfDay(day))
            cs.setHours(config.dayStart, i * tl.cellDuration, 0, 0)
            onSlotClick(cs, addMinutes(cs, tl.cellDuration), resource?.id)
          })
        }
        row.appendChild(cell)
      }

      // ── Drag-to-create ──────────────────────────────────────────────────
      if (selectable && onSlotSelect) {
        const slotSelectCb = onSlotSelect
        const useIndicator = selection?.snapIndicator ?? false
        const maxDuration  = selection?.maxDuration ?? Infinity

        row.addEventListener('pointerdown', (e: PointerEvent) => {
          // Only start drag on left button and empty row (not on an event bar)
          if (e.button !== 0) return
          if ((e.target as HTMLElement).closest('.lf-cal-tl-event')) return
          e.preventDefault()

          const startMins = snapToGrid(
            Math.max(
              config.dayStart * 60,
              Math.min(
                config.dayEnd * 60,
                getTimeFromMouseX(e.clientX, grid, scrollArea.scrollLeft,
                  config.dayStart, tl.cellDuration, tl.cellWidth),
              ),
            ),
            tl.cellDuration,
          )
          const endMins = startMins + tl.cellDuration

          const startDate = new Date(startOfDay(day)); startDate.setHours(0, startMins, 0, 0)
          const endDate   = new Date(startOfDay(day)); endDate.setHours(0, endMins, 0, 0)
          const { left, width } = calculateTimelinePosition(startDate, endDate, config.dayStart, tl.cellDuration, tl.cellWidth)

          const preview = document.createElement('div')
          preview.className = 'lf-cal-tl-drag-preview'
          preview.style.left   = `${left}px`
          preview.style.width  = `${width}px`
          preview.style.height = `${tl.rowHeight - 10}px`
          preview.style.top    = '5px'
          row.appendChild(preview)

          const badge = useIndicator ? createTlSnapBadge() : null
          createDragState = { startMinutes: startMins, currentEndMinutes: endMins, resourceId: resource?.id, row, preview, badge }
          row.setPointerCapture(e.pointerId)
        })

        row.addEventListener('pointermove', (e: PointerEvent) => {
          if (!createDragState || createDragState.row !== row) return
          e.preventDefault()

          const rawMins = getTimeFromMouseX(e.clientX, grid, scrollArea.scrollLeft,
            config.dayStart, tl.cellDuration, tl.cellWidth)
          // Apply maxDuration cap then snap
          const cappedRaw = isFinite(maxDuration)
            ? Math.min(rawMins, createDragState.startMinutes + maxDuration)
            : rawMins
          const endMins = snapToGrid(
            Math.max(createDragState.startMinutes + tl.cellDuration,
              Math.min(config.dayEnd * 60, cappedRaw)),
            tl.cellDuration,
          )
          createDragState.currentEndMinutes = endMins

          const startDate = new Date(startOfDay(day)); startDate.setHours(0, createDragState.startMinutes, 0, 0)
          const endDate   = new Date(startOfDay(day)); endDate.setHours(0, endMins, 0, 0)
          const { left, width } = calculateTimelinePosition(startDate, endDate, config.dayStart, tl.cellDuration, tl.cellWidth)
          createDragState.preview.style.left  = `${left}px`
          createDragState.preview.style.width = `${width}px`

          if (createDragState.badge) {
            updateTlSnapBadge(createDragState.badge, endMins - createDragState.startMinutes, e.clientX, e.clientY)
          }
        })

        const finishCreate = (e: PointerEvent) => {
          if (!createDragState || createDragState.row !== row) return
          e.preventDefault()
          const { startMinutes, currentEndMinutes, resourceId: rid, preview, badge } = createDragState
          preview.remove()
          if (badge) { badge.style.display = 'none'; badge.remove() }
          createDragState = null
          const startDate = new Date(startOfDay(day)); startDate.setHours(0, startMinutes, 0, 0)
          const endDate   = new Date(startOfDay(day)); endDate.setHours(0, currentEndMinutes, 0, 0)
          slotSelectCb(startDate, endDate, rid)
        }

        row.addEventListener('pointerup', finishCreate)
        row.addEventListener('pointercancel', () => {
          if (!createDragState || createDragState.row !== row) return
          createDragState.preview.remove()
          if (createDragState.badge) { createDragState.badge.style.display = 'none'; createDragState.badge.remove() }
          createDragState = null
        })
      }

      grid.appendChild(row)
      rowMap.set(resource?.id ?? '__none__', row)
    }

    // Now indicator
    if (tl.nowIndicator && isToday(day)) {
      nowLine = document.createElement('div')
      nowLine.className = 'lf-cal-tl-now-line'
      grid.appendChild(nowLine)
      updateNowLine()
      nowLineInterval = setInterval(updateNowLine, 60000)
    }
  }

  // ─── Patch event bars (called on every events() change) ──────────────────
  // Removes old .lf-cal-tl-event nodes from each row, re-renders from current events list.

  function patchEvents(day: Date, allEvents: T[]): void {
    for (const [rid, row] of rowMap) {
      const resourceId = rid === '__none__' ? undefined : rid
      const rowEvents = allEvents.filter(
        (e) => (resourceId === undefined || e.resourceId === resourceId) &&
               e.start.getFullYear() === day.getFullYear() &&
               e.start.getMonth()    === day.getMonth() &&
               e.start.getDate()     === day.getDate()
      )

      // Build a key→event map for the new set
      const newByKey = new Map<string, T>()
      for (const e of rowEvents) newByKey.set(getEventKey(e), e)

      // Build a key→element map for existing bars in the DOM
      const existingBars = Array.from(row.querySelectorAll<HTMLElement>('.lf-cal-tl-event'))
      const existingByKey = new Map<string, HTMLElement>()
      for (const bar of existingBars) {
        const k = bar.dataset.eventKey
        if (k) existingByKey.set(k, bar)
      }

      // Remove bars that are no longer in the new set
      for (const [k, bar] of existingByKey) {
        if (!newByKey.has(k)) bar.remove()
      }

      // Add or update bars
      for (const event of rowEvents) {
        const key = getEventKey(event)
        const existing = existingByKey.get(key)
        if (existing) {
          // Update position/size in-place — no DOM removal, no Reflow on scroll container
          const { left, width } = calculateTimelinePosition(event.start, event.end, config.dayStart, tl.cellDuration, tl.cellWidth)
          existing.style.left  = `${left}px`
          existing.style.width = `${width}px`
          // Update title text if changed
          const titleEl = existing.querySelector('.lf-cal-tl-event-title')
          if (titleEl && titleEl.textContent !== event.title) titleEl.textContent = event.title
        } else {
          const bar = renderEventBar(event, day, resourceId)
          bar.dataset.eventKey = key
          row.appendChild(bar)
        }
      }
    }
  }

  // ─── Build time label cells ───────────────────────────────────────────────

  function buildTimeLabels(day: Date): void {
    timeLabelsInner.innerHTML = ''
    // Restore current scroll offset so the header doesn't snap to 0
    timeLabelsInner.style.transform = `translateX(-${scrollArea.scrollLeft}px)`

    // Build one label cell per HOUR spanning the correct px width,
    // regardless of slot granularity. This way "08:00" always has enough room.
    const slotsPerHour = Math.round(60 / tl.cellDuration)
    const hourWidth = slotsPerHour * tl.cellWidth          // e.g. 4×25 = 100px
    const totalHours = config.dayEnd - config.dayStart

    for (let h = 0; h < totalHours; h++) {
      const t0 = new Date(day)
      t0.setHours(config.dayStart + h, 0, 0, 0)
      const cell = document.createElement('div')
      cell.className = 'lf-cal-tl-time-cell'
      cell.style.width    = `${hourWidth}px`
      cell.style.minWidth = `${hourWidth}px`
      cell.textContent = formatTime(t0, locale)
      timeLabelsInner.appendChild(cell)
    }
  }

  // ─── Effect 1: structure — runs only when date() changes ─────────────────
  // IMPORTANT: must NOT read events() here — that would make effect 1 re-run
  // on every simulation tick and rebuild the full skeleton, causing the header
  // transform to reset (snap-to-0 flicker) on every live update.

  let lastDay: Date | null = null
  let lastEvents: T[] = []

  effect(() => {
    const day = date()
    lastDay = day
    buildTimeLabels(day)
    buildSkeleton(day)
    // Use lastEvents snapshot — do NOT call events() here
    patchEvents(day, lastEvents)
  })

  // ─── Effect 2: events only — runs when events() changes ──────────────────
  // Stores the latest events in lastEvents, then patches rows.
  // Skips the first run so Effect 1 can do the initial render cleanly,
  // but Effect 1 reads lastEvents which starts as [] — so we need to
  // trigger an initial patch after Effect 1 has set up the skeleton.

  let firstEventsRun = true

  effect(() => {
    const allEvents = events()
    lastEvents = allEvents
    if (firstEventsRun) {
      firstEventsRun = false
      // Effect 1 already ran (effects run synchronously on first call) so
      // lastDay is set — patch with the real initial events now.
      if (lastDay) patchEvents(lastDay, allEvents)
      return
    }
    if (lastDay) patchEvents(lastDay, allEvents)
  })

  // ─── Escape key — cancel drag-to-create ──────────────────────────────────

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && createDragState) {
      createDragState.preview.remove()
      if (createDragState.badge) { createDragState.badge.style.display = 'none'; createDragState.badge.remove() }
      createDragState = null
    }
  }
  document.addEventListener('keydown', handleKeyDown)

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  const originalRemove = container.remove.bind(container)
  container.remove = () => {
    if (hScrollDispose) hScrollDispose()
    if (nowLineInterval !== null) clearInterval(nowLineInterval)
    document.removeEventListener('keydown', handleKeyDown)
    if (createDragState) {
      createDragState.preview.remove()
      if (createDragState.badge) { createDragState.badge.style.display = 'none'; createDragState.badge.remove() }
      createDragState = null
    }
    originalRemove()
  }

  return container
}
