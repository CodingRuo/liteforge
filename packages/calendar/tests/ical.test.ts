/**
 * @liteforge/calendar — iCal Export and Import Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { exportToICal, importFromICal } from '../src/ical.js'
import type { CalendarEvent } from '../src/types.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'ev-1',
    title: 'Test Event',
    start: new Date(2026, 2, 9, 10, 0, 0),  // 2026-03-09 10:00
    end:   new Date(2026, 2, 9, 11, 0, 0),  // 2026-03-09 11:00
    ...overrides,
  }
}

/** Split iCal into logical (unfolded) lines */
function icalLines(ical: string): string[] {
  return ical
    .split('\r\n')
    .filter(l => l.length > 0)
}

/** Find a property line by name prefix (case-insensitive) */
function findLine(ical: string, prop: string): string | undefined {
  const upper = prop.toUpperCase()
  return icalLines(ical).find(l =>
    l.toUpperCase().startsWith(upper + ':') ||
    l.toUpperCase().startsWith(upper + ';')
  )
}

// ── Export — happy paths ───────────────────────────────────────────────────

describe('exportToICal — happy paths', () => {
  it('produces valid VCALENDAR wrapper', () => {
    const ical = exportToICal([])
    expect(ical).toContain('BEGIN:VCALENDAR\r\n')
    expect(ical).toContain('END:VCALENDAR\r\n')
    expect(ical).toContain('VERSION:2.0\r\n')
    expect(ical).toContain('PRODID:-//LiteForge//Calendar//EN\r\n')
  })

  it('sets X-WR-CALNAME from option', () => {
    const ical = exportToICal([], { calendarName: 'Therapiepraxis' })
    expect(ical).toContain('X-WR-CALNAME:Therapiepraxis\r\n')
  })

  it('uses default calendar name when not specified', () => {
    const ical = exportToICal([])
    expect(ical).toContain('X-WR-CALNAME:LiteForge Calendar\r\n')
  })

  it('serializes DTSTART and DTEND correctly', () => {
    const ical = exportToICal([makeEvent()])
    expect(findLine(ical, 'DTSTART')).toBe('DTSTART:20260309T100000')
    expect(findLine(ical, 'DTEND')).toBe('DTEND:20260309T110000')
  })

  it('serializes SUMMARY', () => {
    const ical = exportToICal([makeEvent({ title: 'Einzeltherapie' })])
    expect(findLine(ical, 'SUMMARY')).toBe('SUMMARY:Einzeltherapie')
  })

  it('wraps event in VEVENT block', () => {
    const ical = exportToICal([makeEvent()])
    expect(ical).toContain('BEGIN:VEVENT\r\n')
    expect(ical).toContain('END:VEVENT\r\n')
  })

  it('sets UID as id@liteforge', () => {
    const ical = exportToICal([makeEvent({ id: 'abc-123' })])
    expect(findLine(ical, 'UID')).toBe('UID:abc-123@liteforge')
  })

  it('all-day event uses VALUE=DATE format', () => {
    const event = makeEvent({
      allDay: true,
      start: new Date(2026, 2, 9),
      end:   new Date(2026, 2, 9),
    })
    const ical = exportToICal([event])
    const dtstart = findLine(ical, 'DTSTART')
    expect(dtstart).toBeDefined()
    expect(dtstart).toContain('VALUE=DATE')
    expect(dtstart).toContain('20260309')
    // Value portion (after colon) must be date-only, no time component
    const valueAfterColon = dtstart!.split(':').slice(1).join(':')
    expect(valueAfterColon).not.toContain('T')
  })

  it('event with RRULE includes RRULE line', () => {
    const event = makeEvent({
      recurring: { frequency: 'weekly', byDay: [{ day: 'MO' }, { day: 'WE' }], count: 6 },
    })
    const ical = exportToICal([event])
    const rr = findLine(ical, 'RRULE')
    expect(rr).toBeDefined()
    expect(rr).toContain('FREQ=WEEKLY')
    expect(rr).toContain('BYDAY=MO,WE')
    expect(rr).toContain('COUNT=6')
  })

  it('event with exceptions includes EXDATE line', () => {
    const event = makeEvent({
      recurring: {
        frequency: 'weekly',
        exceptions: [new Date(2026, 2, 16, 10, 0, 0)],
      },
    })
    const ical = exportToICal([event])
    expect(findLine(ical, 'EXDATE')).toContain('20260316T100000')
  })

  it('escapes comma in title', () => {
    const event = makeEvent({ title: 'Dr. Müller, Anna' })
    const ical = exportToICal([event])
    expect(findLine(ical, 'SUMMARY')).toContain('\\,')
  })

  it('escapes semicolon in title', () => {
    const event = makeEvent({ title: 'Note; urgent' })
    const ical = exportToICal([event])
    expect(findLine(ical, 'SUMMARY')).toContain('\\;')
  })

  it('all lines end with CRLF', () => {
    const ical = exportToICal([makeEvent()])
    // Output ends with CRLF
    expect(ical.endsWith('\r\n')).toBe(true)
    // Output contains no bare LF (every \n is preceded by \r)
    let i = 0
    let bareLFCount = 0
    while ((i = ical.indexOf('\n', i)) !== -1) {
      if (i === 0 || ical[i - 1] !== '\r') bareLFCount++
      i++
    }
    expect(bareLFCount).toBe(0)
  })

  it('folds lines longer than 75 characters', () => {
    const longTitle = 'A'.repeat(100) // produces SUMMARY:AAAAAA... > 75
    const event = makeEvent({ title: longTitle })
    const ical = exportToICal([event])
    const rawLines = ical.split('\r\n')
    for (const l of rawLines) {
      expect(l.length).toBeLessThanOrEqual(75)
    }
  })

  it('multiple events all appear in output', () => {
    const e1 = makeEvent({ id: 'e1', title: 'First' })
    const e2 = makeEvent({ id: 'e2', title: 'Second' })
    const ical = exportToICal([e1, e2])
    expect(ical).toContain('SUMMARY:First')
    expect(ical).toContain('SUMMARY:Second')
    const count = (ical.match(/BEGIN:VEVENT/g) ?? []).length
    expect(count).toBe(2)
  })

  it('includes COLOR line when event has color', () => {
    const event = makeEvent({ color: '#3b82f6' })
    const ical = exportToICal([event])
    expect(findLine(ical, 'COLOR')).toBe('COLOR:#3b82f6')
  })

  it('includes DESCRIPTION when event has description', () => {
    const event = makeEvent({ description: 'Patient notes' })
    const ical = exportToICal([event])
    expect(findLine(ical, 'DESCRIPTION')).toBe('DESCRIPTION:Patient notes')
  })
})

