/**
 * @liteforge/calendar - Recurring Event Expansion (iCal-compatible)
 *
 * Expands recurring events into individual occurrences within a date range.
 * Supports DAILY, WEEKLY (with BYDAY), MONTHLY (with BYDAY/BYMONTHDAY/BYSETPOS),
 * YEARLY (with BYMONTH/BYMONTHDAY/BYDAY), and the legacy BIWEEKLY frequency.
 */

import type { CalendarEvent, RecurringRule, Weekday, WeekdayRule } from './types.js'
import { addDays, addWeeks, isSameDay, isBefore, startOfDay } from './date-utils.js'

// ─── Weekday helpers ──────────────────────────────────────────────────────────

const WEEKDAY_JS: Record<Weekday, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Get the nth occurrence of a weekday in a month.
 * nth: +1=first, -1=last, +2=second, -2=second-to-last, etc.
 * Returns null if the nth occurrence does not exist in the month.
 */
export function getNthWeekdayInMonth(
  year: number,
  month: number,
  day: Weekday,
  nth: number,
): Date | null {
  if (nth === 0) return null
  const targetJs = WEEKDAY_JS[day]
  const total = daysInMonth(year, month)

  if (nth > 0) {
    const first = new Date(year, month, 1)
    const diff = (targetJs - first.getDay() + 7) % 7
    const date = 1 + diff + (nth - 1) * 7
    if (date > total) return null
    return new Date(year, month, date)
  } else {
    // nth < 0: count from end of month
    const last = new Date(year, month, total)
    const diff = (last.getDay() - targetJs + 7) % 7
    const date = total - diff + (nth + 1) * 7
    if (date < 1) return null
    return new Date(year, month, date)
  }
}

/**
 * Check if a date is excluded by the exceptions list (date-only comparison).
 */
export function isExcluded(date: Date, exceptions: Date[]): boolean {
  return exceptions.some((ex) => isSameDay(date, ex))
}

// ─── byDay expansion helpers ──────────────────────────────────────────────────

/**
 * Expand BYDAY rules for a given month → sorted list of plain Dates (midnight).
 */
function expandByDayInMonth(
  year: number,
  month: number,
  byDay: WeekdayRule[],
): Date[] {
  const results: Date[] = []
  for (const rule of byDay) {
    if (rule.nth !== undefined) {
      const d = getNthWeekdayInMonth(year, month, rule.day, rule.nth)
      if (d !== null) results.push(d)
    } else {
      // Every occurrence of this weekday in the month
      const total = daysInMonth(year, month)
      const targetJs = WEEKDAY_JS[rule.day]
      for (let d = 1; d <= total; d++) {
        if (new Date(year, month, d).getDay() === targetJs) {
          results.push(new Date(year, month, d))
        }
      }
    }
  }
  results.sort((a, b) => a.getTime() - b.getTime())
  return results
}

/**
 * Expand BYDAY rules for a given ISO week → sorted list of plain Dates (midnight).
 * weekStart is the Monday (or configured week-start day) of that week.
 * nth is ignored for weekly frequency per iCal spec.
 */
function expandByDayInWeek(weekStart: Date, byDay: WeekdayRule[]): Date[] {
  const results: Date[] = []
  for (const rule of byDay) {
    const targetJs = WEEKDAY_JS[rule.day]
    const diff = (targetJs - weekStart.getDay() + 7) % 7
    results.push(addDays(weekStart, diff))
  }
  results.sort((a, b) => a.getTime() - b.getTime())
  return results
}

// ─── Occurrence date builder ──────────────────────────────────────────────────

/**
 * Build an occurrence Date from a base date (midnight) + time-of-day from eventStart.
 */
function occurrenceDate(base: Date, eventStart: Date): Date {
  const d = new Date(base)
  d.setHours(
    eventStart.getHours(),
    eventStart.getMinutes(),
    eventStart.getSeconds(),
    eventStart.getMilliseconds(),
  )
  return d
}

// ─── bySetPos helper ──────────────────────────────────────────────────────────

/**
 * Filter a sorted Date array by BYSETPOS (1-based; negative counts from end).
 */
