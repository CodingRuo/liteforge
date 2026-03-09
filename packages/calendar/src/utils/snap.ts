/**
 * @liteforge/calendar - Shared Snap Utility
 *
 * Pure function — no DOM access, no view-specific logic.
 * Used by week-view and day-view (vertical axis, Y-coordinate based).
 * Timeline keeps its own snapToGrid() (horizontal axis, different units).
 */

export interface SnapResult {
  /** Absolute minutes from midnight (e.g. dayStart=8 → 8*60=480 minimum) */
  minutes: number
  /** "HH:MM" display string */
  time: string
}

/**
 * Snap a pixel offset (from the top of the day grid) to the nearest time slot.
 *
 * @param deltaY          Pixels from the top of the rendered day area
 * @param pixelsPerMinute Slot height divided by slot duration (px/min)
 * @param snapInterval    Snap granularity in minutes (= slotDuration)
 * @param dayStartMinutes Day start in absolute minutes from midnight (dayStart * 60)
 * @param dayEndMinutes   Day end in absolute minutes from midnight (dayEnd * 60)
 */
export function snapToSlot(
  deltaY: number,
  pixelsPerMinute: number,
  snapInterval: number,
  dayStartMinutes: number,
  dayEndMinutes: number,
): SnapResult {
  const rawMinutesFromDayStart = deltaY / pixelsPerMinute
  const snappedFromDayStart = Math.round(rawMinutesFromDayStart / snapInterval) * snapInterval
  const absMinutes = Math.max(
    dayStartMinutes,
    Math.min(dayStartMinutes + snappedFromDayStart, dayEndMinutes),
  )

  const h = Math.floor(absMinutes / 60)
  const m = absMinutes % 60
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

  return { minutes: absMinutes, time }
}
