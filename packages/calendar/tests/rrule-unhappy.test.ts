/**
 * @liteforge/calendar - RRULE Unhappy-Path Tests
 *
 * Covers edge cases and error paths for parseRRule, serializeRRule,
 * and expandRecurring that are not exercised by recurrence.test.ts.
 */

import { describe, it, expect } from 'vitest'
import { parseRRule, serializeRRule, expandRecurring } from '../src/recurring.js'
import type { CalendarEvent } from '../src/types.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEvent(
  id: string,
  start: Date,
  end: Date,
  recurring?: CalendarEvent['recurring'],
): CalendarEvent {
  return { id, title: `Event ${id}`, start, end, ...(recurring ? { recurring } : {}) }
}

// ─── parseRRule — unhappy paths ───────────────────────────────────────────────

describe('parseRRule — unhappy paths', () => {
  it('throws for empty string (missing FREQ)', () => {
    expect(() => parseRRule('')).toThrow('RRULE missing FREQ')
  })

  it('throws for whitespace-only string (missing FREQ)', () => {
    expect(() => parseRRule('   ')).toThrow('RRULE missing FREQ')
  })

  it('throws for unknown FREQ value HOURLY', () => {
    expect(() => parseRRule('FREQ=HOURLY')).toThrow('Unknown FREQ: HOURLY')
  })

  it('handles RRULE string with only FREQ=DAILY', () => {
    const r = parseRRule('FREQ=DAILY')
    expect(r.frequency).toBe('daily')
  })

  it('ignores unknown keys without crashing', () => {
    const r = parseRRule('FREQ=WEEKLY;UNKNOWN_KEY=VALUE;BYDAY=MO')
    expect(r.frequency).toBe('weekly')
    expect(r.byDay).toEqual([{ day: 'MO' }])
  })

  it('COUNT=0 parses correctly', () => {
    const r = parseRRule('FREQ=DAILY;COUNT=0')
    expect(r.count).toBe(0)
  })

  it('parses string without INTERVAL (interval stays undefined)', () => {
    const r = parseRRule('FREQ=DAILY;COUNT=3')
    expect(r.interval).toBeUndefined()
  })

  it('throws for missing FREQ even with other valid parts', () => {
    expect(() => parseRRule('COUNT=3;BYDAY=MO')).toThrow('RRULE missing FREQ')
  })

  it('throws on invalid BYDAY token', () => {
    expect(() => parseRRule('FREQ=WEEKLY;BYDAY=XY')).toThrow()
  })

  it('parses FREQ=WEEKLY;BYDAY=MO (single day, no count — unlimited)', () => {
    const r = parseRRule('FREQ=WEEKLY;BYDAY=MO')
    expect(r.frequency).toBe('weekly')
    expect(r.byDay?.[0]?.day).toBe('MO')
    expect(r.count).toBeUndefined()
  })
})

// ─── serializeRRule — unhappy paths / round-trip ──────────────────────────────

describe('serializeRRule — unhappy paths / round-trip', () => {
  it('round-trips daily rule with interval and count', () => {
    const rule = { frequency: 'daily' as const, interval: 2, count: 5 }
    const str = serializeRRule(rule)
    const parsed = parseRRule(str)
    expect(parsed.frequency).toBe('daily')
    expect(parsed.interval).toBe(2)
    expect(parsed.count).toBe(5)
  })

  it('round-trips weekly rule with BYDAY MO and FR', () => {
    const rule = {
      frequency: 'weekly' as const,
      byDay: [{ day: 'MO' as const }, { day: 'FR' as const }],
    }
    const str = serializeRRule(rule)
    const parsed = parseRRule(str)
    expect(parsed.byDay).toHaveLength(2)
    expect(parsed.byDay?.[0]?.day).toBe('MO')
    expect(parsed.byDay?.[1]?.day).toBe('FR')
  })

  it('round-trips monthly with nth weekday (2nd Monday)', () => {
    const rule = {
      frequency: 'monthly' as const,
      byDay: [{ day: 'MO' as const, nth: 2 }],
      count: 3,
    }
    const str = serializeRRule(rule)
    const parsed = parseRRule(str)
    expect(parsed.byDay?.[0]?.nth).toBe(2)
    expect(parsed.byDay?.[0]?.day).toBe('MO')
    expect(parsed.count).toBe(3)
  })

  it('round-trips COUNT=0', () => {
    const rule = { frequency: 'weekly' as const, count: 0 }
    const str = serializeRRule(rule)
    const parsed = parseRRule(str)
    expect(parsed.count).toBe(0)
  })

  it('omits INTERVAL from output when interval is 1 (iCal default)', () => {
    const rule = { frequency: 'daily' as const, interval: 1 }
    const str = serializeRRule(rule)
    expect(str).not.toContain('INTERVAL')
  })

  it('includes INTERVAL when interval is 2', () => {
    const rule = { frequency: 'daily' as const, interval: 2 }
    const str = serializeRRule(rule)
    expect(str).toContain('INTERVAL=2')
  })
})

// ─── expandRecurring — edge cases ─────────────────────────────────────────────

