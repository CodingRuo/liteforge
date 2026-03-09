/**
 * @liteforge/calendar - Built-in Translations
 *
 * Auto-resolved from the `locale` option.
 * Pass `translations` to override individual strings or add unsupported locales.
 */

import type { CalendarTranslations } from './types.js'

// ─── Built-in locale strings ───────────────────────────────

const EN: CalendarTranslations = {
  today: 'Today',
  prev: '←',
  next: '→',
  day: 'Day',
  resourceDay: 'Resources',
  week: 'Week',
  month: 'Month',
  agenda: 'Agenda',
  timeline: 'Timeline',
  quarter: 'Quarter',
  year: 'Year',
  hideWeekends: 'Hide weekends',
  showWeekends: 'Show weekends',
  allDay: 'All-day',
  more: (count) => `+${count} more`,
  noEvents: 'No events',
  // Accessibility labels
  calendar: 'Calendar',
  navigation: 'Navigation',
  previousPeriod: 'Previous',
  nextPeriod: 'Next',
  viewSelector: 'Select view',
  resources: 'Resources',
  // More menu
  moreActions: 'More',
  exportIcal: 'Export (.ics)',
  importIcal: 'Import (.ics)',
  print: 'Print',
  toggleMiniCalendar: 'Show mini calendar',
  hideMiniCalendar: 'Hide mini calendar',
}

const DE: CalendarTranslations = {
  today: 'Heute',
  prev: '←',
  next: '→',
  day: 'Tag',
  resourceDay: 'Ressourcen',
  week: 'Woche',
  month: 'Monat',
  agenda: 'Agenda',
  timeline: 'Zeitstrahl',
  quarter: 'Quartal',
  year: 'Jahr',
  hideWeekends: 'Wochenende ausblenden',
  showWeekends: 'Wochenende anzeigen',
  allDay: 'Ganztägig',
  more: (count) => `+${count} weitere`,
  noEvents: 'Keine Termine in diesem Zeitraum',
  // Accessibility labels
  calendar: 'Kalender',
  navigation: 'Navigation',
  previousPeriod: 'Zurück',
  nextPeriod: 'Weiter',
  viewSelector: 'Ansicht wählen',
  resources: 'Ressourcen',
  // More menu
  moreActions: 'Mehr',
  exportIcal: 'Exportieren (.ics)',
  importIcal: 'Importieren (.ics)',
  print: 'Drucken',
  toggleMiniCalendar: 'Mini-Kalender anzeigen',
  hideMiniCalendar: 'Mini-Kalender ausblenden',
}

const FR: CalendarTranslations = {
  today: "Aujourd'hui",
  prev: '←',
  next: '→',
  day: 'Jour',
  resourceDay: 'Ressources',
  week: 'Semaine',
  month: 'Mois',
  agenda: 'Agenda',
  timeline: 'Chronologie',
  quarter: 'Trimestre',
  year: 'Année',
  hideWeekends: 'Masquer les week-ends',
  showWeekends: 'Afficher les week-ends',
  allDay: 'Toute la journée',
  more: (count) => `+${count} de plus`,
  noEvents: 'Aucun événement',
  // Accessibility labels
  calendar: 'Calendrier',
  navigation: 'Navigation',
  previousPeriod: 'Précédent',
  nextPeriod: 'Suivant',
  viewSelector: 'Choisir la vue',
  resources: 'Ressources',
  // More menu
  moreActions: 'Plus',
  exportIcal: 'Exporter (.ics)',
  importIcal: 'Importer (.ics)',
  print: 'Imprimer',
  toggleMiniCalendar: 'Afficher le mini-calendrier',
  hideMiniCalendar: 'Masquer le mini-calendrier',
}

const ES: CalendarTranslations = {
  today: 'Hoy',
  prev: '←',
  next: '→',
  day: 'Día',
  resourceDay: 'Recursos',
  week: 'Semana',
  month: 'Mes',
  agenda: 'Agenda',
  timeline: 'Línea de tiempo',
  quarter: 'Trimestre',
  year: 'Año',
  hideWeekends: 'Ocultar fines de semana',
  showWeekends: 'Mostrar fines de semana',
  allDay: 'Todo el día',
  more: (count) => `+${count} más`,
  noEvents: 'Sin eventos',
  // Accessibility labels
  calendar: 'Calendario',
  navigation: 'Navegación',
  previousPeriod: 'Anterior',
  nextPeriod: 'Siguiente',
  viewSelector: 'Seleccionar vista',
  resources: 'Recursos',
  // More menu
  moreActions: 'Más',
  exportIcal: 'Exportar (.ics)',
  importIcal: 'Importar (.ics)',
  print: 'Imprimir',
  toggleMiniCalendar: 'Mostrar mini-calendario',
  hideMiniCalendar: 'Ocultar mini-calendario',
}

// ─── Locale map: exact match, then language prefix ─────────

const LOCALE_MAP: Record<string, CalendarTranslations> = {
  en: EN,
  de: DE,
  fr: FR,
  es: ES,
}

// ─── Resolver ──────────────────────────────────────────────

/**
 * Resolve translations for a given locale, with optional overrides.
 *
 * Lookup order:
 * 1. Exact locale match: 'de-AT' → not found
 * 2. Language prefix: 'de-AT' → 'de' → DE translations
 * 3. Fallback: English
 *
 * The `overrides` object merges on top, allowing partial customisation
 * without providing a full translation set.
 */
export function resolveTranslations(
  locale: string,
  overrides: Partial<CalendarTranslations> | undefined,
): CalendarTranslations {
  const lang = locale.split('-')[0]!.toLowerCase()
  const base = LOCALE_MAP[locale.toLowerCase()] ?? LOCALE_MAP[lang] ?? EN
  if (!overrides) return base
  return { ...base, ...overrides }
}
