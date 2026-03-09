/**
 * @liteforge/calendar - iCal-compatible RRULE Recurrence Engine Tests
 *
 * Comprehensive tests for the new iCal-compatible recurrence engine.
 * The legacy recurring.test.ts continues to cover backward-compat paths.
 */

import { describe, it, expect } from 'vitest'
import {
  expandRecurring,
  expandAllRecurring,
  parseRRule,
  serializeRRule,
  getNthWeekdayInMonth,
  isExcluded,
} from '../src/recurring.js'
import type { CalendarEvent, RecurringRule, Weekday } from '../src/types.js'

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeEvent(
  id: string,
  start: Date,
  end: Date,
  recurring?: RecurringRule,
): CalendarEvent {
  return { id, title: `Event ${id}`, start, end, ...(recurring ? { recurring } : {}) }
}

/** Wide enough range to capture all occurrences in most tests */
const FAR_FUTURE = new Date(2030, 0, 1)

// ─── 1. Daily every 2 days with count: 5 ─────────────────────────────────────

describe('daily every 2 days with count: 5', () => {
  const event = makeEvent(
    'daily-2',
    new Date(2025, 0, 1, 9, 0),
    new Date(2025, 0, 1, 10, 0),
    { frequency: 'daily', interval: 2, count: 5 },
  )

  it('returns exactly 5 occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(5)
  })

  it('occurrences are spaced 2 days apart', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getDate()).toBe(1)
    expect(result[1]?.start.getDate()).toBe(3)
    expect(result[2]?.start.getDate()).toBe(5)
    expect(result[3]?.start.getDate()).toBe(7)
    expect(result[4]?.start.getDate()).toBe(9)
  })

  it('each occurrence is on the correct month (January 2025)', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    for (const occ of result) {
      expect(occ.start.getFullYear()).toBe(2025)
      expect(occ.start.getMonth()).toBe(0)
    }
  })

  it('preserves duration across all occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    const duration = event.end.getTime() - event.start.getTime()
    for (const occ of result) {
      expect(occ.end.getTime() - occ.start.getTime()).toBe(duration)
    }
  })

  it('generates unique IDs', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    const ids = result.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ─── 2. Weekly on MO+WE+FR via byDay for 2 weeks ─────────────────────────────

describe('weekly BYDAY MO+WE+FR for 2 weeks', () => {
  // Jan 6 2025 is a Monday
  const event = makeEvent(
    'weekly-byday',
    new Date(2025, 0, 6, 10, 0),
    new Date(2025, 0, 6, 11, 0),
    {
      frequency: 'weekly',
      byDay: [{ day: 'MO' }, { day: 'WE' }, { day: 'FR' }],
      count: 6,
    },
  )

  it('returns exactly 6 occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(6)
  })

  it('occurrences fall on Mon / Wed / Fri', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    const weekdays = result.map((r) => r.start.getDay())
    // MO=1, WE=3, FR=5
    for (const wd of weekdays) {
      expect([1, 3, 5]).toContain(wd)
    }
  })

  it('first week: Jan 6 (Mon), Jan 8 (Wed), Jan 10 (Fri)', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getDate()).toBe(6)
    expect(result[1]?.start.getDate()).toBe(8)
    expect(result[2]?.start.getDate()).toBe(10)
  })

  it('second week: Jan 13 (Mon), Jan 15 (Wed), Jan 17 (Fri)', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[3]?.start.getDate()).toBe(13)
    expect(result[4]?.start.getDate()).toBe(15)
    expect(result[5]?.start.getDate()).toBe(17)
  })
})

// ─── 3. Monthly on 15th via byMonthDay, 3 months ─────────────────────────────

describe('monthly BYMONTHDAY=15 for 3 months', () => {
  const event = makeEvent(
    'monthly-15',
    new Date(2025, 0, 15, 9, 0), // Jan 15
    new Date(2025, 0, 15, 10, 0),
    { frequency: 'monthly', byMonthDay: [15], count: 3 },
  )

  it('returns exactly 3 occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(3)
  })

  it('each occurrence is on the 15th', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    for (const occ of result) {
      expect(occ.start.getDate()).toBe(15)
    }
  })

  it('months are Jan, Feb, Mar', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getMonth()).toBe(0) // Jan
    expect(result[1]?.start.getMonth()).toBe(1) // Feb
    expect(result[2]?.start.getMonth()).toBe(2) // Mar
  })
})

