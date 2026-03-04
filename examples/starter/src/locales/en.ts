export default {
  nav: {
    home: 'Home',
    dashboard: 'Dashboard',
    i18n: 'Internationalization',
  },
  greeting: 'Hello, {name}!',
  welcome: 'Welcome to the i18n demo',
  description: 'Switch the locale with the buttons below. Translations update instantly — no re-render needed.',
  currentLocale: 'Current locale: {locale}',
  buttons: {
    switchTo: 'Switch to {locale}',
  },
  counter: {
    label: 'Items',
    value: '{count} item | {count} items',
    zero: 'No items | {count} item | {count} items',
  },
  fallback: {
    title: 'Fallback Locale',
    description: 'This key only exists in the English (fallback) locale:',
    onlyInFallback: 'I only exist in the fallback locale!',
  },
  dotNotation: {
    title: 'Dot-Notation Keys',
    description: 'Access nested translation keys with dot notation.',
    deep: {
      nested: {
        key: 'I am deeply nested!',
      },
    },
  },
};
