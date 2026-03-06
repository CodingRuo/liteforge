/**
 * @liteforge/calendar - Slot Selection Interaction
 *
 * Enables selecting time ranges by clicking and dragging on empty slots.
 */

import type { ResolvedTimeConfig, SelectionConfig } from '../types.js'
import { addMinutes, diffInMinutes } from '../date-utils.js'

export interface SlotSelectionOptions {
  slotsContainer: HTMLElement
  day: Date
  config: ResolvedTimeConfig
  resourceId?: string | undefined
  selection?: SelectionConfig | undefined
  onSlotClick?: ((start: Date, end: Date, resourceId?: string) => void) | undefined
  onSlotSelect?: ((start: Date, end: Date, resourceId?: string) => void) | undefined
}

export interface SlotSelectionState {
  isSelecting: boolean
  startSlot: Date | null
  currentSlot: Date | null
  cleanup: () => void
}

/**
 * Calculate slot time from Y position within the slots container.
 */
function getSlotTimeFromY(
  y: number,
  containerRect: DOMRect,
  day: Date,
  config: ResolvedTimeConfig
): Date {
  const relativeY = y - containerRect.top
  const slotHeight = Math.round((config.slotDuration / 30) * 40)
  const totalSlots = (config.dayEnd - config.dayStart) * (60 / config.slotDuration)

  // Calculate which slot index we're in
  const slotIndex = Math.floor(relativeY / slotHeight)
  const clampedIndex = Math.max(0, Math.min(slotIndex, totalSlots - 1))

  // Convert to time
  const minutesFromStart = clampedIndex * config.slotDuration
  const hours = config.dayStart + Math.floor(minutesFromStart / 60)
  const minutes = minutesFromStart % 60

  const result = new Date(day)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Highlight slots between start and current selection.
 */
function highlightSlots(
  slotsContainer: HTMLElement,
  startSlot: Date,
  endSlot: Date,
  config: ResolvedTimeConfig
): void {
  // Clear existing highlights
  clearHighlights(slotsContainer)

  const slots = slotsContainer.children
  const startMinutes = (startSlot.getHours() - config.dayStart) * 60 + startSlot.getMinutes()
  const endMinutes = (endSlot.getHours() - config.dayStart) * 60 + endSlot.getMinutes()

  const minMinutes = Math.min(startMinutes, endMinutes)
  const maxMinutes = Math.max(startMinutes, endMinutes)

  const startIndex = Math.floor(minMinutes / config.slotDuration)
  const endIndex = Math.floor(maxMinutes / config.slotDuration)

  for (let i = startIndex; i <= endIndex && i < slots.length; i++) {
    const slot = slots[i]
    if (slot) {
      slot.classList.add('lf-cal-time-slot--selected')
    }
  }
}

/**
 * Clear all slot highlights.
 */
function clearHighlights(slotsContainer: HTMLElement): void {
  const slots = slotsContainer.querySelectorAll('.lf-cal-time-slot--selected')
  slots.forEach((slot) => {
    slot.classList.remove('lf-cal-time-slot--selected')
  })
}

// ─── Snap Indicator Badge ─────────────────────────────────

const SNAP_COLORS = [
  { minutes: 15,  bg: '#22c55e', color: '#fff' },  // green
  { minutes: 30,  bg: '#3b82f6', color: '#fff' },  // blue
  { minutes: 45,  bg: '#f97316', color: '#fff' },  // orange
  { minutes: 60,  bg: '#ef4444', color: '#fff' },  // red
  { minutes: Infinity, bg: '#7c3aed', color: '#fff' }, // purple (beyond 60)
]

function resolveStepColors(snapSteps?: number[]): { minutes: number; bg: string; color: string }[] {
  if (!snapSteps || snapSteps.length === 0) return SNAP_COLORS
  return [
    ...snapSteps.map((m, i) => ({
      minutes: m,
      bg: SNAP_COLORS[Math.min(i, SNAP_COLORS.length - 1)]!.bg,
      color: '#fff',
    })),
    { minutes: Infinity, bg: SNAP_COLORS[SNAP_COLORS.length - 1]!.bg, color: '#fff' },
  ]
}

function createSnapBadge(): HTMLElement {
  const badge = document.createElement('div')
  badge.className = 'lf-cal-snap-badge'
  badge.style.display = 'none'
  document.body.appendChild(badge)
  return badge
}

function updateSnapBadge(
  badge: HTMLElement,
  durationMinutes: number,
  x: number,
  y: number,
  stepColors: { minutes: number; bg: string; color: string }[],
): void {
  const step = stepColors.find(s => durationMinutes <= s.minutes) ?? stepColors[stepColors.length - 1]!
  badge.textContent = `${durationMinutes} min`
  badge.style.background = step.bg
  badge.style.color = step.color
  badge.style.left = `${x + 14}px`
  badge.style.top = `${y - 24}px`
  badge.style.display = 'block'
}

function hideSnapBadge(badge: HTMLElement): void {
  badge.style.display = 'none'
}

/**
 * Set up slot selection interaction on a slots container.
 */
export function setupSlotSelection(options: SlotSelectionOptions): SlotSelectionState {
  const { slotsContainer, day, config, resourceId, selection, onSlotClick, onSlotSelect } = options

  const useIndicator = selection?.snapIndicator ?? false
  const maxDuration = selection?.maxDuration ?? Infinity
  const stepColors = resolveStepColors(selection?.snapSteps)

  const state: SlotSelectionState = {
    isSelecting: false,
    startSlot: null,
    currentSlot: null,
    cleanup: () => {},
  }

  let containerRect: DOMRect | null = null
  let snapBadge: HTMLElement | null = useIndicator ? createSnapBadge() : null

  const handlePointerDown = (e: PointerEvent) => {
    // Only handle left click
    if (e.button !== 0) return

    // Ignore clicks on events
    const target = e.target as HTMLElement
    if (target.closest('.lf-cal-event')) return

    containerRect = slotsContainer.getBoundingClientRect()
    const startTime = getSlotTimeFromY(e.clientY, containerRect, day, config)

    state.isSelecting = true
    state.startSlot = startTime
    state.currentSlot = startTime

    // Highlight initial slot
    highlightSlots(slotsContainer, startTime, startTime, config)

    // Prevent text selection during drag
    document.body.style.userSelect = 'none'

    // Capture pointer for tracking (not available in all test environments)
    if (target.setPointerCapture) {
      target.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!state.isSelecting || !state.startSlot || !containerRect) return

    let currentTime = getSlotTimeFromY(e.clientY, containerRect, day, config)

    // Apply maxDuration cap (forward drag only).
    // finalEnd = currentTime + slotDuration, so cap currentTime at startSlot + (maxDuration - slotDuration).
    if (currentTime > state.startSlot && isFinite(maxDuration)) {
      const maxCurrentTime = addMinutes(state.startSlot, maxDuration - config.slotDuration)
      if (currentTime >= maxCurrentTime) {
        currentTime = maxCurrentTime
      }
    }

    state.currentSlot = currentTime

    // Update highlight
    highlightSlots(slotsContainer, state.startSlot, currentTime, config)

    // Update snap badge
    if (snapBadge) {
      const endTime = currentTime >= state.startSlot ? currentTime : state.startSlot
      const startTime = currentTime >= state.startSlot ? state.startSlot : currentTime
      const duration = diffInMinutes(startTime, addMinutes(endTime, config.slotDuration))
      if (duration > config.slotDuration) {
        updateSnapBadge(snapBadge, duration, e.clientX, e.clientY, stepColors)
      } else {
        hideSnapBadge(snapBadge)
      }
    }
  }

  const handlePointerUp = (_e: PointerEvent) => {
    if (!state.isSelecting || !state.startSlot) {
      state.isSelecting = false
      return
    }

    if (snapBadge) hideSnapBadge(snapBadge)

    const endTime = state.currentSlot ?? state.startSlot

    // Determine start and end (swap if needed)
    let finalStart = state.startSlot
    let finalEnd = addMinutes(endTime, config.slotDuration)

    if (finalStart > endTime) {
      finalStart = endTime
      finalEnd = addMinutes(state.startSlot, config.slotDuration)
    }

    // Clear selection state
    state.isSelecting = false
    state.startSlot = null
    state.currentSlot = null
    document.body.style.userSelect = ''

    // Clear highlights
    clearHighlights(slotsContainer)

    // Determine if this was a click or drag
    const wasClick = finalStart.getTime() === endTime.getTime()

    if (wasClick && onSlotClick) {
      onSlotClick(finalStart, finalEnd, resourceId)
    } else if (!wasClick && onSlotSelect) {
      onSlotSelect(finalStart, finalEnd, resourceId)
    } else if (onSlotClick) {
      // Fallback: treat drag as click for the range
      onSlotClick(finalStart, finalEnd, resourceId)
    }
  }

  const handlePointerCancel = () => {
    state.isSelecting = false
    state.startSlot = null
    state.currentSlot = null
    document.body.style.userSelect = ''
    clearHighlights(slotsContainer)
    if (snapBadge) hideSnapBadge(snapBadge)
  }

  // Attach listeners
  slotsContainer.addEventListener('pointerdown', handlePointerDown)
  slotsContainer.addEventListener('pointermove', handlePointerMove)
  slotsContainer.addEventListener('pointerup', handlePointerUp)
  slotsContainer.addEventListener('pointercancel', handlePointerCancel)

  // Store cleanup function
  state.cleanup = () => {
    slotsContainer.removeEventListener('pointerdown', handlePointerDown)
    slotsContainer.removeEventListener('pointermove', handlePointerMove)
    slotsContainer.removeEventListener('pointerup', handlePointerUp)
    slotsContainer.removeEventListener('pointercancel', handlePointerCancel)
    clearHighlights(slotsContainer)
    if (snapBadge) {
      snapBadge.remove()
      snapBadge = null
    }
  }

  return state
}