// ── Import — happy paths ───────────────────────────────────────────────────

const SIMPLE_ICAL = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'X-WR-CALNAME:My Calendar',
  'BEGIN:VEVENT',
  'UID:test-001@liteforge',
  'DTSTART:20260309T100000',
  'DTEND:20260309T110000',
  'SUMMARY:Test Event',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n') + '\r\n'

describe('importFromICal — happy paths', () => {
  it('parses a single VEVENT', () => {
    const result = importFromICal(SIMPLE_ICAL)
    expect(result.events).toHaveLength(1)
    expect(result.errors).toHaveLength(0)
  })

  it('parses SUMMARY → title', () => {
    const result = importFromICal(SIMPLE_ICAL)
    expect(result.events[0]?.title).toBe('Test Event')
  })

  it('parses DTSTART and DTEND', () => {
    const result = importFromICal(SIMPLE_ICAL)
    const e = result.events[0]!
    expect(e.start.getFullYear()).toBe(2026)
    expect(e.start.getMonth()).toBe(2) // 0-based March
    expect(e.start.getDate()).toBe(9)
    expect(e.start.getHours()).toBe(10)
    expect(e.end.getHours()).toBe(11)
  })

  it('strips @liteforge suffix from UID → id', () => {
    const result = importFromICal(SIMPLE_ICAL)
    expect(result.events[0]?.id).toBe('test-001')
  })

  it('reads X-WR-CALNAME → calendarName', () => {
    const result = importFromICal(SIMPLE_ICAL)
    expect(result.calendarName).toBe('My Calendar')
  })

  it('parses all-day event (VALUE=DATE)', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:allday-1',
      'DTSTART;VALUE=DATE:20260309',
      'DTEND;VALUE=DATE:20260309',
      'SUMMARY:Fortbildungstag',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.allDay).toBe(true)
    expect(result.events[0]?.start.getDate()).toBe(9)
  })

  it('parses RRULE via parseRRule()', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:rec-1',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:Weekly Meeting',
      'RRULE:FREQ=WEEKLY;BYDAY=MO,FR;COUNT=10',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events[0]?.recurring).toBeDefined()
    expect(result.events[0]?.recurring?.frequency).toBe('weekly')
    expect(result.events[0]?.recurring?.count).toBe(10)
    expect(result.events[0]?.recurring?.byDay?.map(d => d.day)).toContain('MO')
    expect(result.events[0]?.recurring?.byDay?.map(d => d.day)).toContain('FR')
  })

  it('parses EXDATE into exceptions[]', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:rec-2',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:With Exceptions',
      'RRULE:FREQ=WEEKLY',
      'EXDATE:20260316T100000,20260323T100000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    const exceptions = result.events[0]?.recurring?.exceptions
    expect(exceptions).toHaveLength(2)
    expect(exceptions?.[0]?.getDate()).toBe(16)
    expect(exceptions?.[1]?.getDate()).toBe(23)
  })

  it('parses DURATION when DTEND is absent', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:dur-1',
      'DTSTART:20260309T100000',
      'DURATION:PT1H30M',
      'SUMMARY:Duration Event',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    const e = result.events[0]!
    expect(e.end.getHours()).toBe(11)
    expect(e.end.getMinutes()).toBe(30)
  })

  it('handles LF-only line endings (lenient)', () => {
    const ical = SIMPLE_ICAL.replace(/\r\n/g, '\n')
    const result = importFromICal(ical)
    expect(result.events).toHaveLength(1)
  })

  it('unfolds folded lines before parsing', () => {
    // RFC 5545: continuation line starts with a single space/tab that is removed.
    // "SUMMARY:Part1" + CRLF + " Part2" unfolds to "SUMMARY:Part1Part2"
    // (the leading space on the continuation is stripped, not the trailing of part1).
    // To get a space between words, the fold must include the space before the fold point.
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:fold-1',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      // Folded SUMMARY: space is at END of line 1, not start of line 2
      'SUMMARY:This is a very long summary ',
      ' that should be unfolded correctly',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    // After unfolding: "SUMMARY:This is a very long summary that should be unfolded correctly"
    expect(result.events[0]?.title).toBe('This is a very long summary that should be unfolded correctly')
  })

  it('parses multiple VEVENTs', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT', 'UID:e1', 'DTSTART:20260309T100000', 'DTEND:20260309T110000', 'SUMMARY:First', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:e2', 'DTSTART:20260310T140000', 'DTEND:20260310T150000', 'SUMMARY:Second', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(2)
    expect(result.events[0]?.title).toBe('First')
    expect(result.events[1]?.title).toBe('Second')
  })

  it('parses COLOR property', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:col-1',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:Colored',
      'COLOR:#3b82f6',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events[0]?.color).toBe('#3b82f6')
  })

  it('parses DESCRIPTION', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:desc-1',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:With Desc',
      'DESCRIPTION:Patient notes here',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events[0]?.description).toBe('Patient notes here')
  })

  it('unescapes special characters in SUMMARY', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:esc-1',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:Dr. Müller\\, Anna',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events[0]?.title).toBe('Dr. Müller, Anna')
  })

  it('skips VTIMEZONE blocks without crashing', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Vienna',
      'BEGIN:STANDARD',
      'DTSTART:19701025T030000',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:tz-1',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:TZ Event',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.title).toBe('TZ Event')
  })
})