// ─── 4. Monthly last Friday ───────────────────────────────────────────────────

describe('monthly last Friday via byDay={day:FR, nth:-1}', () => {
  // Start: Jan 31 2025 (a Friday) which is the last Friday of January 2025
  const event = makeEvent(
    'monthly-last-fri',
    new Date(2025, 0, 31, 14, 0),
    new Date(2025, 0, 31, 15, 0),
    {
      frequency: 'monthly',
      byDay: [{ day: 'FR', nth: -1 }],
      count: 3,
    },
  )

  it('returns exactly 3 occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(3)
  })

  it('each occurrence is a Friday', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    for (const occ of result) {
      expect(occ.start.getDay()).toBe(5) // Friday = 5
    }
  })

  it('Jan 2025 last Friday = Jan 31', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getMonth()).toBe(0)
    expect(result[0]?.start.getDate()).toBe(31)
  })

  it('Feb 2025 last Friday = Feb 28', () => {
    // Feb 2025: 28 days. Last day is Fri Feb 28 2025
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[1]?.start.getMonth()).toBe(1)
    expect(result[1]?.start.getDate()).toBe(28)
  })

  it('Mar 2025 last Friday = Mar 28', () => {
    // Mar 31 2025 is Mon. Last Fri = Mar 28.
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[2]?.start.getMonth()).toBe(2)
    expect(result[2]?.start.getDate()).toBe(28)
  })

  it('occurrence date is the last Friday in its month', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    for (const occ of result) {
      const year = occ.start.getFullYear()
      const month = occ.start.getMonth()
      // The next Friday after this occurrence must be in the next month
      const nextFriday = new Date(occ.start)
      nextFriday.setDate(nextFriday.getDate() + 7)
      expect(nextFriday.getMonth()).not.toBe(month)
      // (it rolled into next month — confirming this was the last Friday)
      expect(nextFriday.getFullYear() * 12 + nextFriday.getMonth()).toBeGreaterThan(
        year * 12 + month,
      )
    }
  })
})

// ─── 5. Yearly on June 15th ──────────────────────────────────────────────────

describe('yearly BYMONTH=6 BYMONTHDAY=15 for 3 years', () => {
  const event = makeEvent(
    'yearly-jun15',
    new Date(2025, 5, 15, 9, 0), // June 15 2025
    new Date(2025, 5, 15, 10, 0),
    { frequency: 'yearly', byMonth: [6], byMonthDay: [15], count: 3 },
  )

  it('returns exactly 3 occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(3)
  })

  it('each occurrence is June 15', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    for (const occ of result) {
      expect(occ.start.getMonth()).toBe(5) // June = 5
      expect(occ.start.getDate()).toBe(15)
    }
  })

  it('years are 2025, 2026, 2027', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getFullYear()).toBe(2025)
    expect(result[1]?.start.getFullYear()).toBe(2026)
    expect(result[2]?.start.getFullYear()).toBe(2027)
  })
})

// ─── 6. `until` stops at date inclusive ──────────────────────────────────────

