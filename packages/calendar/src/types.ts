/**
 * @liteforge/calendar - Type Definitions
 */

// ─── Calendar View Types ───────────────────────────────────

export type CalendarView = 'day' | 'resource-day' | 'week' | 'month' | 'agenda' | 'timeline' | 'quarter' | 'year'

// ─── Timeline Options ───────────────────────────────────────

/** Column width mode for the timeline view */
export type TimelineColumnWidth = 'auto' | 'fixed'

export interface TimelineOptions {
  /**
   * Duration each timeline cell spans in minutes (default: 60).
   * e.g. 30 → every column is a half-hour slot.
   */
  cellDuration?: number
  /**
   * Pixel width of each time cell (default: 100).
   */
  cellWidth?: number
  /**
   * Pixel width of the sticky resource label column (default: 140).
   */
  resourceColumnWidth?: number
  /**
   * Pixel height of each resource row (default: 48).
   */
  rowHeight?: number
  /**
   * Show a vertical now-indicator line (default: true when nowIndicator is enabled).
   */
  nowIndicator?: boolean
}

// ─── Date Range ────────────────────────────────────────────

export interface DateRange {
  start: Date
  end: Date
}

// ─── Recurring Rule ────────────────────────────────────────

export type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'

export interface WeekdayRule {
  day: Weekday
  /** +1=first, -1=last, +2=second, etc. */
  nth?: number
}

export interface RecurringRule {
  frequency: Frequency
  /** Every N units, default 1 */
  interval?: number
  /** End date (inclusive) — iCal UNTIL */
  until?: Date
  /** LEGACY alias for until (kept for backward compatibility) */
  endDate?: Date
  /** Max occurrences */
  count?: number
  /** iCal BYDAY — e.g. [{ day: 'MO' }, { day: 'FR' }] */
  byDay?: WeekdayRule[]
  /** LEGACY: JS day numbers 0–6 (kept for backward compatibility) */
  daysOfWeek?: number[]
  /** iCal BYMONTHDAY — e.g. [1, 15] */
  byMonthDay?: number[]
  /** iCal BYMONTH — e.g. [1, 6, 12] (1-based) */
  byMonth?: number[]
  /** iCal BYSETPOS — e.g. [-1] = last occurrence in set */
  bySetPos?: number[]
  /** Week start day (default 'MO') */
  weekStart?: Weekday
  /** Excluded dates (iCal EXDATE) */
  exceptions?: Date[]
}

// ─── Event Indicators ──────────────────────────────────────

export interface EventIndicator {
  /**
   * SVG string, plain text (emoji), or a pre-built Node.
   * When a string is provided it is set via innerHTML — the consumer is
   * responsible for safe content.
   */
  icon: string | Node
  /** Optional tooltip text shown on hover */
  tooltip?: string
  /** CSS color value — applied as color and border-color on the indicator */
  color?: string
}

// ─── Calendar Event ────────────────────────────────────────

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resourceId?: string
  color?: string
  status?: string
  allDay?: boolean
  editable?: boolean
  recurring?: RecurringRule
  indicators?: EventIndicator[]
  [key: string]: unknown
}

// ─── Resource ──────────────────────────────────────────────

export interface WorkingHours {
  start: number
  end: number
}

export interface Resource {
  id: string
  name: string
  color?: string
  avatar?: string
  role?: string
  workingHours?: {
    [day: number]: WorkingHours | null
  }
}

// ─── Time Configuration ────────────────────────────────────

export interface TimeConfig {
  slotDuration?: number
  dayStart?: number
  dayEnd?: number
  weekStart?: 0 | 1
  hiddenDays?: number[]
  nowIndicator?: boolean
}

export interface ResolvedTimeConfig {
  slotDuration: number
  dayStart: number
  dayEnd: number
  weekStart: 0 | 1
  hiddenDays: () => number[]
  nowIndicator: boolean
}

// ─── Translations ──────────────────────────────────────────

export interface CalendarTranslations {
  // Toolbar navigation
  today: string
  prev: string
  next: string
  // View labels
  day: string
  resourceDay: string
  week: string
  month: string
  agenda: string
  timeline: string
  quarter: string
  year: string
  // Weekend toggle
  hideWeekends: string
  showWeekends: string
  // All-day label
  allDay: string
  // Month view overflow
  more: (count: number) => string
  // Agenda empty state
  noEvents: string
  // Accessibility labels (ARIA)
  calendar: string
  navigation: string
  previousPeriod: string
  nextPeriod: string
  viewSelector: string
  resources: string
  // "⋮ More" menu
  moreActions: string
  exportIcal: string
  importIcal: string
  print: string
  toggleMiniCalendar: string
  hideMiniCalendar: string
}

// ─── Slot Selection ────────────────────────────────────────

export interface SlotSelection {
  start: Date
  end: Date
  resourceId: string | undefined
}