// ── Round-trip tests ───────────────────────────────────────────────────────

describe('iCal round-trip (export → import)', () => {
  it('simple event round-trips correctly', () => {
    const original = makeEvent({ id: 'rt-1', title: 'Round-trip Test' })
    const ical = exportToICal([original])
    const { events } = importFromICal(ical)

    expect(events).toHaveLength(1)
    const e = events[0]!
    expect(e.id).toBe('rt-1')
    expect(e.title).toBe('Round-trip Test')
    expect(e.start.getHours()).toBe(original.start.getHours())
    expect(e.end.getHours()).toBe(original.end.getHours())
  })

  it('weekly RRULE round-trips stably', () => {
    const original = makeEvent({
      id: 'rt-2',
      recurring: {
        frequency: 'weekly',
        byDay: [{ day: 'MO' }, { day: 'WE' }, { day: 'FR' }],
        count: 12,
      },
    })
    const ical = exportToICal([original])
    const { events } = importFromICal(ical)

    const rule = events[0]?.recurring
    expect(rule?.frequency).toBe('weekly')
    expect(rule?.count).toBe(12)
    expect(rule?.byDay?.map(d => d.day)).toContain('MO')
    expect(rule?.byDay?.map(d => d.day)).toContain('WE')
    expect(rule?.byDay?.map(d => d.day)).toContain('FR')
  })

  it('monthly nth-weekday RRULE round-trips stably', () => {
    const original = makeEvent({
      id: 'rt-3',
      recurring: {
        frequency: 'monthly',
        byDay: [{ day: 'MO', nth: 2 }], // second Monday
        count: 6,
      },
    })
    const ical = exportToICal([original])
    const { events } = importFromICal(ical)

    const rule = events[0]?.recurring
    expect(rule?.frequency).toBe('monthly')
    expect(rule?.count).toBe(6)
    expect(rule?.byDay?.[0]?.day).toBe('MO')
    expect(rule?.byDay?.[0]?.nth).toBe(2)
  })

  it('event with exceptions round-trips correctly', () => {
    const original = makeEvent({
      id: 'rt-4',
      recurring: {
        frequency: 'weekly',
        exceptions: [new Date(2026, 2, 16, 10, 0, 0), new Date(2026, 2, 23, 10, 0, 0)],
      },
    })
    const ical = exportToICal([original])
    const { events } = importFromICal(ical)

    const exceptions = events[0]?.recurring?.exceptions
    expect(exceptions).toHaveLength(2)
    expect(exceptions?.[0]?.getDate()).toBe(16)
    expect(exceptions?.[1]?.getDate()).toBe(23)
  })

  it('special chars in title round-trip correctly', () => {
    const original = makeEvent({ title: 'Dr. Müller; Praxis, Wien' })
    const ical = exportToICal([original])
    const { events } = importFromICal(ical)
    expect(events[0]?.title).toBe('Dr. Müller; Praxis, Wien')
  })
})