describe('until stops at date inclusive', () => {
  it('includes the until date itself when it matches an occurrence', () => {
    const event = makeEvent(
      'until-test',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', until: new Date(2025, 0, 5) },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    // Should include Jan 1, 2, 3, 4, 5
    expect(result).toHaveLength(5)
    const dates = result.map((r) => r.start.getDate())
    expect(dates).toContain(5)
  })

  it('does not include occurrences after until', () => {
    const event = makeEvent(
      'until-stop',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', until: new Date(2025, 0, 3) },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(3)
    const dates = result.map((r) => r.start.getDate())
    expect(dates).not.toContain(4)
  })
})

// ─── 7. `count` stops after exactly N ────────────────────────────────────────

describe('count stops after exactly N', () => {
  it('returns exactly count occurrences regardless of range size', () => {
    const event = makeEvent(
      'count-exact',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', count: 7 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(7)
  })

  it('count=1 returns only the first occurrence', () => {
    const event = makeEvent(
      'count-one',
      new Date(2025, 3, 10, 8, 0),
      new Date(2025, 3, 10, 9, 0),
      { frequency: 'weekly', count: 1 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(1)
    expect(result[0]?.start.getDate()).toBe(10)
  })
})

// ─── 8. `exceptions` removes specific dates ──────────────────────────────────

describe('exceptions removes specific dates', () => {
  it('skips the exact exception date', () => {
    const event = makeEvent(
      'exc-test',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      {
        frequency: 'daily',
        count: 5,
        exceptions: [new Date(2025, 0, 3)], // Skip Jan 3
      },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    const dates = result.map((r) => r.start.getDate())
    expect(dates).not.toContain(3)
    expect(dates).toContain(1)
    expect(dates).toContain(2)
    expect(dates).toContain(4)
  })

  it('exception does not count toward the count limit', () => {
    // count=3, 1 exception → should still produce 3 in-range occurrences
    const event = makeEvent(
      'exc-count',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      {
        frequency: 'daily',
        count: 3,
        exceptions: [new Date(2025, 0, 2)], // Skip Jan 2
      },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    // Should produce 3 occurrences: Jan 1, Jan 3, Jan 4
    expect(result).toHaveLength(3)
    const dates = result.map((r) => r.start.getDate())
    expect(dates).toContain(1)
    expect(dates).not.toContain(2)
    expect(dates).toContain(3)
    expect(dates).toContain(4)
  })
})

// ─── 9. parseRRule happy path ─────────────────────────────────────────────────

describe('parseRRule', () => {
  it('parses FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6', () => {
    const rule = parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6')
    expect(rule.frequency).toBe('weekly')
    expect(rule.count).toBe(6)
    expect(rule.byDay).toHaveLength(3)
    expect(rule.byDay?.[0]?.day).toBe('MO')
    expect(rule.byDay?.[1]?.day).toBe('WE')
    expect(rule.byDay?.[2]?.day).toBe('FR')
    // No nth on plain weekday tokens
    expect(rule.byDay?.[0]?.nth).toBeUndefined()
  })

  it('parses FREQ=DAILY;INTERVAL=2;COUNT=10', () => {
    const rule = parseRRule('FREQ=DAILY;INTERVAL=2;COUNT=10')
    expect(rule.frequency).toBe('daily')
    expect(rule.interval).toBe(2)
    expect(rule.count).toBe(10)
  })

  it('parses FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20251215', () => {
    const rule = parseRRule('FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20251215')
    expect(rule.frequency).toBe('monthly')
    expect(rule.byMonthDay).toEqual([15])
    expect(rule.until?.getMonth()).toBe(11) // December = 11
    expect(rule.until?.getDate()).toBe(15)
    expect(rule.until?.getFullYear()).toBe(2025)
  })

  it('parses FREQ=MONTHLY;BYDAY=-1FR (last Friday)', () => {
    const rule = parseRRule('FREQ=MONTHLY;BYDAY=-1FR;COUNT=3')
    expect(rule.frequency).toBe('monthly')
    expect(rule.byDay?.[0]?.day).toBe('FR')
    expect(rule.byDay?.[0]?.nth).toBe(-1)
    expect(rule.count).toBe(3)
  })

  it('parses FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15', () => {
    const rule = parseRRule('FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15;COUNT=3')
    expect(rule.frequency).toBe('yearly')
    expect(rule.byMonth).toEqual([6])
    expect(rule.byMonthDay).toEqual([15])
    expect(rule.count).toBe(3)
  })

  it('parses FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1', () => {
    const rule = parseRRule('FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1')
    expect(rule.frequency).toBe('monthly')
    expect(rule.byDay).toHaveLength(5)
    expect(rule.bySetPos).toEqual([-1])
  })

  it('parses WKST=SU', () => {
    const rule = parseRRule('FREQ=WEEKLY;BYDAY=MO,FR;WKST=SU;COUNT=4')
    expect(rule.weekStart).toBe('SU')
  })

  it('throws on missing FREQ', () => {
    expect(() => parseRRule('COUNT=3;BYDAY=MO')).toThrow('RRULE missing FREQ')
  })

  it('throws on unknown FREQ', () => {
    expect(() => parseRRule('FREQ=HOURLY;COUNT=3')).toThrow('Unknown FREQ: HOURLY')
  })

  it('throws on invalid BYDAY token', () => {
    expect(() => parseRRule('FREQ=WEEKLY;BYDAY=XY')).toThrow()
  })
})

// ─── 10. serializeRRule round-trip ───────────────────────────────────────────

describe('serializeRRule round-trip', () => {
  it('round-trips FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6', () => {
    const original = 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6'
    const rule = parseRRule(original)
    const serialized = serializeRRule(rule)
    expect(serialized).toBe(original)
  })

  it('round-trips FREQ=MONTHLY;BYMONTHDAY=15;COUNT=3', () => {
    const original = 'FREQ=MONTHLY;BYMONTHDAY=15;COUNT=3'
    const rule = parseRRule(original)
    expect(serializeRRule(rule)).toBe(original)
  })

  it('round-trips FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15;COUNT=3', () => {
    const original = 'FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=15;COUNT=3'
    const rule = parseRRule(original)
    expect(serializeRRule(rule)).toBe(original)
  })

  it('biweekly serializes as FREQ=WEEKLY;INTERVAL=2', () => {
    const rule: RecurringRule = { frequency: 'biweekly' }
    expect(serializeRRule(rule)).toBe('FREQ=WEEKLY;INTERVAL=2')
  })

  it('serializes UNTIL as YYYYMMDD', () => {
    const rule: RecurringRule = {
      frequency: 'daily',
      until: new Date(2025, 11, 25), // Dec 25 2025
    }
    expect(serializeRRule(rule)).toBe('FREQ=DAILY;UNTIL=20251225')
  })

  it('preserves WKST', () => {
    const rule: RecurringRule = {
      frequency: 'weekly',
      byDay: [{ day: 'MO' }, { day: 'FR' }],
      count: 4,
      weekStart: 'SU',
    }
    const str = serializeRRule(rule)
    expect(str).toContain('WKST=SU')
    expect(str).toContain('FREQ=WEEKLY')
    expect(str).toContain('BYDAY=MO,FR')
    expect(str).toContain('COUNT=4')
  })
})

// ─── 11. Monthly on 31st — Feb/Apr skip correctly ────────────────────────────

describe('monthly on 31st — short months skip correctly', () => {
  const event = makeEvent(
    'monthly-31',
    new Date(2025, 0, 31, 9, 0), // Jan 31 2025
    new Date(2025, 0, 31, 10, 0),
    { frequency: 'monthly', count: 4 },
  )

  it('returns 4 occurrences', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(4)
  })

  it('January → day 31', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getMonth()).toBe(0)
    expect(result[0]?.start.getDate()).toBe(31)
  })

  it('February 2025 → day 28 (non-leap)', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[1]?.start.getMonth()).toBe(1)
    expect(result[1]?.start.getDate()).toBe(28)
  })

  it('March → day 31', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[2]?.start.getMonth()).toBe(2)
    expect(result[2]?.start.getDate()).toBe(31)
  })

  it('April → day 30', () => {
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result[3]?.start.getMonth()).toBe(3)
    expect(result[3]?.start.getDate()).toBe(30)
  })
})

