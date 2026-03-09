/**
 * @liteforge/calendar — iCal (RFC 5545) Export and Import
 *
 * Implements .ics serialization and parsing without any external library.
 * RRULE serialization/parsing delegates to the existing recurring.ts helpers.
 */

import { parseRRule, serializeRRule } from './recurring.js'
import type {
  CalendarEvent,
  RecurringRule,
  ICalExportOptions,
  ICalImportResult,
  ICalImportError,
} from './types.js'

// ─── Constants ─────────────────────────────────────────────

const CRLF = '\r\n'
const MAX_LINE = 75

// ─── Date formatting helpers ───────────────────────────────

/** Format a Date as iCal local datetime: YYYYMMDDTHHmmss */
function formatICalDateTime(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

/** Format a Date as iCal date-only: YYYYMMDD */
function formatICalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

/** Parse iCal datetime string (YYYYMMDDTHHmmss or YYYYMMDD) to Date */
function parseICalDateTime(raw: string): Date | null {
  // Strip trailing Z (UTC marker) for local-time parsing
  const s = raw.replace(/Z$/, '')
  // All-day: YYYYMMDD (8 chars)
  if (/^\d{8}$/.test(s)) {
    const y = parseInt(s.slice(0, 4))
    const mo = parseInt(s.slice(4, 6)) - 1
    const d = parseInt(s.slice(6, 8))
    const date = new Date(y, mo, d)
    return isNaN(date.getTime()) ? null : date
  }
  // Datetime: YYYYMMDDTHHmmss
  if (/^\d{8}T\d{6}$/.test(s)) {
    const y  = parseInt(s.slice(0, 4))
    const mo = parseInt(s.slice(4, 6)) - 1
    const d  = parseInt(s.slice(6, 8))
    const h  = parseInt(s.slice(9, 11))
    const mi = parseInt(s.slice(11, 13))
    const sec = parseInt(s.slice(13, 15))
    const date = new Date(y, mo, d, h, mi, sec)
    return isNaN(date.getTime()) ? null : date
  }
  return null
}

/** Parse ISO-8601 DURATION (P1W, PT1H30M, P1DT2H, etc.) into minutes */
function parseDuration(raw: string): number | null {
  const m = raw.match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!m) return null
  const weeks   = parseInt(m[1] ?? '0') || 0
  const days    = parseInt(m[2] ?? '0') || 0
  const hours   = parseInt(m[3] ?? '0') || 0
  const minutes = parseInt(m[4] ?? '0') || 0
  const seconds = parseInt(m[5] ?? '0') || 0
  return weeks * 7 * 24 * 60 + days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60)
}

// ─── Text escaping ─────────────────────────────────────────

/** Escape special chars in iCal text values */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
}