// ── Unhappy paths ──────────────────────────────────────────────────────────

describe('importFromICal — unhappy paths', () => {
  it('empty string returns empty events array with no errors', () => {
    const result = importFromICal('')
    expect(result.events).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('only VCALENDAR header (no events) returns empty events', () => {
    const ical = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'
    const result = importFromICal(ical)
    expect(result.events).toHaveLength(0)
    expect(result.errors).toHaveLength(0)
  })

  it('event with malformed DTSTART is skipped with error recorded', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:bad-dt',
      'DTSTART:NOT_A_DATE',
      'DTEND:20260309T110000',
      'SUMMARY:Bad Date',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(0)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]?.message).toContain('Cannot parse DTSTART')
  })

  it('event missing DTSTART is skipped with error', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:no-dt',
      'DTEND:20260309T110000',
      'SUMMARY:No Start',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(0)
    expect(result.errors[0]?.message).toContain('missing DTSTART')
  })

  it('missing SUMMARY → event imported with empty title, no crash', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:no-sum',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.title).toBe('')
  })

  it('BEGIN:VEVENT without END:VEVENT records an error', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:unclosed',
      'DTSTART:20260309T100000',
      'SUMMARY:Unclosed',
      // No END:VEVENT
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.message.toLowerCase().includes('unclosed') || e.message.toLowerCase().includes('missing end'))).toBe(true)
  })

  it('invalid RRULE string records error, event still imported without recurrence', () => {
    const ical = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:bad-rrule',
      'DTSTART:20260309T100000',
      'DTEND:20260309T110000',
      'SUMMARY:Bad Rule',
      'RRULE:FREQ=HOURLY',  // unsupported frequency
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n'

    const result = importFromICal(ical)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]?.recurring).toBeUndefined()
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some(e => e.message.includes('RRULE'))).toBe(true)
  })
})

// ── Line-folding unit tests ────────────────────────────────────────────────

describe('iCal line folding', () => {
  it('short line is not folded', () => {
    const event = makeEvent({ title: 'Short' })
    const ical = exportToICal([event])
    const summaryLine = icalLines(ical).find(l => l.startsWith('SUMMARY:'))!
    expect(summaryLine).toBe('SUMMARY:Short')
  })

  it('line exactly at 75 chars is not folded', () => {
    // SUMMARY: (8) + 67 chars = 75
    const title = 'X'.repeat(67)
    const event = makeEvent({ title })
    const ical = exportToICal([event])
    const rawLines = ical.split('\r\n')
    const summaryLines = rawLines.filter(l => l.startsWith('SUMMARY:') || (rawLines.findIndex(x => x.startsWith('SUMMARY:')) !== -1 && l.startsWith(' ')))
    // Should be exactly one line (no fold)
    expect(rawLines.filter(l => l.startsWith('SUMMARY:')).length).toBe(1)
    expect(rawLines.find(l => l.startsWith('SUMMARY:'))!.length).toBe(75)
  })

  it('line > 75 chars is folded; continuation lines start with space', () => {
    const title = 'B'.repeat(80)
    const event = makeEvent({ title })
    const ical = exportToICal([event])
    const rawLines = ical.split('\r\n')
    const summaryIdx = rawLines.findIndex(l => l.startsWith('SUMMARY:'))
    expect(summaryIdx).toBeGreaterThan(-1)
    // Next line should be a continuation (starts with space)
    expect(rawLines[summaryIdx + 1]).toMatch(/^ /)
  })
})