function applyBySetPos(dates: Date[], bySetPos: number[]): Date[] {
  const len = dates.length
  const result: Date[] = []
  for (const pos of bySetPos) {
    const idx = pos > 0 ? pos - 1 : len + pos
    const d = dates[idx]
    if (d !== undefined) result.push(d)
  }
  result.sort((a, b) => a.getTime() - b.getTime())
  return result
}

// ─── Main expansion ───────────────────────────────────────────────────────────

/** Safety cap: at most ~10 years of daily occurrences */
const SAFETY_LIMIT = 3650

/**
 * Expand a recurring event into individual occurrences within rangeStart..rangeEnd.
 *
 * Rules:
 * - count=0 → empty array (zero occurrences requested)
 * - until/endDate in the past → empty array
 * - exceptions → occurrence is skipped but does NOT count toward `count`
 * - Only occurrences overlapping [rangeStart, rangeEnd) are returned, but
 *   the full series is walked to honour `count` correctly
 */
export function expandRecurring<T extends CalendarEvent>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  const rule = event.recurring
  if (!rule) return [event]

  // Validate interval
  const interval = rule.interval ?? 1
  if (interval <= 0) {
    throw new Error(`RecurringRule.interval must be >= 1, got ${interval}`)
  }

  // Explicit count=0 means zero occurrences
  if (rule.count === 0) return []

  // Resolve end condition: support both `until` (new) and `endDate` (legacy)
  const untilDate: Date | null = rule.until ?? rule.endDate ?? null
  // maxCount: 0 means unlimited (count was undefined)
  const maxCount = rule.count ?? 0

  const exceptions = rule.exceptions ?? []
  const duration = event.end.getTime() - event.start.getTime()
  const occurrences: T[] = []

  /**
   * totalEmitted counts every occurrence that passes the end-condition check
   * (including excluded ones). Exceptions do NOT reduce the available slots —
   * they are removed but the series continues.
   */
  let totalEmitted = 0

  /**
   * Try to push a base date as an occurrence.
   * Returns false when the series should stop (count reached or until exceeded).
   * Returns true when iteration should continue.
   */
  function tryPush(base: Date): boolean {
    if (maxCount > 0 && totalEmitted >= maxCount) return false
    if (untilDate !== null && isBefore(untilDate, startOfDay(base))) return false

    // Excluded dates: skip the occurrence but continue the series
    if (isExcluded(base, exceptions)) {
      return true
    }

    totalEmitted++
    if (maxCount > 0 && totalEmitted > maxCount) return false

    const start = occurrenceDate(base, event.start)
    const end = new Date(start.getTime() + duration)

    // Only push if it overlaps the render range
    if (end > rangeStart && start < rangeEnd) {
      const id = `${event.id}::${start.toISOString()}`
      occurrences.push({ ...event, id, start, end })
    }
    return true
  }

  /** Should we keep iterating (before doing work for a new cursor position)? */
  function shouldContinue(cursor: Date): boolean {
    if (maxCount > 0 && totalEmitted >= maxCount) return false
    if (untilDate !== null && isBefore(untilDate, startOfDay(cursor))) return false
    return true
  }

  const freq = rule.frequency

  // ── DAILY ──────────────────────────────────────────────────────────────────
  if (freq === 'daily') {
    let cursor = startOfDay(event.start)
    let safety = 0
    while (safety++ < SAFETY_LIMIT && shouldContinue(cursor)) {
      tryPush(cursor)
      cursor = addDays(cursor, interval)
      if (cursor >= rangeEnd && (untilDate === null || cursor > untilDate)) break
    }
    return occurrences
  }

  // ── BIWEEKLY (legacy) ─────────────────────────────────────────────────────
  if (freq === 'biweekly') {
    let cursor = startOfDay(event.start)
    let safety = 0
    while (safety++ < SAFETY_LIMIT && shouldContinue(cursor)) {
      tryPush(cursor)
      cursor = addWeeks(cursor, 2 * interval)
      if (cursor >= rangeEnd && (untilDate === null || cursor > untilDate)) break
    }
    return occurrences
  }

  // ── WEEKLY ─────────────────────────────────────────────────────────────────
  if (freq === 'weekly') {
    const legacyDays = rule.daysOfWeek
    const byDay = rule.byDay

    if (!legacyDays && !byDay) {
      // Simple weekly — just the start weekday
      let cursor = startOfDay(event.start)
      let safety = 0
      while (safety++ < SAFETY_LIMIT && shouldContinue(cursor)) {
        tryPush(cursor)
        cursor = addWeeks(cursor, interval)
        if (cursor >= rangeEnd && (untilDate === null || cursor > untilDate)) break
      }
      return occurrences
    }

    if (legacyDays) {
      // Legacy daysOfWeek path — align to the Sunday-start week containing event.start
      const eventStartDay = startOfDay(event.start)
      let weekStart = new Date(eventStartDay)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()) // go to Sunday
      let safety = 0
      while (safety++ < SAFETY_LIMIT && shouldContinue(weekStart)) {
        for (let i = 0; i < 7; i++) {
          const day = addDays(weekStart, i)
          if (legacyDays.includes(day.getDay())) {
            if (!isBefore(day, eventStartDay)) {
              if (!tryPush(day)) return occurrences
            }
          }
        }
        weekStart = addWeeks(weekStart, interval)
        if (weekStart >= rangeEnd && (untilDate === null || weekStart > untilDate)) break
      }
      return occurrences
    }

    if (byDay) {
      // New BYDAY weekly — align to the configured week-start containing event.start
      const weekStartDayJs = rule.weekStart ? WEEKDAY_JS[rule.weekStart] : 1 // default Mon
      const eventStartDay = startOfDay(event.start)
      let wStart = new Date(eventStartDay)
      const diff = (wStart.getDay() - weekStartDayJs + 7) % 7
      wStart = addDays(wStart, -diff)

      let safety = 0
      while (safety++ < SAFETY_LIMIT && shouldContinue(wStart)) {
        const days = expandByDayInWeek(wStart, byDay)
        for (const d of days) {
          if (!isBefore(d, eventStartDay)) {
            if (!tryPush(d)) return occurrences
          }
        }
        wStart = addWeeks(wStart, interval)
        if (wStart >= rangeEnd && (untilDate === null || wStart > untilDate)) break
      }
      return occurrences
    }

    return occurrences
  }

  // ── MONTHLY ────────────────────────────────────────────────────────────────
  if (freq === 'monthly') {
    let year = event.start.getFullYear()
    let month = event.start.getMonth()
    const eventStartDay = startOfDay(event.start)
    let safety = 0

    while (safety++ < SAFETY_LIMIT) {
      const cursor = new Date(year, month, 1)
      if (!shouldContinue(cursor)) break

      if (rule.byDay && rule.byDay.length > 0) {
        let days = expandByDayInMonth(year, month, rule.byDay)

        if (rule.bySetPos && rule.bySetPos.length > 0) {
          days = applyBySetPos(days, rule.bySetPos)
        }

        for (const d of days) {
          if (!isBefore(d, eventStartDay)) {
            if (!tryPush(d)) return occurrences
          }
        }
      } else if (rule.byMonthDay && rule.byMonthDay.length > 0) {
        const total = daysInMonth(year, month)
        let days: Date[] = []
        for (const dom of rule.byMonthDay) {
          const actual = dom < 0 ? total + dom + 1 : dom
          if (actual >= 1 && actual <= total) {
            days.push(new Date(year, month, actual))
          }
        }
        days.sort((a, b) => a.getTime() - b.getTime())

        if (rule.bySetPos && rule.bySetPos.length > 0) {
          days = applyBySetPos(days, rule.bySetPos)
        }

        for (const d of days) {
          if (!isBefore(d, eventStartDay)) {
            if (!tryPush(d)) return occurrences
          }
        }
      } else {
        // Simple monthly — same day of month, clamped to month end
        const targetDay = event.start.getDate()
        const total = daysInMonth(year, month)
        const actual = Math.min(targetDay, total)
        const d = new Date(year, month, actual)
        if (!isBefore(d, eventStartDay)) {
          if (!tryPush(d)) break
        }
      }

      // Advance by interval months
      month += interval
      while (month >= 12) {
        month -= 12
        year++
      }

      const nextCursor = new Date(year, month, 1)
      if (nextCursor >= rangeEnd && (untilDate === null || nextCursor > untilDate)) break
    }
    return occurrences
  }

  // ── YEARLY ─────────────────────────────────────────────────────────────────
  if (freq === 'yearly') {
    // Track year as integer to avoid addYears leap-day overflow (Feb 29 → Mar 1)
    let year = event.start.getFullYear()
    const baseMonth = event.start.getMonth()  // fixed month from event start
    const eventStartDay = startOfDay(event.start)
    let safety = 0

    while (safety++ < 400) {
      // Build a representative cursor date for shouldContinue checks
      const cursor = new Date(year, baseMonth, 1)
      if (!shouldContinue(cursor)) break

      if (rule.byMonth && rule.byMonth.length > 0) {
        // Iterate over specified months (sorted by calendar order)
        for (const m of rule.byMonth) {
          const targetMonth = m - 1 // 1-based → 0-based

          if (rule.byMonthDay && rule.byMonthDay.length > 0) {
            const total = daysInMonth(year, targetMonth)
            for (const dom of rule.byMonthDay) {
              if (dom >= 1 && dom <= total) {
                const d = new Date(year, targetMonth, dom)
                if (!isBefore(d, eventStartDay)) {
                  if (!tryPush(d)) return occurrences
                }
              }
            }
          } else if (rule.byDay && rule.byDay.length > 0) {
            const days = expandByDayInMonth(year, targetMonth, rule.byDay)
            for (const d of days) {
              if (!isBefore(d, eventStartDay)) {
                if (!tryPush(d)) return occurrences
              }
            }
          } else {
            const total = daysInMonth(year, targetMonth)
            const actual = Math.min(event.start.getDate(), total)
            const d = new Date(year, targetMonth, actual)
            if (!isBefore(d, eventStartDay)) {
              if (!tryPush(d)) return occurrences
            }
          }
        }
      } else {
        // Simple yearly — same month+day from event.start, clamped to month end
        const total = daysInMonth(year, baseMonth)
        const actual = Math.min(event.start.getDate(), total)
        const d = new Date(year, baseMonth, actual)
        if (!isBefore(d, eventStartDay)) {
          if (!tryPush(d)) break
        }
      }

      year += interval
      const nextCursor = new Date(year, baseMonth, 1)
      if (nextCursor >= rangeEnd && (untilDate === null || nextCursor > untilDate)) break
    }
    return occurrences
  }

  return occurrences
}

