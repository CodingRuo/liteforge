// No imports — pure string constants

export const SETUP_CODE = `import { createCalendar } from '@liteforge/calendar';
import { signal } from '@liteforge/core';

const events = signal<CalendarEvent[]>([
  {
    id: '1',
    title: 'Initial Consult — A. Brown',
    start: new Date('2025-03-10T09:00'),
    end:   new Date('2025-03-10T10:00'),
    resourceId: 'dr-anna',
  },
]);

const calendar = createCalendar({
  events: () => events(),
  view: 'week',               // 'day' | 'week' | 'month' | 'agenda' | 'timeline'
  locale: 'en-US',
  time: { dayStart: 8, dayEnd: 18, slotDuration: 30, weekStart: 1 },
  editable:   true,           // drag & drop + resize
  selectable: true,           // slot click / drag-select
});

// Render: place these anywhere in your DOM
calendar.Toolbar()   // prev / next / today + view switcher
calendar.Root()      // calendar grid`

export const RESOURCES_CODE = `const calendar = createCalendar({
  events: () => events(),
  view: 'day',   // resource columns appear in day view
  resources: [
    { id: 'anna',  name: 'Dr. Anna Müller', color: '#6366f1',
      workingHours: { 1: { start: 8, end: 17 }, 2: { start: 8, end: 17 } } },
    { id: 'tom',   name: 'Dr. Tom Weber',   color: '#10b981' },
    { id: 'clara', name: 'Dr. Clara Bauer', color: '#f59e0b' },
  ],
  editable: true,
});

// Toggle resource visibility
calendar.toggleResource('anna');
calendar.visibleResources();   // Signal<string[]>

// Resource-day view (day with resource columns):
calendar.setView('resource-day');`

export const RECURRING_CODE = `// Daily standup — every weekday
const standup: CalendarEvent = {
  id: 'standup',
  title: 'Daily Standup',
  start: new Date('2025-03-10T09:00'),
  end:   new Date('2025-03-10T09:15'),
  recurring: {
    frequency: 'daily',
    interval:  1,
    byDay: [{ day: 'MO' }, { day: 'TU' }, { day: 'WE' }, { day: 'TH' }, { day: 'FR' }],
    until: new Date('2025-06-30'),
    exceptions: [new Date('2025-04-18')],  // skip Good Friday
  },
};

// Monthly — first Monday of each month
const monthlyReview: CalendarEvent = {
  id: 'review',
  title: 'Monthly Review',
  start: new Date('2025-03-03T10:00'),
  end:   new Date('2025-03-03T11:00'),
  recurring: {
    frequency: 'monthly',
    byDay: [{ day: 'MO', nth: 1 }],
  },
};`

export const DRAG_CODE = `const calendar = createCalendar({
  events: () => events(),
  editable:   true,   // enables drag & drop + resize globally
  selectable: true,   // enables slot click / drag-select

  onEventDrop: (event, newStart, newEnd, resourceId) => {
    events.update(list =>
      list.map(a => a.id !== event.id ? a : {
        ...a, start: newStart, end: newEnd,
        ...(resourceId !== undefined ? { resourceId } : {}),
      })
    );
  },

  onEventResize: (event, newEnd) => {
    events.update(list =>
      list.map(a => a.id === event.id ? { ...a, end: newEnd } : a)
    );
  },

  // Slot drag-select — fires when user releases after dragging
  onSlotSelect: (start, end, resourceId) => {
    openCreateModal({ start, end, resourceId });
  },

  // Single slot click
  onSlotClick: (start, end, resourceId) => {
    openCreateModal({ start, end, resourceId });
  },

  // Optional: snap duration badge while dragging
  selection: { snapIndicator: true, maxDuration: 120 },
});`

