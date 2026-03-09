/**
 * @liteforge/calendar - Virtual Scroll / Windowed Rendering
 *
 * Buckets timed events by time-slot and filters to only the visible
 * vertical viewport before the render loop, keeping DOM node count
 * bounded regardless of total event count.
 *
 * All-day events are never virtualized — they live in the all-day row,
 * not the scrollable time grid.
 */

import { signal } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import type { CalendarEvent } from './types.js'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface VisibleTimeRange {
  /** Minutes from midnight, e.g. 480 = 08:00 */
  startMinutes: number
  /** Minutes from midnight, e.g. 1080 = 18:00 */
  endMinutes: number
  /** Extra minutes to pre-render outside the visible area on each side */
  overscanMinutes: number
}

export interface VirtualizationConfig {
  /** Enable virtualization (default: true) */
  enabled?: boolean
  /** Min event count before virtualization activates (default: 100) */
  threshold?: number
  /** Overscan buffer in minutes (default: 60) */
  overscanMinutes?: number
}

/** Map from slot-index → events whose start falls in that slot */
export type EventBucket<T extends CalendarEvent> = Map<number, T[]>

// ─── Stable event key ──────────────────────────────────────────────────────

/**
 * Stable string key for a calendar event occurrence.
 * Recurring occurrences already have `::` in their id from the RRULE engine.
 */
export function getEventKey(event: CalendarEvent): string {
  return `${event.id}::${event.start.getTime()}`
}

// ─── Event bucketing ───────────────────────────────────────────────────────

/**
 * Bucket events by which time-slot their start time falls in.
 * Slot index = floor(minutesFromMidnight / slotDuration).
 *
 * O(n) — one pass over all events. Lookup per slot is O(1).
 */
export function bucketEvents<T extends CalendarEvent>(
  events: T[],
  slotDuration: number,
): EventBucket<T> {
  const bucket: EventBucket<T> = new Map()
  for (const event of events) {
    const minutes = event.start.getHours() * 60 + event.start.getMinutes()
    const slotIndex = Math.floor(minutes / slotDuration)
    let list = bucket.get(slotIndex)
    if (!list) {
      list = []
      bucket.set(slotIndex, list)
    }
    list.push(event)
  }
  return bucket
}

// ─── Visible-range filter ──────────────────────────────────────────────────

/**
 * Filter events to those that overlap the effective visible window
 * (visible range expanded by overscan on both sides).
 *
 * An event overlaps if: event.startMinutes < windowEnd && event.endMinutes > windowStart
 * Uses minutes-from-midnight comparisons — no Date allocation.
 */
export function filterEventsByTimeRange<T extends CalendarEvent>(
  events: T[],
  range: VisibleTimeRange,
): T[] {
  const windowStart = range.startMinutes - range.overscanMinutes
  const windowEnd   = range.endMinutes   + range.overscanMinutes

  return events.filter((event) => {
    const startMins = event.start.getHours() * 60 + event.start.getMinutes()
    const endMins   = event.end.getHours()   * 60 + event.end.getMinutes()

    // Midnight-spanning events: end < start means it crosses midnight.
    // Treat as ending at 1440 (end of day) for windowing purposes.
    const effectiveEnd = endMins <= startMins ? 1440 : endMins

    return startMins < windowEnd && effectiveEnd > windowStart
  })
}

// ─── Scroll-driven visible-range signal ────────────────────────────────────

const FRAME_MS = 16 // one animation frame

/**
 * Create a signal tracking the current visible time range and a scroll
 * handler to update it. The handler is debounced to one frame (16 ms).
 *
 * @param dayStart      - first hour of the time grid (e.g. 8)
 * @param dayEnd        - last hour of the time grid (e.g. 20)
 * @param slotDuration  - minutes per slot (e.g. 30)
 * @param overscan      - overscan buffer in minutes (default: 60)
 */
export function createScrollHandler(
  dayStart: number,
  dayEnd: number,
  slotDuration: number,
  overscan: number = 60,
): {
  visibleRange: Signal<VisibleTimeRange>
  onScroll: (scrollTop: number, containerHeight: number) => void
  dispose: () => void
} {
  const totalMinutes = (dayEnd - dayStart) * 60
  // Slot height in pixels (mirrors the CSS formula used by the views)
  const slotHeight = Math.round((slotDuration / 30) * 40)
  const pxPerMinute = slotHeight / slotDuration

  const visibleRange = signal<VisibleTimeRange>({
    startMinutes: dayStart * 60,
    endMinutes: dayEnd * 60,
    overscanMinutes: overscan,
  })

  let timer: ReturnType<typeof setTimeout> | null = null

  function compute(scrollTop: number, containerHeight: number): VisibleTimeRange {
    const startMins = dayStart * 60 + Math.floor(scrollTop / pxPerMinute)
    const endMins   = startMins + Math.ceil(containerHeight / pxPerMinute)
    return {
      startMinutes: Math.max(dayStart * 60, startMins),
      endMinutes:   Math.min(dayStart * 60 + totalMinutes, endMins),
      overscanMinutes: overscan,
    }
  }

  function onScroll(scrollTop: number, containerHeight: number): void {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      visibleRange.set(compute(scrollTop, containerHeight))
    }, FRAME_MS)
  }

  function dispose(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { visibleRange, onScroll, dispose }
}

// ─── Horizontal scroll (timeline view) ────────────────────────────────────

/**
 * Describes which portion of the timeline horizontal axis is currently visible,
 * expressed as minutes from the start of the timeline day.
 */
export interface HorizontalVisibleRange {
  /** Minutes from dayStart visible at the left edge of the viewport */
  startMinutes: number
  /** Minutes from dayStart visible at the right edge */
  endMinutes: number
  /** Overscan buffer in minutes pre-rendered on each side */
  overscanMinutes: number
}