/**
 * Expand all recurring events in an array within the given date range.
 * Non-recurring events are included only if they overlap the range.
 */
export function expandAllRecurring<T extends CalendarEvent>(
  events: T[],
  rangeStart: Date,
  rangeEnd: Date,
): T[] {
  const result: T[] = []
  for (const event of events) {
    if (event.recurring) {
      result.push(...expandRecurring(event, rangeStart, rangeEnd))
    } else {
      if (event.end > rangeStart && event.start < rangeEnd) {
        result.push(event)
      }
    }
  }
  return result
}

// ─── iCal RRULE parse / serialize ─────────────────────────────────────────────

const FREQ_MAP: Record<string, RecurringRule['frequency']> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}

const FREQ_IMAP: Record<string, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
  biweekly: 'WEEKLY',
}

const WEEKDAY_NAMES: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

function isWeekday(s: string): s is Weekday {
  return WEEKDAY_NAMES.some((w) => w === s)
}

function parseWeekdayToken(token: string): WeekdayRule {
  // Optional nth prefix: -1FR, +2MO, 2MO, MO
  const match = /^([+-]?\d+)?([A-Z]{2})$/.exec(token)
  if (!match) throw new Error(`Invalid BYDAY token: ${token}`)
  const nthStr = match[1]
  const dayStr = match[2]
  if (dayStr === undefined) throw new Error(`Invalid BYDAY token: ${token}`)
  if (!isWeekday(dayStr)) throw new Error(`Unknown weekday: ${dayStr}`)
  const result: WeekdayRule = { day: dayStr }
  if (nthStr !== undefined && nthStr !== '') result.nth = parseInt(nthStr, 10)
  return result
}