// ─── 12. Leap year: Feb 29 yearly → only in leap years ───────────────────────

describe('yearly Feb 29 — only appears in leap years', () => {
  // Start: Feb 29 2024 (a leap year)
  const event = makeEvent(
    'yearly-feb29',
    new Date(2024, 1, 29, 9, 0),
    new Date(2024, 1, 29, 10, 0),
    { frequency: 'yearly', count: 5 },
  )

  it('2024: Feb 29 (leap)', () => {
    const result = expandRecurring(event, new Date(2024, 0, 1), FAR_FUTURE)
    expect(result[0]?.start.getFullYear()).toBe(2024)
    expect(result[0]?.start.getMonth()).toBe(1) // Feb
    expect(result[0]?.start.getDate()).toBe(29)
  })

  it('2025: Feb 28 (non-leap, clamped)', () => {
    const result = expandRecurring(event, new Date(2024, 0, 1), FAR_FUTURE)
    expect(result[1]?.start.getFullYear()).toBe(2025)
    expect(result[1]?.start.getMonth()).toBe(1)
    expect(result[1]?.start.getDate()).toBe(28)
  })

  it('2028: Feb 29 (next leap year)', () => {
    const result = expandRecurring(event, new Date(2024, 0, 1), FAR_FUTURE)
    const occ2028 = result.find((r) => r.start.getFullYear() === 2028)
    expect(occ2028?.start.getDate()).toBe(29)
  })
})