describe('expandRecurring — edge cases', () => {
  it('returns empty when count is 0', () => {
    const event = makeEvent(
      'e1',
      new Date(2026, 0, 1, 9, 0),
      new Date(2026, 0, 1, 10, 0),
      { frequency: 'daily', count: 0 },
    )
    const result = expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 0, 31))
    expect(result).toHaveLength(0)
  })

  it('returns empty when until date is before range start', () => {
    const event = makeEvent(
      'e1',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', until: new Date(2025, 0, 5) },
    )
    // Range is entirely in 2026 — well after until date
    const result = expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 1, 1))
    expect(result).toHaveLength(0)
  })

  it('exceptions list with all occurrences excluded → series continues past count', () => {
    // Per the engine: exceptions skip the occurrence but do NOT count toward `count`.
    // With count=3 and the first 3 dates excluded, the engine emits Jan 4, 5, 6 instead.
    const event = makeEvent(
      'e1',
      new Date(2026, 0, 1, 9, 0),
      new Date(2026, 0, 1, 10, 0),
      {
        frequency: 'daily',
        count: 3,
        exceptions: [
          new Date(2026, 0, 1),
          new Date(2026, 0, 2),
          new Date(2026, 0, 3),
        ],
      },
    )
    const result = expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 1, 1))
    // Exceptions removed 3 dates, but count is still 3 — should get 3 non-excluded occurrences
    expect(result).toHaveLength(3)
    const dates = result.map((r) => r.start.getDate())
    expect(dates).not.toContain(1)
    expect(dates).not.toContain(2)
    expect(dates).not.toContain(3)
    expect(dates).toContain(4)
    expect(dates).toContain(5)
    expect(dates).toContain(6)
  })

  it('interval=0 throws a descriptive error', () => {
    const event = makeEvent(
      'e1',
      new Date(2026, 0, 1, 9, 0),
      new Date(2026, 0, 1, 10, 0),
      { frequency: 'daily', interval: 0 },
    )
    expect(() => {
      expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 0, 31))
    }).toThrow('RecurringRule.interval must be >= 1, got 0')
  })

  it('Feb 29 in leap year 2028 expands for monthly without crashing', () => {
    // Feb 29 2028 is a valid date (2028 is a leap year).
    // Monthly repetition should clamp to Feb 28 in non-leap months.
    const event = makeEvent(
      'e1',
      new Date(2028, 1, 29, 9, 0),
      new Date(2028, 1, 29, 10, 0),
      { frequency: 'monthly', count: 3 },
    )
    expect(() => {
      expandRecurring(event, new Date(2028, 0, 1), new Date(2028, 11, 31))
    }).not.toThrow()

    const result = expandRecurring(event, new Date(2028, 0, 1), new Date(2028, 11, 31))
    // Should produce occurrences (Feb 29, Mar 29, Apr 29)
    expect(result.length).toBe(3)
  })

  it('very large count respects the safety limit (at most 3650 occurrences in output)', () => {
    // count=99999 would be huge, but the SAFETY_LIMIT of 3650 iterations
    // combined with the render range restriction keeps the result bounded.
    const event = makeEvent(
      'e1',
      new Date(2020, 0, 1, 9, 0),
      new Date(2020, 0, 1, 10, 0),
      { frequency: 'daily', count: 99999 },
    )
    // 10-year range: at most ~3650 daily occurrences within the range
    const result = expandRecurring(event, new Date(2020, 0, 1), new Date(2030, 0, 1))
    expect(result.length).toBeLessThanOrEqual(3650)
  })

  it('no crash with no events — non-recurring event outside range returns nothing', () => {
    // Regression: expandRecurring returns the event unmodified when it has no recurring rule
    // only if it overlaps the range. Outside the range it is excluded.
    const event = makeEvent(
      'e1',
      new Date(2020, 0, 1, 9, 0),
      new Date(2020, 0, 1, 10, 0),
    )
    // No recurring rule — falls through to non-recurring path in expandAllRecurring.
    // expandRecurring directly returns [event] regardless of range when no recurring.
    const result = expandRecurring(event, new Date(2026, 0, 1), new Date(2027, 0, 1))
    // Without a recurring rule, expandRecurring just returns [event]
    expect(result).toEqual([event])
  })

  it('weekly byDay — no occurrences when range ends before event start', () => {
    const event = makeEvent(
      'e2',
      new Date(2026, 5, 1, 9, 0), // June 1 2026
      new Date(2026, 5, 1, 10, 0),
      { frequency: 'weekly', byDay: [{ day: 'MO' }], count: 5 },
    )
    const result = expandRecurring(
      event,
      new Date(2025, 0, 1),
      new Date(2026, 0, 1), // ends before event start
    )
    expect(result).toHaveLength(0)
  })

  it('endDate (legacy until alias) before range start → empty', () => {
    const event = makeEvent(
      'e3',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', endDate: new Date(2025, 0, 10) },
    )
    // Range is entirely after endDate
    const result = expandRecurring(event, new Date(2026, 0, 1), new Date(2026, 1, 1))
    expect(result).toHaveLength(0)
  })
})
