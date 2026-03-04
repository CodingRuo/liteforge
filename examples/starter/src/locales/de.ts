export default {
  nav: {
    home: 'Startseite',
    dashboard: 'Dashboard',
    i18n: 'Internationalisierung',
  },
  greeting: 'Hallo, {name}!',
  welcome: 'Willkommen zur i18n-Demo',
  description: 'Wechsle die Sprache mit den Buttons. Übersetzungen aktualisieren sich sofort — kein Re-Render nötig.',
  currentLocale: 'Aktuelle Sprache: {locale}',
  buttons: {
    switchTo: 'Zu {locale} wechseln',
  },
  counter: {
    label: 'Elemente',
    value: '{count} Element | {count} Elemente',
    zero: 'Keine Elemente | {count} Element | {count} Elemente',
  },
  fallback: {
    title: 'Fallback-Locale',
    description: 'Dieser Schlüssel existiert nur in der englischen (Fallback-)Locale:',
    // onlyInFallback is intentionally missing — will fall back to 'en'
  },
  dotNotation: {
    title: 'Punkt-Notation',
    description: 'Zugriff auf verschachtelte Schlüssel mit Punkt-Notation.',
    deep: {
      nested: {
        key: 'Ich bin tief verschachtelt!',
      },
    },
  },
};