/** Unescape iCal text values */
function unescapeText(text: string): string {
  return text
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

// ─── Line folding ──────────────────────────────────────────

/**
 * Fold a single property line at 75 octets (RFC 5545 §3.1).
 * Continuation lines start with a single space.
 */
function foldLine(line: string): string {
  if (line.length <= MAX_LINE) return line
  let result = ''
  let pos = 0
  while (pos < line.length) {
    if (pos === 0) {
      result += line.slice(0, MAX_LINE)
      pos = MAX_LINE
    } else {
      result += CRLF + ' ' + line.slice(pos, pos + MAX_LINE - 1)
      pos += MAX_LINE - 1
    }
  }
  return result
}

/**
 * Unfold RFC 5545 lines: remove CRLF (or LF) followed by a space/tab.
 */
function unfoldLines(text: string): string[] {
  // Normalise line endings to LF, then unfold
  const normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const unfolded = normalised.replace(/\n[ \t]/g, '')
  return unfolded.split('\n').map(l => l.trimEnd())
}

// ─── Export ────────────────────────────────────────────────

/**
 * Serialize a single VEVENT block from a CalendarEvent.
 * Returns an array of (already-folded) CRLF-terminated lines.
 */
function serializeVEvent(event: CalendarEvent): string[] {
  const lines: string[] = []
  const w = (line: string) => lines.push(foldLine(line) + CRLF)

  w('BEGIN:VEVENT')
  w(`UID:${event.id}@liteforge`)

  if (event.allDay) {
    w(`DTSTART;VALUE=DATE:${formatICalDate(event.start)}`)
    w(`DTEND;VALUE=DATE:${formatICalDate(event.end)}`)
  } else {
    w(`DTSTART:${formatICalDateTime(event.start)}`)
    w(`DTEND:${formatICalDateTime(event.end)}`)
  }

  w(`SUMMARY:${escapeText(event.title)}`)

  if (typeof event.description === 'string' && event.description.length > 0) {
    w(`DESCRIPTION:${escapeText(event.description)}`)
  }

  if (event.color) {
    w(`COLOR:${event.color}`)
  }

  if (event.status) {
    w(`STATUS:${event.status.toUpperCase()}`)
  }

  if (event.recurring) {
    w(`RRULE:${serializeRRule(event.recurring)}`)

    if (event.recurring.exceptions && event.recurring.exceptions.length > 0) {
      const exdates = event.recurring.exceptions
        .map(d => formatICalDateTime(d))
        .join(',')
      w(`EXDATE:${exdates}`)
    }
  }

  w('END:VEVENT')
  return lines
}

/**
 * Convert an array of CalendarEvents to an iCal string.
 */
export function exportToICal(
  events: CalendarEvent[],
  options: ICalExportOptions = {}
): string {
  const calName = options.calendarName ?? 'LiteForge Calendar'
  const tz = options.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone

  const lines: string[] = []
  const w = (line: string) => lines.push(foldLine(line) + CRLF)

  w('BEGIN:VCALENDAR')
  w('VERSION:2.0')
  w('PRODID:-//LiteForge//Calendar//EN')
  w(`X-WR-CALNAME:${escapeText(calName)}`)
  w(`X-WR-TIMEZONE:${tz}`)

  for (const event of events) {
    for (const l of serializeVEvent(event)) {
      lines.push(l)
    }
  }

  w('END:VCALENDAR')

  return lines.join('')
}

/**
 * Export events to iCal and trigger a browser file download.
 */
export function downloadICal(
  events: CalendarEvent[],
  options: ICalExportOptions = {}
): void {
  const content = exportToICal(events, options)
  const filename = options.filename ?? 'calendar.ics'
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Revoke after a tick so the download begins
  setTimeout(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 100)
}

// ─── Import ────────────────────────────────────────────────

/** Parse the value portion of a property line, stripping any parameters */
function extractValue(line: string): string {
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return ''
  return line.slice(colonIdx + 1)
}

/** Extract property name (before ':' or ';PARAM=') */
function extractName(line: string): string {
  const semicolonIdx = line.indexOf(';')
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return line.toUpperCase()
  const end = semicolonIdx !== -1 && semicolonIdx < colonIdx ? semicolonIdx : colonIdx
  return line.slice(0, end).toUpperCase()
}

/** Return true if DTSTART/DTEND has VALUE=DATE parameter */
function isDateOnly(line: string): boolean {
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return false
  return line.slice(0, colonIdx).toUpperCase().includes('VALUE=DATE')
}

interface VEventAccumulator {
  uid: string
  summary: string
  dtstart: string
  dtend: string
  duration: string
  rrule: string
  exdate: string
  description: string
  color: string
  status: string
  allDay: boolean
}

function emptyVEvent(): VEventAccumulator {
  return {
    uid: '', summary: '', dtstart: '', dtend: '', duration: '',
    rrule: '', exdate: '', description: '', color: '', status: '', allDay: false,
  }
}

/**
 * Parse an iCal string and return CalendarEvent[].
 */
export function importFromICal(icalString: string): ICalImportResult {
  const errors: ICalImportError[] = []
  const events: CalendarEvent[] = []
  let calendarName: string | undefined

  const rawLines = unfoldLines(icalString)
  let inVEvent = false
  let inVTimezone = false
  let current: VEventAccumulator = emptyVEvent()
  let lineNum = 0

  for (const line of rawLines) {
    lineNum++
    if (line === '') continue

    const name = extractName(line)
    const value = extractValue(line)

    if (name === 'BEGIN' && value.toUpperCase() === 'VEVENT') {
      inVEvent = true
      current = emptyVEvent()
      continue
    }

    if (name === 'BEGIN' && value.toUpperCase() === 'VTIMEZONE') {
      inVTimezone = true
      continue
    }

    if (name === 'END' && value.toUpperCase() === 'VTIMEZONE') {
      inVTimezone = false
      continue
    }

    if (inVTimezone) continue

    if (name === 'END' && value.toUpperCase() === 'VEVENT') {
      inVEvent = false

      // Require DTSTART
      if (!current.dtstart) {
        errors.push({ line: lineNum, message: 'VEVENT missing DTSTART', raw: line })
        continue
      }

      const start = parseICalDateTime(current.dtstart)
      if (!start) {
        errors.push({ line: lineNum, message: `Cannot parse DTSTART: ${current.dtstart}`, raw: current.dtstart })
        continue
      }

      let end: Date
      if (current.dtend) {
        const parsed = parseICalDateTime(current.dtend)
        if (!parsed) {
          errors.push({ line: lineNum, message: `Cannot parse DTEND: ${current.dtend}`, raw: current.dtend })
          // Fall back to same as start
          end = new Date(start)
        } else {
          end = parsed
        }
      } else if (current.duration) {
        const mins = parseDuration(current.duration)
        if (mins === null) {
          errors.push({ line: lineNum, message: `Cannot parse DURATION: ${current.duration}`, raw: current.duration })
          end = new Date(start)
        } else {
          end = new Date(start.getTime() + mins * 60000)
        }
      } else {
        // No DTEND or DURATION — default to same as start (all-day) or +1h
        end = current.allDay
          ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
          : new Date(start.getTime() + 60 * 60000)
      }

      const id = current.uid.replace(/@liteforge$/, '') || `ical-${Date.now()}-${Math.random().toString(36).slice(2)}`

      const event: CalendarEvent = {
        id,
        title: unescapeText(current.summary),
        start,
        end,
      }

      if (current.allDay) event.allDay = true
      if (current.color)  event.color = current.color
      if (current.status) event.status = current.status.toLowerCase()

      if (current.description) {
        event.description = unescapeText(current.description)
      }

      if (current.rrule) {
        try {
          const rule: RecurringRule = parseRRule(current.rrule)

          if (current.exdate) {
            const exdates = current.exdate.split(',').map(d => d.trim())
            const parsed: Date[] = []
            for (const exd of exdates) {
              const d = parseICalDateTime(exd)
              if (d) parsed.push(d)
            }
            if (parsed.length > 0) rule.exceptions = parsed
          }

          event.recurring = rule
        } catch (err) {
          errors.push({
            line: lineNum,
            message: `Invalid RRULE: ${current.rrule} — ${err instanceof Error ? err.message : String(err)}`,
            raw: current.rrule,
          })
        }
      }

      events.push(event)
      continue
    }

    // Outside any block we care about
    if (!inVEvent) {
      if (name === 'X-WR-CALNAME') {
        calendarName = unescapeText(value)
      }
      continue
    }

    // Inside VEVENT — collect properties
    switch (name) {
      case 'UID':         current.uid     = value; break
      case 'SUMMARY':     current.summary = value; break
      case 'DESCRIPTION': current.description = value; break
      case 'RRULE':       current.rrule   = value; break
      case 'EXDATE':      current.exdate  = value; break
      case 'DURATION':    current.duration = value; break
      case 'COLOR':       current.color   = value; break
      case 'X-APPLE-CALENDAR-COLOR': if (!current.color) current.color = value; break
      case 'STATUS':      current.status  = value; break
      case 'DTSTART':
        current.dtstart = value
        current.allDay = isDateOnly(line)
        break
      case 'DTEND':
        current.dtend = value
        break
      default:
        // Unknown properties: record as non-fatal error and continue
        if (!name.startsWith('X-') && !['DTSTAMP', 'CREATED', 'LAST-MODIFIED',
            'SEQUENCE', 'CLASS', 'TRANSP', 'LOCATION', 'ORGANIZER', 'ATTENDEE',
            'CATEGORIES', 'COMMENT', 'CONTACT', 'RELATED-TO', 'RESOURCES',
            'VALARM', 'BEGIN', 'END', 'TZID', 'TZOFFSETFROM', 'TZOFFSETTO',
            'TZNAME', 'RRULE', 'EXRULE', 'RDATE', 'PRIORITY',
            'URL', 'GEO', 'ATTACH', 'PERCENT-COMPLETE', 'ACTION',
            'TRIGGER', 'REPEAT'].includes(name)) {
          errors.push({ line: lineNum, message: `Unknown property: ${name}`, raw: line })
        }
    }
  }

  // If a BEGIN:VEVENT was opened but never closed
  if (inVEvent) {
    errors.push({ line: lineNum, message: 'Unclosed VEVENT block (missing END:VEVENT)', raw: '' })
  }

  return { events, errors, ...(calendarName !== undefined ? { calendarName } : {}) }
}

/**
 * Read a File object and parse it as iCal.
 */
export async function importICalFile(file: File): Promise<ICalImportResult> {
  const text = await file.text()
  return importFromICal(text)
}
