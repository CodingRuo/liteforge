/**
 * @liteforge/calendar
 *
 * Signals-based scheduling calendar with day/week/month/agenda views,
 * resources (therapists/rooms), drag & drop, and recurring events.
 */

export { createCalendar } from './calendar.js'

export type {
  // Main types
  CalendarOptions,
  CalendarResult,
  CalendarEvent,
  EventIndicator,
  CalendarView,
  CalendarClasses,

  // Resource types
  Resource,
  WorkingHours,

  // Toolbar config
  ToolbarConfig,

  // Responsive config
  ResponsiveConfig,
  CalendarSizeClass,

  // Selection config
  SelectionConfig,

  // Time config
  TimeConfig,
  ResolvedTimeConfig,

  // Timeline config
  TimelineOptions,
  TimelineColumnWidth,

  // Recurring
  RecurringRule,
  Frequency,
  Weekday,
  WeekdayRule,

  // State types
  DateRange,
  SlotSelection,
  OverlapLayout,
  RenderedEvent,

  // Translations
  CalendarTranslations,

  // Print
  PrintOptions,

  // iCal
  ICalExportOptions,
  ICalImportResult,
  ICalImportError,
} from './types.js'

export { resolveTranslations } from './translations.js'

// Date utilities (exported for advanced usage)
export {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  addMinutes,
  addHours,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  isWithinRange,
  isBefore,
  isAfter,
  getDayOfWeek,
  getWeekNumber,
  daysInMonth,
  diffInMinutes,
  diffInDays,
  getSlotsBetween,
  getTimeSlots,
  getDaysInRange,
  getWeekDays,
  getMonthCalendarDays,
  formatTime,
  formatDate,
  formatDayHeader,
  formatWeekday,
  formatDayNumber,
  formatMonthYear,
  formatWeekRange,
  formatFullDate,
  snapToSlot,
  floorToSlot,
  eventsOverlap,
  isEventInRange,
  isEventOnDay,
  isAllDayEvent,
  getEventDuration,
  ensureValidEventEnd,
} from './date-utils.js'

// Recurring event expansion
export {
  expandRecurring,
  expandAllRecurring,
  parseRRule,
  serializeRRule,
  getNthWeekdayInMonth,
  isExcluded,
} from './recurring.js'

// iCal export/import
export { exportToICal, downloadICal, importFromICal, importICalFile } from './ical.js'

// Style injection (for advanced usage)
export { injectCalendarStyles, resetCalendarStylesInjection } from './styles.js'

// Utilities
export { findConflicts } from './utils/conflict.js'
export type { SnapResult } from './utils/snap.js'

// Timeline drag-to-create helpers (exported for testing and advanced usage)
export {
  getTimeFromMouseX,
  getResourceFromMouseY,
  snapToGrid,
} from './views/timeline-view.js'

// Quarter view utilities
export {
  getQuarterBounds,
  getQuarterLabel,
  navigateQuarter,
  getEventDotsForDay,
} from './views/quarter-view.js'
export type { EventDotInfo } from './views/quarter-view.js'

// Year view utilities
export {
  getYearBounds,
  navigateYear,
} from './views/year-view.js'

// Virtualization utilities (exported for advanced usage / testing)
export {
  bucketEvents,
  filterEventsByTimeRange,
  getEventKey,
  shouldVirtualize,
  createScrollHandler,
  resolveVirtConfig,
  // Timeline utilities
  calculateTimelinePosition,
  getNowIndicatorPosition,
  filterResourcesByViewport,
  createHorizontalScrollHandler,
} from './virtualization.js'
export type {
  VisibleTimeRange,
  VirtualizationConfig,
  EventBucket,
  HorizontalVisibleRange,
} from './virtualization.js'