// ─── Selection Config ──────────────────────────────────────

export interface SelectionConfig {
  /** Show a duration badge while dragging a slot selection (default: false) */
  snapIndicator?: boolean
  /** Maximum selectable duration in minutes — drag stops here (default: unlimited) */
  maxDuration?: number
  /** Duration thresholds for badge colour steps in minutes (default: [15, 30, 45, 60]) */
  snapSteps?: number[]
}

// ─── Toolbar Config ────────────────────────────────────────

export interface ToolbarConfig {
  /** How resources are shown in the toolbar (default: 'inline') */
  resourceDisplay?: 'inline' | 'dropdown'
  /** Label for the resource dropdown toggle button (default: first translation match) */
  resourceDropdownLabel?: string
  /** How view buttons are shown (default: 'buttons') */
  viewDisplay?: 'buttons' | 'dropdown'
  /**
   * Show the "⋮ More" dropdown with Export / Import / Print actions.
   * Pass `false` to hide it completely.
   * Default: `true`
   */
  showMoreMenu?: boolean
  /** Show the weekend-toggle button (default: false) */
  showWeekendToggle?: boolean
}

// ─── iCal Options ──────────────────────────────────────────

export interface ICalExportOptions {
  /** PRODID / X-WR-CALNAME, default: 'LiteForge Calendar' */
  calendarName?: string
  /** TZID, default: system timezone */
  timezone?: string
  /** Download filename, default: 'calendar.ics' */
  filename?: string
}

export interface ICalImportError {
  line: number
  message: string
  raw: string
}

export interface ICalImportResult {
  events: CalendarEvent[]
  errors: ICalImportError[]
  calendarName?: string
}

// ─── Print Options ─────────────────────────────────────────

export interface PrintOptions {
  /** Which view to print — default: current view */
  view?: CalendarView
  /** Custom title shown on printout — default: current date range label */
  title?: string
  /** Whether to show weekends — default: current setting */
  showWeekends?: boolean
  /** Override the date range for print */
  dateRange?: {
    start: Date
    end: Date
  }
}

// ─── Responsive Config ─────────────────────────────────────

export type CalendarSizeClass = 'mobile' | 'tablet' | 'desktop'

export interface ResponsiveConfig {
  /** Container width below which mobile mode activates (default: 768) */
  mobileBp?: number
  /** Container width below which tablet mode activates (default: 1024) */
  tabletBp?: number
  /** View to auto-switch to when entering mobile breakpoint (default: 'day') */
  mobileView?: CalendarView
}

// ─── Calendar Options ──────────────────────────────────────

export interface CalendarOptions<T extends CalendarEvent> {
  /** Reactive event source */
  events: () => T[]

  /** Initial view (default: 'week') */
  view?: CalendarView
  /** Initial date (default: today) */
  defaultDate?: Date

  /** Time configuration */
  time?: TimeConfig

  /** Resources (therapists / rooms) */
  resources?: Resource[]

  /** Toolbar display configuration */
  toolbar?: ToolbarConfig

