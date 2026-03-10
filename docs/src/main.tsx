import { createApp } from 'liteforge';
import { createBrowserHistory, createRouter } from 'liteforge/router';
import { modalPlugin } from 'liteforge/modal';
import { toastPlugin } from 'liteforge/toast';
import { i18nPlugin } from 'liteforge/i18n';
import { routes } from './router';
import { App } from './App';
import { initTheme } from './stores/theme';
import { i18n } from './i18n';
import './styles.css';

// Sync dark/light class on <html> before first render — no flash of wrong theme
initTheme();

const history = createBrowserHistory();
const router = createRouter({
  routes,
  history,
  titleTemplate: (title) => title ?? 'LiteForge Docs',
});

await createApp({ root: App, target: '#app', router })
  .use(i18nPlugin(i18n))
  .use(modalPlugin())
  .use(toastPlugin({ position: 'bottom-right' }))
  .mount();