function parseICalDate(s: string): Date {
  // YYYYMMDD or YYYYMMDDTHHMMSSZ
  const y = parseInt(s.slice(0, 4), 10)
  const m = parseInt(s.slice(4, 6), 10) - 1
  const d = parseInt(s.slice(6, 8), 10)
  return new Date(y, m, d)
}

/**
 * Parse an iCal RRULE string into a RecurringRule object.
 *
 * @example
 * parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=6')
 * // → { frequency: 'weekly', byDay: [{day:'MO'},{day:'WE'},{day:'FR'}], count: 6 }
 */
export function parseRRule(rrule: string): RecurringRule {
  const parts = rrule.split(';')
  const map: Record<string, string> = {}
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq !== -1) {
      const key = part.slice(0, eq).trim().toUpperCase()
      const val = part.slice(eq + 1).trim()
      map[key] = val
    }
  }

  const freqStr = map['FREQ']
  if (!freqStr) throw new Error('RRULE missing FREQ')
  const frequency = FREQ_MAP[freqStr]
  if (!frequency) throw new Error(`Unknown FREQ: ${freqStr}`)

  const rule: RecurringRule = { frequency }

  const intervalStr = map['INTERVAL']
  if (intervalStr !== undefined) rule.interval = parseInt(intervalStr, 10)

  const countStr = map['COUNT']
  if (countStr !== undefined) rule.count = parseInt(countStr, 10)

  const untilStr = map['UNTIL']
  if (untilStr !== undefined) rule.until = parseICalDate(untilStr)

  const bydayStr = map['BYDAY']
  if (bydayStr !== undefined) {
    rule.byDay = bydayStr.split(',').map(parseWeekdayToken)
  }

  const byMonthdayStr = map['BYMONTHDAY']
  if (byMonthdayStr !== undefined) {
    rule.byMonthDay = byMonthdayStr.split(',').map((s) => parseInt(s, 10))
  }

  const byMonthStr = map['BYMONTH']
  if (byMonthStr !== undefined) {
    rule.byMonth = byMonthStr.split(',').map((s) => parseInt(s, 10))
  }

  const bySetposStr = map['BYSETPOS']
  if (bySetposStr !== undefined) {
    rule.bySetPos = bySetposStr.split(',').map((s) => parseInt(s, 10))
  }

  const wkstStr = map['WKST']
  if (wkstStr !== undefined && isWeekday(wkstStr)) {
    rule.weekStart = wkstStr
  }

  return rule
}