  /**
   * Event hover tooltips.
   *
   * Provide the `tooltip` function from `@liteforge/tooltip` (or any compatible
   * implementation) together with an optional custom content renderer.
   *
   * @example
   * import { tooltip } from '@liteforge/tooltip'
   *
   * eventTooltip: {
   *   fn: tooltip,
   *   render: (event) => `${event.title} — ${event.resourceId ?? ''}`,
   *   delay: 400,
   *   position: 'top',
   * }
   */
  eventTooltip?: {
    /** The tooltip attachment function — pass `tooltip` from `@liteforge/tooltip` */
    fn: (el: HTMLElement, input: string | { content: string | Node; delay?: number; position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'; triggerOnFocus?: boolean }) => () => void
    /** Custom content renderer — receives the event, returns string or Node */
    render?: (event: T) => string | Node
    /** Delay in ms before showing (default: 300) */
    delay?: number
    /** Tooltip position (default: 'top') */
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  }

  /** Responsive / mobile-breakpoint configuration */
  responsive?: ResponsiveConfig

  /** Enable drag & drop + resize globally (default: false) */
  editable?: boolean
  /** Enable slot selection (default: false) */
  selectable?: boolean
  /** Slot-selection configuration (indicator, maxDuration, etc.) */
  selection?: SelectionConfig

  /** Event handlers */
  onEventClick?: (event: T) => void
  onEventDrop?: (event: T, newStart: Date, newEnd: Date, newResourceId?: string) => void
  onEventResize?: (event: T, newEnd: Date) => void
  onSlotClick?: (start: Date, end: Date, resourceId?: string) => void
  onSlotSelect?: (start: Date, end: Date, resourceId?: string) => void
  onViewChange?: (view: CalendarView, dateRange: DateRange) => void
  onDateChange?: (date: Date) => void

  /**
   * Called before an event is moved or resized when the new time range
   * overlaps with one or more existing events on the same resource.
   *
   * Return:
   * - `'allow'`   — proceed silently (e.g. intentional double-booking)
   * - `'warn'`    — proceed but show a visual conflict indicator (`data-conflict="true"`)
   * - `'prevent'` — cancel the operation, event stays at original position
   *
   * If not provided, conflicts are always allowed (current behaviour, no breaking change).
   */
  onEventConflict?: (event: T, conflicts: T[]) => 'allow' | 'warn' | 'prevent'

  /**
   * Transform a parsed iCal event before it is added to the calendar.
   *
   * iCal import can only populate base `CalendarEvent` fields — T-specific
   * extra properties will be absent after parsing. If `T` extends
   * `CalendarEvent` with required properties, use this hook to populate them
   * before the event is added.
   *
   * @example
   * mapImportedEvent: (e) => ({ ...e, category: 'imported' })
   */
  mapImportedEvent?: (event: CalendarEvent) => T

  /** Custom rendering */
  eventContent?: (event: T) => Node
  slotContent?: (date: Date, resourceId?: string) => Node | null
  dayHeaderContent?: (date: Date) => Node

  /** Styling */
  unstyled?: boolean
  classes?: Partial<CalendarClasses>
  locale?: string

  /** UI string translations (default: English) */
  translations?: Partial<CalendarTranslations>

  /** Timeline-view specific options */
  timelineOptions?: TimelineOptions

  /** Virtual scroll / windowed rendering (activates above threshold) */
  virtualization?: {
    /** Enable virtualization (default: true) */
    enabled?: boolean
    /** Min timed-event count before virtualization activates (default: 100) */
    threshold?: number
    /** Pre-render buffer in minutes outside visible area (default: 60) */
    overscanMinutes?: number
  }
}

// ─── Calendar Classes ──────────────────────────────────────

export interface CalendarClasses {
  root: string
  toolbar: string
  toolbarNav: string
  toolbarTitle: string
  toolbarViews: string
  header: string
  headerCell: string
  body: string
  timeColumn: string
  timeLabel: string
  grid: string
  dayColumn: string
  resourceColumn: string
  timeSlot: string
  event: string
  eventDragging: string
  eventResizing: string
  nowIndicator: string
  monthGrid: string
  monthCell: string
  monthEvent: string
  monthMore: string
  agendaDay: string
  agendaDayHeader: string
  agendaItem: string
}

// ─── Calendar Result ───────────────────────────────────────

export interface CalendarResult<T extends CalendarEvent> {
  /** The calendar grid component */
  Root: () => Node
  /** Optional toolbar component */
  Toolbar: () => Node
  /** Compact month mini-calendar — place anywhere on the page */
  MiniCalendar: () => Node

  /** Current responsive size class (signal) — 'mobile' | 'tablet' | 'desktop' */
  sizeClass: () => CalendarSizeClass

  /** Current date (signal) */
  currentDate: () => Date
  /** Current view (signal) */
  currentView: () => CalendarView
  /** Visible date range (signal) */
  dateRange: () => DateRange

  /** Navigation */
  today: () => void
  next: () => void
  prev: () => void
  goTo: (date: Date) => void
  setView: (view: CalendarView) => void

  /** Events in visible range */
  events: () => T[]
  getEvent: (id: string) => T | undefined
  addEvent: (event: T) => void
  updateEvent: (id: string, changes: Partial<T>) => void
  removeEvent: (id: string) => void

  /** Resources */
  resources: () => Resource[]
  visibleResources: () => string[]
  showResource: (id: string) => void
  hideResource: (id: string) => void
  toggleResource: (id: string) => void

  /** Mobile resource filter — null = show all, string = filter to one resource */
  activeResource: () => string | null
  setActiveResource: (id: string | null) => void

  /** Mobile resource tab-bar component — place below Toolbar on mobile */
  MobileResourceBar: () => Node

  /** Weekend toggle */
  weekendsVisible: () => boolean
  toggleWeekends: () => void

  /** Mini-calendar visibility */
  miniCalendarVisible: () => boolean
  toggleMiniCalendar: () => void

  /** Selection */
  selectedEvent: () => T | null
  clearSelectedEvent: () => void
  selectedSlot: () => SlotSelection | null

  /** Print */
  print: (options?: PrintOptions) => void

  /** iCal export/import */
  exportICal: (options?: ICalExportOptions) => string
  downloadICal: (options?: ICalExportOptions) => void
  importICal: (icalString: string) => ICalImportResult
  importICalFile: (file: File) => Promise<ICalImportResult>
}

// ─── Internal Types ────────────────────────────────────────

export interface OverlapLayout<T extends CalendarEvent> {
  event: T
  column: number
  totalColumns: number
}

export interface RenderedEvent<T extends CalendarEvent> {
  event: T
  top: number
  height: number
  left: number
  width: number
}
