/**
 * @liteforge/calendar - Type Definitions
 */

// ─── Calendar View Types ───────────────────────────────────

export type CalendarView = 'day' | 'resource-day' | 'week' | 'month' | 'agenda'

// ─── Date Range ────────────────────────────────────────────

export interface DateRange {
  start: Date
  end: Date
}

// ─── Recurring Rule ────────────────────────────────────────

export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  interval?: number
  endDate?: Date
  count?: number
  daysOfWeek?: number[]
  exceptions?: Date[]
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
  // Weekend toggle
  hideWeekends: string
  showWeekends: string
  // All-day label
  allDay: string
  // Month view overflow
  more: (count: number) => string
  // Agenda empty state
  noEvents: string
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

  /** Selection */
  selectedEvent: () => T | null
  selectedSlot: () => SlotSelection | null
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