function formatICalDate(date: Date): string {
  const y = date.getFullYear().toString().padStart(4, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}${m}${d}`
}

function serializeWeekdayRule(wr: WeekdayRule): string {
  if (wr.nth !== undefined) return `${wr.nth}${wr.day}`
  return wr.day
}

/**
 * Serialize a RecurringRule into an iCal RRULE string.
 * `biweekly` frequency is serialized as `FREQ=WEEKLY;INTERVAL=2`.
 *
 * @example
 * serializeRRule({ frequency: 'weekly', byDay: [{day:'MO'},{day:'FR'}], count: 6 })
 * // → 'FREQ=WEEKLY;BYDAY=MO,FR;COUNT=6'
 */
export function serializeRRule(rule: RecurringRule): string {
  const parts: string[] = []

  const freqStr = FREQ_IMAP[rule.frequency]
  if (!freqStr) throw new Error(`Cannot serialize frequency: ${rule.frequency}`)
  parts.push(`FREQ=${freqStr}`)

  // biweekly serializes as WEEKLY with INTERVAL doubled
  const effectiveInterval =
    rule.frequency === 'biweekly' ? 2 * (rule.interval ?? 1) : rule.interval
  if (effectiveInterval !== undefined && effectiveInterval !== 1) {
    parts.push(`INTERVAL=${effectiveInterval}`)
  }

  // BY-rules come before COUNT/UNTIL (iCal canonical order: BYDAY, BYMONTH, BYMONTHDAY, BYSETPOS)
  if (rule.byDay !== undefined && rule.byDay.length > 0) {
    parts.push(`BYDAY=${rule.byDay.map(serializeWeekdayRule).join(',')}`)
  }

  if (rule.byMonth !== undefined && rule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rule.byMonth.join(',')}`)
  }

  if (rule.byMonthDay !== undefined && rule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`)
  }

  if (rule.bySetPos !== undefined && rule.bySetPos.length > 0) {
    parts.push(`BYSETPOS=${rule.bySetPos.join(',')}`)
  }

  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`)
  if (rule.until !== undefined) parts.push(`UNTIL=${formatICalDate(rule.until)}`)

  if (rule.weekStart !== undefined) parts.push(`WKST=${rule.weekStart}`)

  return parts.join(';')
}