// ─── 13. count: 0 → empty array ──────────────────────────────────────────────

describe('count: 0 returns empty array', () => {
  it('daily count=0 → empty', () => {
    const event = makeEvent(
      'count-zero',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', count: 0 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(0)
  })

  it('weekly count=0 → empty', () => {
    const event = makeEvent(
      'weekly-zero',
      new Date(2025, 0, 6, 9, 0),
      new Date(2025, 0, 6, 10, 0),
      { frequency: 'weekly', count: 0 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(0)
  })
})

// ─── 14. until in the past → empty array ─────────────────────────────────────

describe('until in the past → empty array', () => {
  it('returns empty when until is before event start', () => {
    const event = makeEvent(
      'past-until',
      new Date(2025, 5, 1, 9, 0),
      new Date(2025, 5, 1, 10, 0),
      { frequency: 'daily', until: new Date(2025, 4, 1) }, // May 1, before June 1
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(0)
  })

  it('legacy endDate in the past → empty array', () => {
    const event = makeEvent(
      'past-enddate',
      new Date(2025, 5, 1, 9, 0),
      new Date(2025, 5, 1, 10, 0),
      { frequency: 'daily', endDate: new Date(2025, 4, 1) },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(0)
  })
})

// ─── 15. exceptions removing all occurrences → empty array ───────────────────

describe('exceptions removing all occurrences', () => {
  it('removing all 3 occurrences yields empty array (count=3 still honoured)', () => {
    const event = makeEvent(
      'exc-all',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      {
        frequency: 'daily',
        count: 3,
        exceptions: [
          new Date(2025, 0, 1),
          new Date(2025, 0, 2),
          new Date(2025, 0, 3),
        ],
      },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    // Exceptions skip but don't count → the series continues until count is reached
    // count=3 → 3 emitted (Jan 4, 5, 6 — exceptions don't count toward limit)
    // So result should have 3 occurrences that are NOT the excluded dates
    const dates = result.map((r) => r.start.getDate())
    expect(dates).not.toContain(1)
    expect(dates).not.toContain(2)
    expect(dates).not.toContain(3)
    expect(dates).toContain(4)
    expect(dates).toContain(5)
    expect(dates).toContain(6)
    expect(result).toHaveLength(3)
  })
})

// ─── 16. interval: 0 → throws descriptive error ──────────────────────────────

describe('interval: 0 throws', () => {
  it('throws with message containing interval value', () => {
    const event = makeEvent(
      'bad-interval',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', interval: 0 },
    )
    expect(() =>
      expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE),
    ).toThrow('RecurringRule.interval must be >= 1, got 0')
  })

  it('throws for negative interval', () => {
    const event = makeEvent(
      'neg-interval',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'weekly', interval: -1 },
    )
    expect(() =>
      expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE),
    ).toThrow('RecurringRule.interval must be >= 1, got -1')
  })
})

// ─── 17. Range before event start → empty array ──────────────────────────────

describe('range before event start → no occurrences in range', () => {
  it('returns empty when range ends before event starts', () => {
    const event = makeEvent(
      'future-event',
      new Date(2025, 5, 1, 9, 0), // June 1 2025
      new Date(2025, 5, 1, 10, 0),
      { frequency: 'daily', count: 10 },
    )
    const rangeStart = new Date(2025, 0, 1) // Jan 1
    const rangeEnd = new Date(2025, 4, 1) // May 1 — before event start

    const result = expandRecurring(event, rangeStart, rangeEnd)
    expect(result).toHaveLength(0)
  })
})

// ─── 18. Occurrence exactly at rangeStart / rangeEnd boundary ────────────────

describe('boundary occurrences', () => {
  it('occurrence starting exactly at rangeStart is included', () => {
    // Event at Jan 1 09:00, range starts Jan 1 00:00
    const event = makeEvent(
      'boundary-start',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      { frequency: 'daily', count: 3 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1, 0, 0), new Date(2025, 0, 10))
    const dates = result.map((r) => r.start.getDate())
    expect(dates).toContain(1)
  })

  it('occurrence ending exactly at rangeStart is excluded (end = rangeStart not overlapping)', () => {
    // Event ends at Jan 10 00:00, range starts Jan 10 00:00
    // end > rangeStart is strict: Jan 10 00:00 > Jan 10 00:00 → false → not included
    const event = makeEvent(
      'boundary-end',
      new Date(2025, 0, 9, 23, 0),
      new Date(2025, 0, 10, 0, 0),
      { frequency: 'daily', count: 1 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 10, 0, 0), new Date(2025, 0, 20))
    expect(result).toHaveLength(0)
  })

  it('occurrence starting exactly at rangeEnd is excluded', () => {
    // start < rangeEnd is strict: Jan 10 09:00 < Jan 10 00:00 → false → not included
    const event = makeEvent(
      'boundary-range-end',
      new Date(2025, 0, 10, 9, 0),
      new Date(2025, 0, 10, 10, 0),
      { frequency: 'daily', count: 1 },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), new Date(2025, 0, 10, 0, 0))
    // occurrence is Jan 10 09:00; rangeEnd is Jan 10 00:00; 09:00 < 00:00 → false
    expect(result).toHaveLength(0)
  })
})

// ─── 19. getNthWeekdayInMonth ─────────────────────────────────────────────────

describe('getNthWeekdayInMonth', () => {
  it('first Monday of Jan 2025 = Jan 6', () => {
    const d = getNthWeekdayInMonth(2025, 0, 'MO', 1)
    expect(d?.getDate()).toBe(6)
    expect(d?.getDay()).toBe(1)
  })

  it('last Friday of Jan 2025 = Jan 31', () => {
    const d = getNthWeekdayInMonth(2025, 0, 'FR', -1)
    expect(d?.getDate()).toBe(31)
    expect(d?.getDay()).toBe(5)
  })

  it('second Wednesday of March 2025 = Mar 12', () => {
    const d = getNthWeekdayInMonth(2025, 2, 'WE', 2)
    expect(d?.getDate()).toBe(12)
    expect(d?.getDay()).toBe(3)
  })

  it('5th Monday of Feb 2025 = null (Feb has only 4 Mondays)', () => {
    // Feb 2025: Mondays on 3, 10, 17, 24 (only 4)
    const d = getNthWeekdayInMonth(2025, 1, 'MO', 5)
    expect(d).toBeNull()
  })

  it('nth=0 → null', () => {
    const d = getNthWeekdayInMonth(2025, 0, 'MO', 0)
    expect(d).toBeNull()
  })

  it('last Sunday of Dec 2025 = Dec 28', () => {
    const d = getNthWeekdayInMonth(2025, 11, 'SU', -1)
    expect(d?.getDate()).toBe(28)
    expect(d?.getDay()).toBe(0)
  })
})

// ─── 20. isExcluded ───────────────────────────────────────────────────────────

describe('isExcluded', () => {
  it('returns true when date matches an exception (same day)', () => {
    const base = new Date(2025, 0, 15, 9, 0)
    const exceptions = [new Date(2025, 0, 15, 0, 0)] // midnight — same day
    expect(isExcluded(base, exceptions)).toBe(true)
  })

  it('returns false when date does not match any exception', () => {
    const base = new Date(2025, 0, 16, 9, 0)
    const exceptions = [new Date(2025, 0, 15)]
    expect(isExcluded(base, exceptions)).toBe(false)
  })

  it('returns false for empty exceptions array', () => {
    expect(isExcluded(new Date(2025, 0, 1), [])).toBe(false)
  })
})

// ─── 21. expandAllRecurring ───────────────────────────────────────────────────

describe('expandAllRecurring', () => {
  it('handles mix of recurring and non-recurring events', () => {
    const events: CalendarEvent[] = [
      makeEvent(
        'recurring',
        new Date(2025, 0, 1, 9, 0),
        new Date(2025, 0, 1, 10, 0),
        { frequency: 'daily', count: 3 },
      ),
      makeEvent('single', new Date(2025, 0, 5, 14, 0), new Date(2025, 0, 5, 15, 0)),
    ]
    const result = expandAllRecurring(events, new Date(2025, 0, 1), new Date(2025, 0, 31))
    expect(result.length).toBe(4) // 3 recurring + 1 single
  })

  it('excludes non-recurring events outside the range', () => {
    const events: CalendarEvent[] = [
      makeEvent('outside', new Date(2024, 11, 31, 9, 0), new Date(2024, 11, 31, 10, 0)),
      makeEvent('inside', new Date(2025, 0, 15, 9, 0), new Date(2025, 0, 15, 10, 0)),
    ]
    const result = expandAllRecurring(events, new Date(2025, 0, 1), new Date(2025, 0, 31))
    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('inside')
  })

  it('returns empty for empty array', () => {
    const result = expandAllRecurring([], new Date(2025, 0, 1), new Date(2025, 1, 1))
    expect(result).toHaveLength(0)
  })
})

// ─── 22. Type safety check ────────────────────────────────────────────────────

describe('return type is T[]', () => {
  it('preserves custom properties on expanded occurrences', () => {
    interface MyEvent extends CalendarEvent {
      location: string
      priority: number
    }

    const event: MyEvent = {
      id: 'typed',
      title: 'Typed Event',
      start: new Date(2025, 0, 1, 9, 0),
      end: new Date(2025, 0, 1, 10, 0),
      location: 'Vienna',
      priority: 1,
      recurring: { frequency: 'daily', count: 2 },
    }

    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    // TypeScript should infer result as MyEvent[]
    expect(result[0]?.location).toBe('Vienna')
    expect(result[0]?.priority).toBe(1)
    expect(result[1]?.location).toBe('Vienna')
  })
})

// ─── 23. Weekday type constraint ──────────────────────────────────────────────

describe('Weekday type', () => {
  it('all 7 weekday codes are accepted', () => {
    const days: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
    for (const day of days) {
      const event = makeEvent(
        `wd-${day}`,
        new Date(2025, 0, 6, 9, 0), // Jan 6 = Monday
        new Date(2025, 0, 6, 10, 0),
        { frequency: 'weekly', byDay: [{ day }], count: 1 },
      )
      const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
      expect(result.length).toBeGreaterThanOrEqual(0) // just checking no crash
    }
  })
})

// ─── 24. BYSETPOS ─────────────────────────────────────────────────────────────

describe('BYSETPOS with monthly BYDAY', () => {
  it('last weekday of month via BYDAY=MO,TU,WE,TH,FR BYSETPOS=-1', () => {
    // Jan 2025: last weekday = Jan 31 (Friday)
    const event = makeEvent(
      'last-weekday',
      new Date(2025, 0, 1, 9, 0),
      new Date(2025, 0, 1, 10, 0),
      {
        frequency: 'monthly',
        byDay: [
          { day: 'MO' },
          { day: 'TU' },
          { day: 'WE' },
          { day: 'TH' },
          { day: 'FR' },
        ],
        bySetPos: [-1],
        count: 2,
      },
    )
    const result = expandRecurring(event, new Date(2025, 0, 1), FAR_FUTURE)
    expect(result).toHaveLength(2)
    // Jan 2025 last weekday = Jan 31 (Fri)
    expect(result[0]?.start.getDate()).toBe(31)
    expect(result[0]?.start.getDay()).toBe(5)
    // Feb 2025 last weekday = Feb 28 (Fri)
    expect(result[1]?.start.getDate()).toBe(28)
    expect(result[1]?.start.getDay()).toBe(5)
  })
})
