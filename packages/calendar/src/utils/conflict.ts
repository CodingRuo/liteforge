/**
 * @liteforge/calendar - Event Conflict Detection
 *
 * Pure functions — no side effects, no DOM access.
 */

import type { CalendarEvent } from '../types.js'

/**
 * Evaluate an onEventConflict callback for a proposed event change.
 *
 * Returns:
 * - 'allow'   → no conflicts, or callback returned 'allow'
 * - 'warn'    → callback returned 'warn' (proceed, mark event)
 * - 'prevent' → callback returned 'prevent' (cancel operation)
 *
 * If no callback is provided, always returns 'allow'.
 */
export function checkConflict<T extends CalendarEvent>(
  updatedEvent: T,
  allEvents: T[],
  excludeId: string,
  onConflict?: (event: T, conflicts: T[]) => 'allow' | 'warn' | 'prevent',
): 'allow' | 'warn' | 'prevent' {
  if (!onConflict) return 'allow'
  const conflicts = findConflicts(updatedEvent, allEvents, excludeId)
  if (conflicts.length === 0) return 'allow'
  return onConflict(updatedEvent, conflicts)
}

/**
 * Find all events that overlap with the given event on the same resource.
 *
 * Two events overlap when: A.start < B.end && A.end > B.start
 * Back-to-back events (A.end === B.start) are NOT considered conflicts.
 *
 * Events with no resourceId (null/undefined) are treated as belonging to
 * the same "null resource" and will conflict with each other.
 *
 * @param event     The event to check conflicts for (with updated start/end)
 * @param allEvents The full list of events to check against
 * @param excludeId Optional event ID to exclude (typically the dragged event itself)
 */
export function findConflicts<T extends CalendarEvent>(
  event: T,
  allEvents: T[],
  excludeId?: string,
): T[] {
  return allEvents.filter((other) => {
    if (excludeId !== undefined && other.id === excludeId) return false

    // Same resource: both null/undefined counts as same
    const sameResource =
      (event.resourceId ?? null) === (other.resourceId ?? null)
    if (!sameResource) return false

    // Overlap: strict inequality — back-to-back is NOT a conflict
    return event.start < other.end && event.end > other.start
  })
}