export const CONFLICT_CODE = `const calendar = createCalendar({
  events: () => events(),
  editable: true,

  onEventConflict: (event, conflicts) => {
    if (event.resourceId === 'room-a') return 'allow';  // rooms: always allow
    if (conflicts.length > 2) return 'prevent';         // hard limit
    return 'warn';  // show red outline via data-conflict="true"
  },
});

// CSS for the conflict indicator is already included:
// .lf-cal-event[data-conflict="true"] {
//   outline: 2px solid var(--lf-cal-color-danger, #ef4444);
//   outline-offset: -2px;
// }`

export const INDICATORS_CODE = `const event: CalendarEvent = {
  id: '1',
  title: 'Therapy — E. Lewis',
  start: new Date('2025-03-10T10:00'),
  end:   new Date('2025-03-10T11:00'),
  indicators: [
    { icon: '⚠', tooltip: 'Double-booked', color: '#ef4444' },
    { icon: '★', tooltip: 'High priority',  color: '#f59e0b' },
    // SVG string or pre-built Node also accepted
    { icon: '<svg .../>',  tooltip: 'Video call', color: '#3b82f6' },
  ],
};`

export const TOOLTIP_CODE = `import { tooltip } from '@liteforge/tooltip';
import { createCalendar } from '@liteforge/calendar';

const calendar = createCalendar({
  events: () => events(),

  eventTooltip: {
    fn: tooltip,           // any function: (el, opts) => () => void
    delay: 300,
    position: 'top',

    // Optional: fully custom tooltip content (receives the event)
    render: (event) => {
      const el = document.createElement('div');
      el.innerHTML = \`<strong>\${event.title}</strong><br/>\${event.start.toLocaleTimeString()}\`;
      return el;
    },
  },
});`

export const ICAL_CODE = `// Export all visible events as an .ics string
const ics = calendar.exportICal({ calendarName: 'My Calendar', timezone: 'Europe/Vienna' });

// Trigger browser download
calendar.downloadICal({ filename: 'schedule.ics' });

// Import from string
const result = calendar.importICal(icsString);
console.log(result.events);   // CalendarEvent[]
console.log(result.errors);   // parse errors

// Import from file input
const file = fileInput.files[0];
const result = await calendar.importICalFile(file);

// mapImportedEvent — populate T-specific fields after parsing
const calendar = createCalendar<Appointment>({
  events: () => appointments(),
  mapImportedEvent: (e) => ({ ...e, category: 'imported', status: 'confirmed' }),
});`

export const LOCALE_CODE = `// Locale controls date/time formatting via Intl
const calendar = createCalendar({
  events: () => events(),
  locale: 'de-AT',    // German (Austria) — week starts Monday by default

  // Override any translation string
  translations: {
    today: 'Heute',
    prev:  'Zurück',
    next:  'Weiter',
    week:  'Woche',
    month: 'Monat',
    allDay: 'Ganztag',
    more: (n) => \`+\${n} weitere\`,
  },
});`

export const RESPONSIVE_CODE = `const calendar = createCalendar({
  events: () => events(),

  // Responsive breakpoints (container width, not viewport)
  responsive: {
    mobileBp: 640,          // below 640px → mobile
    tabletBp: 1024,         // below 1024px → tablet
    mobileView: 'day',      // auto-switch to day view on mobile
  },

  // Read current size class reactively
  // calendar.sizeClass() → 'mobile' | 'tablet' | 'desktop'
});

// Mobile resource tab-bar
calendar.MobileResourceBar()   // place below Toolbar on small screens`

export const NAVIGATION_CODE = `// Programmatic navigation
calendar.next();             // next period
calendar.prev();             // previous period
calendar.today();            // jump to today
calendar.goTo(new Date());   // jump to any date

// Switch views
calendar.setView('month');   // 'day' | 'week' | 'month' | 'agenda' | 'timeline'

// Read state (signals)
calendar.currentDate()       // Signal<Date>
calendar.currentView()       // Signal<CalendarView>
calendar.dateRange()         // Signal<{ start: Date; end: Date }>

// Events API
calendar.addEvent(newEvent);
calendar.updateEvent(id, { title: 'Updated' });
calendar.removeEvent(id);
calendar.getEvent(id);

// Print
calendar.print({ view: 'week', title: 'This Week' });`