/**
 * Create a signal tracking the horizontal visible range of a timeline scroll
 * container plus a scroll handler to keep it updated.
 *
 * @param dayStart     - hour the timeline begins (e.g. 0)
 * @param dayEnd       - hour the timeline ends (e.g. 24)
 * @param cellDuration - minutes per cell column (e.g. 60)
 * @param cellWidth    - pixel width of each cell (e.g. 100)
 * @param overscan     - overscan buffer in minutes (default: 120)
 */
export function createHorizontalScrollHandler(
  dayStart: number,
  dayEnd: number,
  cellDuration: number,
  cellWidth: number,
  overscan: number = 120,
): {
  visibleRange: Signal<HorizontalVisibleRange>
  onScroll: (scrollLeft: number, containerWidth: number) => void
  dispose: () => void
} {
  const totalMinutes = (dayEnd - dayStart) * 60
  const pxPerMinute = cellWidth / cellDuration

  const visibleRange = signal<HorizontalVisibleRange>({
    startMinutes: dayStart * 60,
    endMinutes: Math.min(dayStart * 60 + totalMinutes, (dayStart + (dayEnd - dayStart)) * 60),
    overscanMinutes: overscan,
  })

  let timer: ReturnType<typeof setTimeout> | null = null

  function compute(scrollLeft: number, containerWidth: number): HorizontalVisibleRange {
    const startMins = dayStart * 60 + Math.floor(scrollLeft / pxPerMinute)
    const endMins   = startMins + Math.ceil(containerWidth / pxPerMinute)
    return {
      startMinutes: Math.max(dayStart * 60, startMins),
      endMinutes:   Math.min(dayStart * 60 + totalMinutes, endMins),
      overscanMinutes: overscan,
    }
  }

  function onScroll(scrollLeft: number, containerWidth: number): void {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      visibleRange.set(compute(scrollLeft, containerWidth))
    }, FRAME_MS)
  }

  function dispose(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return { visibleRange, onScroll, dispose }
}

/**
 * Calculate the pixel left-offset and width of an event bar on the timeline.
 *
 * @param eventStart   - event start Date
 * @param eventEnd     - event end Date
 * @param dayStart     - hour the timeline begins
 * @param cellDuration - minutes per cell column
 * @param cellWidth    - pixel width per cell
 */
export function calculateTimelinePosition(
  eventStart: Date,
  eventEnd: Date,
  dayStart: number,
  cellDuration: number,
  cellWidth: number,
): { left: number; width: number } {
  const pxPerMinute = cellWidth / cellDuration
  const timelineOriginMinutes = dayStart * 60

  const startMins = eventStart.getHours() * 60 + eventStart.getMinutes()
  const endMins   = eventEnd.getHours()   * 60 + eventEnd.getMinutes()

  const left  = (startMins - timelineOriginMinutes) * pxPerMinute
  const width = Math.max((endMins - startMins) * pxPerMinute, 2) // min 2px

  return { left, width }
}

/**
 * Calculate pixel position of the now-indicator line on the horizontal timeline.
 * Returns null if current time is outside the timeline range.
 *
 * @param dayStart     - hour the timeline begins
 * @param dayEnd       - hour the timeline ends
 * @param cellDuration - minutes per cell column
 * @param cellWidth    - pixel width per cell
 */
export function getNowIndicatorPosition(
  dayStart: number,
  dayEnd: number,
  cellDuration: number,
  cellWidth: number,
): number | null {
  const now = new Date()
  const nowMins = now.getHours() * 60 + now.getMinutes()
  const startMins = dayStart * 60
  const endMins   = dayEnd   * 60

  if (nowMins < startMins || nowMins > endMins) return null

  const pxPerMinute = cellWidth / cellDuration
  return (nowMins - startMins) * pxPerMinute
}

/**
 * Filter a resource list to those whose row index falls within the current
 * vertical viewport, expanded by the given overscan row count.
 *
 * Used for vertical virtualization of resource rows in the timeline view.
 *
 * @param resources       - full resource array
 * @param rowHeight       - pixel height of each resource row
 * @param scrollTop       - current scrollTop of the scroll container
 * @param containerHeight - visible height of the scroll container
 * @param overscanRows    - number of extra rows to pre-render on each side (default: 2)
 */
export function filterResourcesByViewport<R extends { id: string }>(
  resources: R[],
  rowHeight: number,
  scrollTop: number,
  containerHeight: number,
  overscanRows: number = 2,
): R[] {
  if (resources.length === 0) return []

  const firstVisible = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows)
  const lastVisible  = Math.min(
    resources.length - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscanRows,
  )

  return resources.slice(firstVisible, lastVisible + 1)
}

// ─── Should-virtualize gate ────────────────────────────────────────────────

const DEFAULT_THRESHOLD   = 100
const DEFAULT_OVERSCAN_MS = 60

/**
 * Resolve the effective virtualization config with defaults.
 */
export function resolveVirtConfig(cfg: VirtualizationConfig | undefined): {
  enabled: boolean
  threshold: number
  overscanMinutes: number
} {
  return {
    enabled:        cfg?.enabled        ?? true,
    threshold:      cfg?.threshold      ?? DEFAULT_THRESHOLD,
    overscanMinutes: cfg?.overscanMinutes ?? DEFAULT_OVERSCAN_MS,
  }
}

/**
 * Return true if virtualization should activate for this event list.
 */
export function shouldVirtualize(
  eventCount: number,
  cfg: VirtualizationConfig | undefined,
): boolean {
  const { enabled, threshold } = resolveVirtConfig(cfg)
  return enabled && eventCount >= threshold
}
