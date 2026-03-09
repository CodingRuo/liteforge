import { describe, it, expect } from 'vitest'
import { findConflicts } from '../src/utils/conflict.js'
import type { CalendarEvent } from '../src/types.js'

function makeEvent(
  id: string,
  startH: number,
  startM: number,
  endH: number,
  endM: number,
  resourceId?: string,
): CalendarEvent {
  const base = new Date('2024-01-15')
  const start = new Date(base)
  start.setHours(startH, startM, 0, 0)
  const end = new Date(base)
  end.setHours(endH, endM, 0, 0)
  return { id, title: id, start, end, resourceId }
}

describe('findConflicts', () => {
  describe('no overlap', () => {
    it('returns empty array when no events', () => {
      const event = makeEvent('a', 9, 0, 10, 0)
      expect(findConflicts(event, [])).toEqual([])
    })

    it('returns empty array when events are non-overlapping', () => {
      const event = makeEvent('a', 9, 0, 10, 0)
      const others = [
        makeEvent('b', 7, 0, 8, 0),
        makeEvent('c', 10, 0, 11, 0),
        makeEvent('d', 11, 0, 12, 0),
      ]
      expect(findConflicts(event, others)).toEqual([])
    })

    it('back-to-back is NOT a conflict (A.end === B.start)', () => {
      const event = makeEvent('a', 9, 0, 10, 0)
      const backToBack = makeEvent('b', 10, 0, 11, 0)
      expect(findConflicts(event, [backToBack])).toEqual([])
    })

    it('back-to-back reversed (A.start === B.end) is NOT a conflict', () => {
      const event = makeEvent('a', 10, 0, 11, 0)
      const before = makeEvent('b', 9, 0, 10, 0)
      expect(findConflicts(event, [before])).toEqual([])
    })
  })

  describe('overlap detection', () => {
    it('detects overlap on same resource', () => {
      const event  = makeEvent('a', 9, 0, 11, 0, 'r1')
      const other  = makeEvent('b', 10, 0, 12, 0, 'r1')
      const result = findConflicts(event, [other])
      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('b')
    })

    it('detects full containment (B inside A)', () => {
      const event = makeEvent('a', 9, 0, 12, 0)
      const inner = makeEvent('b', 10, 0, 11, 0)
      const result = findConflicts(event, [inner])
      expect(result).toHaveLength(1)
    })

    it('detects full containment (A inside B)', () => {
      const event = makeEvent('a', 10, 0, 11, 0)
      const outer = makeEvent('b', 9, 0, 12, 0)
      const result = findConflicts(event, [outer])
      expect(result).toHaveLength(1)
    })

    it('returns multiple conflicts', () => {
      const event = makeEvent('a', 9, 0, 12, 0, 'r1')
      const others = [
        makeEvent('b', 8, 0, 10, 0, 'r1'),
        makeEvent('c', 10, 0, 13, 0, 'r1'),
        makeEvent('d', 9, 30, 11, 0, 'r1'),
      ]
      const result = findConflicts(event, others)
      expect(result).toHaveLength(3)
    })
  })

  describe('resource filtering', () => {
    it('ignores events on different resource', () => {
      const event = makeEvent('a', 9, 0, 11, 0, 'r1')
      const other = makeEvent('b', 9, 0, 11, 0, 'r2')
      expect(findConflicts(event, [other])).toEqual([])
    })

    it('ignores event with no resource vs event with resource', () => {
      const event    = makeEvent('a', 9, 0, 11, 0, undefined)
      const withRes  = makeEvent('b', 9, 0, 11, 0, 'r1')
      expect(findConflicts(event, [withRes])).toEqual([])
    })

    it('ignores event with resource vs event with no resource', () => {
      const event   = makeEvent('a', 9, 0, 11, 0, 'r1')
      const noRes   = makeEvent('b', 9, 0, 11, 0, undefined)
      expect(findConflicts(event, [noRes])).toEqual([])
    })

    it('both null resourceId = same resource (does conflict)', () => {
      const event = makeEvent('a', 9, 0, 11, 0, undefined)
      const other = makeEvent('b', 9, 0, 11, 0, undefined)
      const result = findConflicts(event, [other])
      expect(result).toHaveLength(1)
    })
  })

  describe('excludeId', () => {
    it('excludes the dragged event itself', () => {
      const event = makeEvent('a', 9, 0, 11, 0, 'r1')
      // If we check against the full list including 'a' itself
      const allEvents = [
        event,
        makeEvent('b', 10, 0, 12, 0, 'r1'),
      ]
      const result = findConflicts(event, allEvents, 'a')
      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('b')
    })

    it('without excludeId, includes event with same id', () => {
      const event = makeEvent('a', 9, 0, 11, 0)
      const same  = makeEvent('a', 9, 0, 11, 0)
      const result = findConflicts(event, [same])
      expect(result).toHaveLength(1)
    })

    it('excludeId removes only the specified event', () => {
      const event = makeEvent('a', 9, 0, 12, 0, 'r1')
      const others = [
        makeEvent('a', 9, 0, 12, 0, 'r1'), // self, excluded
        makeEvent('b', 10, 0, 11, 0, 'r1'), // conflict
        makeEvent('c', 8, 0, 10, 0, 'r1'),  // conflict
      ]
      const result = findConflicts(event, others, 'a')
      expect(result).toHaveLength(2)
      expect(result.map(e => e.id).sort()).toEqual(['b', 'c'])
    })
  })
})
